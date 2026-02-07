import { KanbanBoard } from './kanban';

export default function TaskBoardTab({ workspaceId }: { workspaceId: string | undefined }) {
  return (
    <div className="relative h-full w-full">
      <KanbanBoard workspaceId={workspaceId} />
    </div>
  );
}


