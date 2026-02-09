import { useDroppable } from '@dnd-kit/core';
import { memo, useMemo, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { RootState } from '@/store/store';
import type { KanbanColumnProps } from './types/kanban.types';
import DraggableCard from './DraggableCard';
import { Badge } from '@/components/ui/badge';

// Stable selectors - computed once per column, not per card
const selectPriorities = (state: RootState) => (state.priorities as any)?.value ?? [];
const selectUsers = (state: RootState) => (state.users as any)?.value ?? [];

// Estimated card height (padding + content)
const CARD_HEIGHT = 140;
const CARD_GAP = 12;

const KanbanColumn = memo(function KanbanColumn({ status, tasks, onTaskClick, hiddenTaskId, columnRef }: KanbanColumnProps & { hiddenTaskId?: number; columnRef?: (el: HTMLDivElement | null) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get data once at column level
  const priorities = useSelector(selectPriorities);
  const users = useSelector(selectUsers);

  // Pre-compute priority and users for all tasks in this column
  const tasksWithData = useMemo(() => {
    return tasks.map(task => ({
      task,
      priority: task.priority_id ? priorities.find((p: any) => p.id === task.priority_id) : null,
      assignedUsers: task.user_ids?.length 
        ? users.filter((u: any) => task.user_ids?.includes(u.id)).slice(0, 3) 
        : [],
    }));
  }, [tasks, priorities, users]);

  // Virtualizer for large lists
  const virtualizer = useVirtualizer({
    count: tasksWithData.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => CARD_HEIGHT + CARD_GAP,
    overscan: 5, // Render 5 extra items above/below viewport
  });

  const handleTaskClick = useCallback((task: any) => {
    onTaskClick(task);
  }, [onTaskClick]);

  const virtualItems = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  return (
    <div
      ref={columnRef}
      className={`flex flex-col w-80 min-w-80 max-w-80 bg-muted/30 backdrop-blur-sm rounded-xl border transition-all duration-200 overflow-hidden ${
        isOver 
          ? 'border-primary/50 shadow-xl bg-primary/5' 
          : 'border-border/40 shadow-md'
      }`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-border/40 bg-card/80 backdrop-blur-sm rounded-t-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full shadow-sm"
              style={{ 
                backgroundColor: status.color || '#888',
                boxShadow: `0 0 8px ${status.color}40`
              }}
            />
            <h3 className="font-bold text-sm tracking-tight text-foreground">
              {status.name}
            </h3>
          </div>
          <Badge 
            variant="secondary" 
            className="text-xs font-bold px-2.5 py-0.5 bg-muted/80"
            style={{ color: status.color || '#888' }}
          >
            {tasks.length}
          </Badge>
        </div>
        
        {/* Progress bar */}
        {tasks.length > 0 && (
          <div className="h-1 bg-muted rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full transition-[width] duration-300 ease-out"
              style={{ 
                backgroundColor: status.color || '#888',
                width: `${Math.min((tasks.length / 10) * 100, 100)}%`
              }}
            />
          </div>
        )}
      </div>

      {/* Column Content - Droppable area with virtualization */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
      >
        <div
          ref={setNodeRef}
          className={`relative min-h-[300px] rounded-lg transition-colors duration-200 ${
            isOver ? 'bg-primary/5' : ''
          }`}
          style={{ height: Math.max(totalHeight, 300) }}
        >
          {tasksWithData.length > 0 ? (
            virtualItems.map((virtualItem) => {
              const { task, priority, assignedUsers } = tasksWithData[virtualItem.index];
              return (
                <div
                  key={task.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${virtualItem.start}px)`,
                    paddingBottom: CARD_GAP,
                  }}
                >
                  <DraggableCard
                    task={task}
                    priority={priority}
                    assignedUsers={assignedUsers}
                    onClick={() => handleTaskClick(task)}
                    isHidden={hiddenTaskId === task.id}
                  />
                </div>
              );
            })
          ) : !isOver ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <div 
                className="w-12 h-12 rounded-full mb-3 flex items-center justify-center opacity-20"
                style={{ backgroundColor: status.color || '#888' }}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-xs text-muted-foreground font-medium">No tasks yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Drag tasks here</p>
            </div>
          ) : null}

          {/* Drop zone indicator */}
          {isOver && (
            <div
              className="absolute bottom-0 left-0 right-0 flex items-center justify-center h-20 border-2 border-dashed rounded-lg transition-opacity duration-200"
              style={{ borderColor: status.color || '#888' }}
            >
              <p className="text-sm font-medium" style={{ color: status.color || '#888' }}>
                Drop here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default KanbanColumn;
