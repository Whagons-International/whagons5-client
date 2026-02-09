import { useState, useEffect, useMemo, useCallback, useRef, startTransition } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { AppDispatch, RootState } from '@/store/store';
import type { KanbanBoardProps } from './types/kanban.types';
import type { Task } from '@/store/types';
import KanbanColumn from './KanbanColumn';
import KanbanCardContent from './KanbanCardContent';
import TaskDialog from '../TaskDialog';
import { TaskEvents } from '@/store/eventEmiters/taskEvents';
import { getTasksFromIndexedDB } from '@/store/reducers/tasksSlice';
import { useSpotVisibility } from '@/hooks/useSpotVisibility';
import { api } from '@/store/api/internalApi';
import { TasksCache } from '@/store/indexedDB/TasksCache';
import toast from 'react-hot-toast';
import { Logger } from '@/utils/logger';

// Stable selectors
const selectTasks = (state: RootState) => (state.tasks as any)?.value ?? [];
const selectStatuses = (state: RootState) => (state.statuses as any)?.value ?? [];
const selectPriorities = (state: RootState) => (state.priorities as any)?.value ?? [];
const selectUsers = (state: RootState) => (state.users as any)?.value ?? [];
const selectTasksLoading = (state: RootState) => (state.tasks as any)?.loading ?? false;

