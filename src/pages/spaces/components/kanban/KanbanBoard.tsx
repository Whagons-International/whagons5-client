import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { KanbanBoardProps, KanbanFilters } from './types/kanban.types';
import type { Task } from '@/store/types';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import KanbanControls from './KanbanControls';
import KanbanSwimLane from './KanbanSwimLane';
import TaskDialog from '../TaskDialog';
import { collections, useLiveQuery } from '@/store/dexie';
import { useKanbanFilters } from './hooks/useKanbanFilters';
import { useKanbanGrouping } from './hooks/useKanbanGrouping';
import { exportToExcel } from './utils/exportUtils';
import toast from 'react-hot-toast';

export default function KanbanBoard({ workspaceId }: KanbanBoardProps) {
  // Get data from Dexie using useLiveQuery
  const allTasks = useLiveQuery(() => collections.tasks.getAll()) ?? [];
  const statuses = useLiveQuery(() => collections.statuses.getAll()) ?? [];
  const categories = useLiveQuery(() => collections.categories.getAll()) ?? [];
  const priorities = useLiveQuery(() => collections.priorities.getAll()) ?? [];
  const teams = useLiveQuery(() => collections.teams.getAll()) ?? [];
  const users = useLiveQuery(() => collections.users.getAll()) ?? [];
  
  // Filter tasks by workspace
  const tasks = useMemo(() => {
    if (!workspaceId) return allTasks;
    return allTasks.filter((task: Task) => task.workspace_id === parseInt(workspaceId));
  }, [allTasks, workspaceId]);
  
  const loading = tasks === undefined;

  // Preferences key
  const KANBAN_PREFS_KEY = `wh_kanban_prefs_${workspaceId || 'all'}`;

  // Load preferences from localStorage
  const loadPreferences = () => {
    try {
      const saved = localStorage.getItem(KANBAN_PREFS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('[Kanban] Error loading preferences:', error);
    }
    return {
      viewMode: 'compact',
      filters: { categories: [], statuses: [], priorities: [], teams: [], search: '' },
      groupBy: 'none',
    };
  };

  // Local state
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [taskDialogMode, setTaskDialogMode] = useState<'create' | 'edit'>('edit');
  const [preferences, setPreferences] = useState(loadPreferences);
  const [filters, setFilters] = useState<KanbanFilters>(preferences.filters);
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>(preferences.viewMode);
  const [groupBy, setGroupBy] = useState<'none' | 'priority' | 'team' | 'assignee'>(preferences.groupBy);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  // Save preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(KANBAN_PREFS_KEY, JSON.stringify({
        viewMode,
        filters,
        groupBy,
      }));
    } catch (error) {
      console.error('[Kanban] Error saving preferences:', error);
    }
  }, [viewMode, filters, groupBy, KANBAN_PREFS_KEY]);


  // Apply filters using the hook
  const filteredTasks = useKanbanFilters(tasks, filters);

  // Group tasks by selected grouping (for swim lanes)
  const taskGroups = useKanbanGrouping(filteredTasks, groupBy, priorities, teams, users);

  // Group filtered tasks by status (for regular columns)
  const tasksByStatus = useMemo(() => {
    const grouped: Record<number, Task[]> = {};
    
    // Initialize all status groups
    statuses.forEach((status: any) => {
      grouped[status.id] = [];
    });

    // Group filtered tasks
    filteredTasks.forEach((task: Task) => {
      if (grouped[task.status_id]) {
        grouped[task.status_id].push(task);
      }
    });

    return grouped;
  }, [filteredTasks, statuses]);

  // Sort statuses by a logical order (initial -> working -> paused -> finished)
  const sortedStatuses = useMemo(() => {
    return [...statuses].sort((a: any, b: any) => {
      // Initial statuses first
      if (a.initial && !b.initial) return -1;
      if (!a.initial && b.initial) return 1;
      
      // Then by action type
      const actionOrder: Record<string, number> = {
        'NONE': 1,
        'WORKING': 2,
        'PAUSED': 3,
        'FINISHED': 4,
      };
      
      const orderA = actionOrder[a.action] || 0;
      const orderB = actionOrder[b.action] || 0;
      
      return orderA - orderB;
    });
  }, [statuses]);

  // No need to listen for events - useLiveQuery automatically updates when data changes

  // Drag start handler
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = Number(event.active.id);
    const task = tasks.find((t: Task) => t.id === taskId);
    setActiveTask(task || null);
  }, [tasks]);

  // Drag end handler with optimistic updates via Redux thunk
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);

    if (!over || active.id === over.id) return;

    const taskId = Number(active.id);
    const newStatusId = Number(over.id);

    // Get current task from Dexie
    const task = await collections.tasks.get(taskId);
    if (!task) {
      toast.error('Task not found');
      return;
    }

    const previousStatusId = task.status_id;

    // Don't update if status hasn't changed
    if (previousStatusId === newStatusId) return;

    // Update task status directly via Dexie collection
    try {
      await collections.tasks.update(taskId, { status_id: newStatusId });
      toast.success('Task moved successfully');
    } catch (error) {
      // Rollback on error
      await collections.tasks.update(taskId, { status_id: previousStatusId });
      console.error('Failed to move task:', error);
      toast.error('Failed to move task');
    }
  }, []);

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setTaskDialogMode('edit');
    setIsTaskDialogOpen(true);
  }, []);

  // Handle dialog close
  const handleDialogClose = useCallback((open: boolean) => {
    setIsTaskDialogOpen(open);
    if (!open) {
      setSelectedTask(null);
      // No need to refresh - useLiveQuery automatically updates
    }
  }, []);

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      const filename = `kanban-board-${new Date().toISOString().split('T')[0]}.xlsx`;
      await exportToExcel(filteredTasks, statuses, filename);
      toast.success('Board exported successfully');
    } catch (error) {
      console.error('Failed to export board:', error);
      toast.error('Failed to export board');
    }
  }, [filteredTasks, statuses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  if (sortedStatuses.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">
          No statuses configured. Please configure statuses in settings.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-muted/5 to-background">
      {/* Controls - Modern floating style */}
      <div className="px-6 pt-6 pb-4">
        <div className="bg-card/80 backdrop-blur-md rounded-xl border border-border/40 shadow-lg p-4">
          <KanbanControls
            filters={filters}
            onFilterChange={setFilters}
            availableCategories={categories}
            availableStatuses={statuses}
            availablePriorities={priorities}
            availableTeams={teams}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            onExport={handleExport}
          />
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Render swim lanes if grouping is enabled */}
        {groupBy !== 'none' ? (
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-4">
              {taskGroups.map((group) => (
                <KanbanSwimLane
                  key={group.id}
                  group={group}
                  statuses={sortedStatuses}
                  onTaskClick={handleTaskClick}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Regular column view - Modern spacing */
          <div className="flex gap-5 overflow-x-auto flex-1 px-6 pb-6">
            {sortedStatuses.map((status: any) => (
              <KanbanColumn
                key={status.id}
                status={status}
                tasks={tasksByStatus[status.id] || []}
                onTaskClick={handleTaskClick}
              />
            ))}
          </div>
        )}

        {/* Drag overlay with modern shadow effect */}
        <DragOverlay>
          {activeTask && (
            <div className="rotate-2 scale-105 opacity-90">
              <div className="shadow-2xl ring-2 ring-primary/20 rounded-lg">
                <KanbanCard task={activeTask} onClick={() => {}} />
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Task Dialog */}
      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={handleDialogClose}
        mode={taskDialogMode}
        workspaceId={workspaceId ? parseInt(workspaceId) : undefined}
        task={selectedTask}
      />
    </div>
  );
}
