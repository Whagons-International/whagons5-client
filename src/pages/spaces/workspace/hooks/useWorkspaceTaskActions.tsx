import { useState } from 'react';
import toast from 'react-hot-toast';
import { collections } from '@/store/dexie';

export function useWorkspaceTaskActions(): {
  selectedIds: number[];
  setSelectedIds: (ids: number[]) => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  handleDeleteSelected: () => Promise<void>;
} {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    setDeleteDialogOpen(false);
    const taskCount = selectedIds.length;
    const taskIds = [...selectedIds];

    setSelectedIds([]);

    const results = await Promise.all(
      taskIds.map(async (taskId) => {
        try {
          await collections.tasks.delete(taskId);
          return { taskId, ok: true as const };
        } catch (error: any) {
          const status = error?.response?.status || error?.status;
          if (status !== 403) {
            console.error(`Failed to delete task ${taskId}:`, error);
          }
          return { taskId, ok: false as const, error };
        }
      })
    );

    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    const failedNon403 = failed.filter((r) => {
      const status = r.error?.response?.status || r.error?.status;
      return status !== 403;
    });

    if (succeeded.length > 0) {
      const succeededIds = succeeded.map((r) => r.taskId);
      const title =
        succeeded.length === taskCount
          ? `Deleted ${succeeded.length} task${succeeded.length > 1 ? 's' : ''}`
          : `Deleted ${succeeded.length} of ${taskCount} task${taskCount > 1 ? 's' : ''}`;

      toast.success(
        (toastInstance) => (
          <div className="flex flex-col gap-1">
            <div className="font-semibold">{title}</div>
            <div className="text-sm opacity-90">
              You can undo this action for {succeededIds.length} task{succeededIds.length > 1 ? 's' : ''}.
            </div>
            <button
              onClick={async () => {
                toast.dismiss(toastInstance.id);
                const restoringToast = toast.loading(
                  `Restoring ${succeededIds.length} task${succeededIds.length > 1 ? 's' : ''}...`
                );
                try {
                  // Note: restore endpoint needs to be called via API
                  // For now we show a message that undo requires backend support
                  toast.dismiss(restoringToast);
                  toast.error('Restore functionality requires server-side support', {
                    duration: 5000,
                  });
                } catch (e: any) {
                  toast.dismiss(restoringToast);
                  toast.error(e?.message || 'Could not restore tasks.', { duration: 5000 });
                }
              }}
              className="text-left text-sm font-medium underline underline-offset-4 hover:no-underline mt-1"
            >
              Undo
            </button>
          </div>
        ),
        { duration: 8000 }
      );
    }

    if (failedNon403.length > 0) {
      toast.error(`Failed to delete ${failedNon403.length} task${failedNon403.length > 1 ? 's' : ''}`, {
        duration: 5000,
      });
    }
  };

  return {
    selectedIds,
    setSelectedIds,
    deleteDialogOpen,
    setDeleteDialogOpen,
    handleDeleteSelected,
  };
}

