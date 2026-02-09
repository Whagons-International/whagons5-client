import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/store/types';
import KanbanCardContent from './KanbanCardContent';

interface DraggableCardProps {
  task: Task;
  priority: any;
  assignedUsers: any[];
  onClick: () => void;
  isHidden?: boolean;
}

const DraggableCard = memo(function DraggableCard({ 
  task, 
  priority,
  assignedUsers,
  onClick,
  isHidden = false,
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: (isDragging || isHidden) ? 0 : 1,
    visibility: (isDragging || isHidden) ? 'hidden' : 'visible',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className="group relative bg-card rounded-lg border border-border/40 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-lg hover:border-primary/30 transition-shadow duration-150 overflow-hidden"
    >
      <KanbanCardContent task={task} priority={priority} assignedUsers={assignedUsers} />
    </div>
  );
});

export default DraggableCard;
