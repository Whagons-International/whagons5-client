import { useState, useMemo, memo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TaskGroup } from './hooks/useKanbanGrouping';
import type { Status } from '@/store/types';
import KanbanColumn from './KanbanColumn';

interface KanbanSwimLaneProps {
  group: TaskGroup;
  statuses: Status[];
  onTaskClick: (task: any) => void;
  isExpanded?: boolean;
}

const KanbanSwimLane = memo(function KanbanSwimLane({
  group,
  statuses,
  onTaskClick,
  isExpanded: initialExpanded = true,
}: KanbanSwimLaneProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  // Memoize tasks by status calculation
  const tasksByStatus = useMemo(() => {
    const result: Record<number, any[]> = {};
    statuses.forEach((status) => {
      result[status.id] = group.tasks.filter(task => task.status_id === status.id);
    });
    return result;
  }, [statuses, group.tasks]);

  return (
    <div className="bg-card/40 backdrop-blur-sm rounded-xl border border-border/40 shadow-md overflow-hidden">
      {/* Swim Lane Header */}
      <div
        className="sticky left-0 z-10 bg-gradient-to-r from-card to-card/80 backdrop-blur-md border-b border-border/40 px-5 py-4 flex items-center gap-4"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 w-8 p-0 hover:bg-muted/80 transition-colors"
        >
          <ChevronDown 
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} 
          />
        </Button>
        
        <div className="flex items-center gap-3 flex-1">
          {group.color && (
            <div
              className="w-3 h-3 rounded-full shadow-sm"
              style={{ 
                backgroundColor: group.color,
                boxShadow: `0 0 8px ${group.color}40`
              }}
            />
          )}
          <h3 className="font-bold text-base tracking-tight text-foreground">
            {group.name}
          </h3>
          
          <Badge 
            variant="secondary" 
            className="text-xs font-bold px-3 py-1 bg-muted/80"
            style={{
              color: group.color || '#888',
            }}
          >
            {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
          </Badge>
        </div>

        {/* Mini progress indicator */}
        {group.tasks.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-300 ease-out"
                style={{ 
                  backgroundColor: group.color || '#888',
                  width: `${Math.min((group.tasks.length / 20) * 100, 100)}%`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Swim Lane Content - CSS-only collapse */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex gap-5 p-5 overflow-x-auto min-h-[350px] bg-muted/20">
          {statuses.map((status: any) => (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={tasksByStatus[status.id] || []}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default KanbanSwimLane;
