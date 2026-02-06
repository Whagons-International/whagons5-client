import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collections } from '@/store/dexie';

export function useWorkspaceTaskDialog() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const taskIdFromUrl = searchParams.get('taskId');
  
  const [openCreateTask, setOpenCreateTask] = useState(false);
  const [openEditTask, setOpenEditTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Handle opening task from URL parameter (from notifications)
  useEffect(() => {
    if (!taskIdFromUrl) return;

    (async () => {
      try {
        const taskId = Number(taskIdFromUrl);
        if (!Number.isFinite(taskId)) return;

        const task = await collections.tasks.get(taskId);
        if (task) {
          setSelectedTask(task);
          setOpenEditTask(true);

          const newSearchParams = new URLSearchParams(location.search);
          newSearchParams.delete('taskId');
          const newSearch = newSearchParams.toString();
          const newUrl = location.pathname + (newSearch ? `?${newSearch}` : '');
          navigate(newUrl, { replace: true });
        }
      } catch (error) {
        console.error('Failed to open task from URL:', error);
      }
    })();
  }, [taskIdFromUrl, location.pathname, location.search, navigate]);

  const handleOpenTaskDialog = async (task: any) => {
    // Fetch full task data from Dexie to ensure all fields are available
    // AG Grid row data might be incomplete (missing some fields)
    if (task?.id) {
      try {
        const fullTask = await collections.tasks.get(task.id);
        if (fullTask) {
          setSelectedTask(fullTask);
        } else {
          // Fallback to provided task if not found in Dexie
          console.warn('[useWorkspaceTaskDialog] Task not found in Dexie, using provided task data:', task.id);
          setSelectedTask(task);
        }
      } catch (error) {
        console.error('[useWorkspaceTaskDialog] Failed to fetch task from Dexie:', error);
        // Fallback to provided task on error
        setSelectedTask(task);
      }
    } else {
      // No task ID, use provided task as-is (shouldn't happen for edit mode)
      setSelectedTask(task);
    }
    (window as any).__taskDialogClickTime = performance.now();
    setOpenEditTask(true);
  };

  return {
    openCreateTask,
    setOpenCreateTask,
    openEditTask,
    setOpenEditTask,
    selectedTask,
    setSelectedTask,
    handleOpenTaskDialog,
  };
}
