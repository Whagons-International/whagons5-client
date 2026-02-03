import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { TaskEvents } from '@/store/eventEmiters/taskEvents';
import { Task } from '@/store/types';
import toast from 'react-hot-toast';

/**
 * Hook to detect when tasks are finished and show toast notifications
 * Listens to TASK_UPDATED events and checks if status changed to FINISHED/DONE
 */
export function useTaskCompletionToast() {
  const statuses = useSelector((s: RootState) => (s as any).statuses.value as any[]);
  const users = useSelector((s: RootState) => (s as any).users.value as any[]);
  const spots = useSelector((s: RootState) => (s as any).spots.value as any[]);
  const tasks = useSelector((s: RootState) => (s as any).tasks.value as Task[]);
  const currentUser = useSelector((s: RootState) => (s as any).auth?.user);
  const currentUserId = Number((currentUser as any)?.id);

  // Track previous task states to detect status changes
  const previousTasksRef = useRef<Map<number, { status_id: number }>>(new Map());
  // Track if we've initialized the previous states from Redux
  const initializedRef = useRef(false);
  // Track recently shown toasts to avoid duplicates
  const recentToastsRef = useRef<Set<number>>(new Set());

  // Initialize previous task states from Redux when tasks are loaded
  useEffect(() => {
    if (!initializedRef.current && tasks && tasks.length > 0) {
      tasks.forEach((task: Task) => {
        if (task.id && task.status_id) {
          previousTasksRef.current.set(task.id, {
            status_id: Number(task.status_id),
          });
        }
      });
      initializedRef.current = true;
    }
  }, [tasks]);

  useEffect(() => {
    // Find the finished/done status IDs
    const finishedStatusIds = new Set<number>();
    (statuses || []).forEach((status: any) => {
      const action = String(status.action || '').toUpperCase();
      const nameLower = String(status.name || '').toLowerCase();
      const isFinishedStatus = 
        action === 'FINISHED' || 
        action === 'DONE' || 
        nameLower.includes('done') || 
        nameLower.includes('complete') || 
        nameLower.includes('finished');
      
      if (isFinishedStatus && status.id) {
        finishedStatusIds.add(Number(status.id));
      }
    });

    // Listen for task updates
    const unsubscribe = TaskEvents.on(TaskEvents.EVENTS.TASK_UPDATED, (task: Task) => {
      if (!task || !task.id) return;

      const currentStatusId = Number(task.status_id);
      
      // Get previous status from ref or Redux state
      let previousStatusId: number | null = null;
      const previousTaskFromRef = previousTasksRef.current.get(task.id);
      if (previousTaskFromRef) {
        previousStatusId = previousTaskFromRef.status_id;
      } else {
        // Fallback: check Redux state for previous status
        const previousTaskFromRedux = tasks.find((t: Task) => t.id === task.id);
        if (previousTaskFromRedux) {
          previousStatusId = Number(previousTaskFromRedux.status_id);
        }
      }

      // Check if task just became finished (transitioned from non-finished to finished)
      const wasFinishedBefore = previousStatusId !== null ? finishedStatusIds.has(previousStatusId) : false;
      const isFinishedNow = finishedStatusIds.has(currentStatusId);

      if (
        previousStatusId !== null &&
        previousStatusId !== currentStatusId &&
        !wasFinishedBefore &&
        isFinishedNow &&
        !recentToastsRef.current.has(task.id) // Avoid duplicate toasts
      ) {
        // Get user name who finished the task
        // Try to get from task's user_ids (responsible users) first
        let userName = 'Someone';
        if (task.user_ids && task.user_ids.length > 0) {
          const responsibleUser = users.find((u: any) => 
            task.user_ids?.includes(Number(u.id))
          );
          if (responsibleUser?.name) {
            userName = responsibleUser.name;
          }
        }
        
        // If no responsible user found, try to use current user if they're the one who updated
        // (This is a best guess for local updates)
        if (userName === 'Someone' && currentUserId) {
          const currentUserData = users.find((u: any) => Number(u.id) === currentUserId);
          if (currentUserData?.name) {
            userName = currentUserData.name;
          }
        }

        // Get location (spot) name if task has one
        let locationText = '';
        if (task.spot_id) {
          const spot = spots.find((s: any) => Number(s.id) === Number(task.spot_id));
          if (spot?.name) {
            locationText = ` at ${spot.name}`;
          }
        }

        // Show simple toast notification
        toast.success(`${userName} finished task "${task.name}"${locationText}`, {
          duration: 5000,
          position: 'bottom-right',
        });

        // Mark this task as recently toasted (prevent duplicates for 10 seconds)
        recentToastsRef.current.add(task.id);
        setTimeout(() => {
          recentToastsRef.current.delete(task.id);
        }, 10000);
      }

      // Update previous task state
      previousTasksRef.current.set(task.id, {
        status_id: currentStatusId,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [statuses, users, spots, currentUserId, tasks]);
}
