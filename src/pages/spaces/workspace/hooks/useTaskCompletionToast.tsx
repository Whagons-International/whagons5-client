import { useEffect, useRef } from 'react';
import { Task } from '@/store/types';
import toast from 'react-hot-toast';
import { useTable, useLiveQuery, db } from '@/store/dexie';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Hook to detect when tasks are finished and show toast notifications
 * Listens to Dexie liveQuery changes and checks if status changed to FINISHED/DONE
 */
export function useTaskCompletionToast() {
  const statuses = useTable('statuses');
  const users = useTable('users');
  const spots = useTable('spots');
  const tasks = useTable<Task>('tasks');
  const { user: currentUser } = useAuth();
  const currentUserId = Number(currentUser?.id);

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

  // Build finished status IDs set
  const finishedStatusIds = useRef(new Set<number>());
  useEffect(() => {
    const ids = new Set<number>();
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
        ids.add(Number(status.id));
      }
    });
    finishedStatusIds.current = ids;
  }, [statuses]);

  // Watch for task changes via useLiveQuery - check for status transitions
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;
    
    // Check each task for status transitions
    tasks.forEach((task: Task) => {
      if (!task || !task.id) return;

      const currentStatusId = Number(task.status_id);
      const previousTaskFromRef = previousTasksRef.current.get(task.id);
      const previousStatusId = previousTaskFromRef?.status_id ?? null;

      // Check if task just became finished (transitioned from non-finished to finished)
      const wasFinishedBefore = previousStatusId !== null ? finishedStatusIds.current.has(previousStatusId) : false;
      const isFinishedNow = finishedStatusIds.current.has(currentStatusId);

      if (
        previousStatusId !== null &&
        previousStatusId !== currentStatusId &&
        !wasFinishedBefore &&
        isFinishedNow &&
        !recentToastsRef.current.has(task.id) // Avoid duplicate toasts
      ) {
        // Get user name who finished the task
        let userName = 'Someone';
        if (task.user_ids && task.user_ids.length > 0) {
          const responsibleUser = users.find((u: any) => 
            task.user_ids?.includes(Number(u.id))
          );
          if (responsibleUser?.name) {
            userName = responsibleUser.name;
          }
        }
        
        if (userName === 'Someone' && currentUserId) {
          const currentUserData = users.find((u: any) => Number(u.id) === currentUserId);
          if (currentUserData?.name) {
            userName = currentUserData.name;
          }
        }

        // Get location (spot) name
        let locationText = '';
        if (task.spot_id) {
          const spot = spots.find((s: any) => Number(s.id) === Number(task.spot_id));
          if (spot?.name) {
            locationText = ` at ${spot.name}`;
          }
        }

        // Show toast notification
        toast.success(`${userName} finished task "${task.name}"${locationText}`, {
          duration: 5000,
          position: 'bottom-right',
        });

        // Prevent duplicates
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
  }, [tasks, users, spots, currentUserId]);
}
