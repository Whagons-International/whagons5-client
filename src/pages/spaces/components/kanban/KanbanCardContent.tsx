import { memo } from 'react';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@/store/types';

interface KanbanCardContentProps {
  task: Task;
  priority: any;
  assignedUsers: any[];
}

// Pure presentational component - no hooks, no subscriptions
const KanbanCardContent = memo(function KanbanCardContent({ 
  task, 
  priority,
  assignedUsers,
}: KanbanCardContentProps) {
  return (
    <>
      {/* Priority indicator bar */}
      {priority && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: priority.color || '#888' }}
        />
      )}

      <div className="p-4 pl-5">
        <h4 className="text-sm font-semibold mb-3 line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {task.name}
        </h4>

        {priority && (
          <div className="mb-3">
            <Badge
              variant="outline"
              className="text-xs font-medium px-2 py-0.5"
              style={{ color: priority.color, borderColor: priority.color }}
            >
              {priority.name}
            </Badge>
          </div>
        )}

        <div className="flex items-center justify-end pt-2">
          {assignedUsers.length > 0 ? (
            <div className="flex items-center -space-x-2">
              {assignedUsers.map((user: any) => (
                <Avatar key={user.id} className="w-7 h-7 border-2 border-card ring-1 ring-background">
                  <AvatarFallback
                    className="text-xs font-semibold"
                    style={{ backgroundColor: user.color || '#888', color: '#fff' }}
                  >
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {(task.user_ids?.length || 0) > 3 && (
                <Avatar className="w-7 h-7 border-2 border-card ring-1 ring-background">
                  <AvatarFallback className="text-xs font-semibold bg-muted text-muted-foreground">
                    +{(task.user_ids?.length || 0) - 3}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground/50">
              <User className="w-3.5 h-3.5" />
              <span>Unassigned</span>
            </div>
          )}
        </div>
      </div>

      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
    </>
  );
});

export default KanbanCardContent;