export default function KanbanBoard({ workspaceId }: KanbanBoardProps) {
  const dispatch = useDispatch<AppDispatch>();
  
  const tasks = useSelector(selectTasks);
  const statuses = useSelector(selectStatuses);
  const priorities = useSelector(selectPriorities);
  const users = useSelector(selectUsers);
  const loading = useSelector(selectTasksLoading);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  
  // Local optimistic state for task positions - avoids Redux re-renders during drag
  const [localTaskOverrides, setLocalTaskOverrides] = useState<Record<number, number>>({});
  const pendingMoveRef = useRef<number | null>(null);
  
  // For animating failed drops back - stores the card rect positions
  const [returnAnimation, setReturnAnimation] = useState<{
    task: Task;
    currentRect: { left: number; top: number; width: number; height: number };
    targetRect: { left: number; top: number; width: number; height: number };
    animating: boolean;
  } | null>(null);
  const columnRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Pointer sensor with distance constraint
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const { isTaskVisible } = useSpotVisibility();

  // Filter tasks for this workspace
  const workspaceTasks = useMemo(() => {
    let filtered = tasks;
    if (workspaceId) {
      filtered = filtered.filter((task: Task) => task.workspace_id === parseInt(workspaceId));
    }
    return filtered.filter(isTaskVisible);
  }, [tasks, workspaceId, isTaskVisible]);

  // Group by status - apply local overrides for optimistic updates
  const tasksByStatus = useMemo(() => {
    const grouped: Record<number, Task[]> = {};
    statuses.forEach((s: any) => { grouped[s.id] = []; });
    workspaceTasks.forEach((task: Task) => {
      // Use local override if exists, otherwise use actual status
      const effectiveStatusId = localTaskOverrides[task.id] ?? task.status_id;
      if (grouped[effectiveStatusId]) {
        grouped[effectiveStatusId].push(task);
      }
    });
    return grouped;
  }, [workspaceTasks, statuses, localTaskOverrides]);

  // Sort statuses
  const sortedStatuses = useMemo(() => {
    return [...statuses].sort((a: any, b: any) => {
      if (a.initial && !b.initial) return -1;
      if (!a.initial && b.initial) return 1;
      const order: Record<string, number> = { 'NONE': 1, 'WORKING': 2, 'PAUSED': 3, 'FINISHED': 4 };
      return (order[a.action] || 0) - (order[b.action] || 0);
    });
  }, [statuses]);

  // Listen for task changes - but skip if we have a pending move to avoid flicker
  // Use startTransition to mark these as non-urgent updates
  useEffect(() => {
    const refresh = () => {
      if (pendingMoveRef.current) return; // Skip refresh during pending move
      startTransition(() => {
        dispatch(getTasksFromIndexedDB());
      });
    };
    const unsubs = [
      TaskEvents.on(TaskEvents.EVENTS.TASK_CREATED, refresh),
      TaskEvents.on(TaskEvents.EVENTS.TASK_UPDATED, refresh),
      TaskEvents.on(TaskEvents.EVENTS.TASK_DELETED, refresh),
    ];
    return () => unsubs.forEach(u => u());
  }, [dispatch]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = Number(event.active.id);
    setActiveTask(workspaceTasks.find((t: Task) => t.id === taskId) || null);
  }, [workspaceTasks]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = Number(active.id);
    const newStatusId = Number(over.id);
    const task = workspaceTasks.find((t: Task) => t.id === taskId);
    
    if (!task || task.status_id === newStatusId) return;

    // Optimistic update - just update local state, no Redux
    pendingMoveRef.current = taskId;
    setLocalTaskOverrides(prev => ({ ...prev, [taskId]: newStatusId }));

    try {
      // Call API directly
      await api.patch(`/tasks/${taskId}`, { status_id: newStatusId });
      
      // Update cache silently
      const cachedTask = await TasksCache.getTask(taskId.toString());
      if (cachedTask) {
        await TasksCache.updateTask(taskId.toString(), { ...cachedTask, status_id: newStatusId });
      }
      
      // Clear override - the next Redux sync will have the correct data
      setLocalTaskOverrides(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      
    } catch (error: any) {
      Logger.error('ui', 'Failed to move task:', error);
      
      // Get column positions for animation
      const fromColumn = columnRefs.current.get(newStatusId);
      const toColumn = columnRefs.current.get(task.status_id);
      
      if (fromColumn && toColumn) {
        const fromRect = fromColumn.getBoundingClientRect();
        const toRect = toColumn.getBoundingClientRect();
        
        // Start at current position
        setReturnAnimation({
          task,
          currentRect: { left: fromRect.left + 12, top: fromRect.top + 80, width: 288, height: 100 },
          targetRect: { left: toRect.left + 12, top: toRect.top + 80, width: 288, height: 100 },
          animating: false,
        });
        
        // Trigger animation on next frame
        requestAnimationFrame(() => {
          setReturnAnimation(prev => prev ? { ...prev, animating: true } : null);
        });
        
        // After animation, revert and clear
        setTimeout(() => {
          setLocalTaskOverrides(prev => {
            const next = { ...prev };
            delete next[taskId];
            return next;
          });
          setReturnAnimation(null);
        }, 220);
      } else {
        // No animation, just revert
        setLocalTaskOverrides(prev => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      }
      
      if (error.response?.status !== 403) {
        toast.error('Failed to move task');
      }
    } finally {
      pendingMoveRef.current = null;
    }
  }, [workspaceTasks]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setIsTaskDialogOpen(open);
    if (!open) setSelectedTask(null);
  }, []);

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
    <div className="absolute inset-0 flex flex-col bg-gradient-to-br from-background via-muted/5 to-background overflow-hidden">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-5 overflow-x-auto overflow-y-hidden flex-1 px-6 py-6">
          {sortedStatuses.map((status: any) => (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={tasksByStatus[status.id] || []}
              onTaskClick={handleTaskClick}
              hiddenTaskId={returnAnimation?.task.id}
              columnRef={(el) => {
                if (el) columnRefs.current.set(status.id, el);
                else columnRefs.current.delete(status.id);
              }}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="rotate-2 scale-105 w-72">
              <div className="group relative bg-card rounded-lg border border-border/40 shadow-2xl ring-2 ring-primary/20 overflow-hidden">
                <KanbanCardContent 
                  task={activeTask} 
                  priority={activeTask.priority_id ? priorities.find((p: any) => p.id === activeTask.priority_id) : null}
                  assignedUsers={activeTask.user_ids?.length ? users.filter((u: any) => activeTask.user_ids?.includes(u.id)).slice(0, 3) : []}
                />
              </div>
            </div>
          )}
        </DragOverlay>
        
        {/* Return animation overlay */}
        {returnAnimation && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: returnAnimation.animating ? returnAnimation.targetRect.left : returnAnimation.currentRect.left,
              top: returnAnimation.animating ? returnAnimation.targetRect.top : returnAnimation.currentRect.top,
              width: returnAnimation.currentRect.width,
              transition: returnAnimation.animating ? 'left 180ms ease-out, top 180ms ease-out' : 'none',
            }}
          >
            <div className="group relative bg-card rounded-lg border border-destructive/50 shadow-2xl overflow-hidden">
              <KanbanCardContent 
                task={returnAnimation.task} 
                priority={returnAnimation.task.priority_id ? priorities.find((p: any) => p.id === returnAnimation.task.priority_id) : null}
                assignedUsers={returnAnimation.task.user_ids?.length ? users.filter((u: any) => returnAnimation.task.user_ids?.includes(u.id)).slice(0, 3) : []}
              />
            </div>
          </div>
        )}
      </DndContext>

      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={handleDialogClose}
        mode="edit"
        workspaceId={workspaceId ? parseInt(workspaceId) : undefined}
        task={selectedTask}
      />
    </div>
  );
}
