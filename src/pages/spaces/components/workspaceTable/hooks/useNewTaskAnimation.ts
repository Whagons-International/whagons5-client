// Hook to track newly created tasks for animation purposes
import { useCallback, useRef, useState } from 'react';

/**
 * Tracks newly created task IDs for animations
 * This allows us to apply CSS animations to rows when they're added
 * 
 * Usage: Call markAsNew(taskId) after creating a task via collections.tasks.add()
 */
export function useNewTaskAnimation() {
  const [newTaskIds, setNewTaskIds] = useState<Set<number>>(new Set());
  const timeoutRefs = useRef<Map<number, NodeJS.Timeout>>(new Map());
  // Use refs to track IDs for immediate access without stale closures
  const newTaskIdsRef = useRef<Set<number>>(new Set());

  const markAsNew = useCallback((taskId: number | string | undefined) => {
    if (!taskId) return;
    
    // Handle both number and string IDs
    const id = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
    
    if (typeof id !== 'number' || isNaN(id)) return;
    
    // Clear any existing timeout for this ID (in case it was already added)
    const existingTimeout = timeoutRefs.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Add the new task ID to both state and ref
    setNewTaskIds(prev => {
      const next = new Set(prev).add(id);
      newTaskIdsRef.current = next;
      return next;
    });

    // Remove it after animation completes (1.5 seconds to be safe)
    const timeout = setTimeout(() => {
      setNewTaskIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        newTaskIdsRef.current = next;
        return next;
      });
      timeoutRefs.current.delete(id);
    }, 1500);

    timeoutRefs.current.set(id, timeout);
  }, []);

  // Use useCallback to ensure stable reference, but check ref for latest values
  const isNewTask = useCallback((taskId: number | string | undefined) => {
    if (!taskId) return false;
    const id = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
    if (typeof id !== 'number' || isNaN(id)) return false;
    return newTaskIdsRef.current.has(id);
  }, []);

  return {
    isNewTask,
    markAsNew, // Call this after creating a task to trigger animation
    newTaskIds, // Expose state so components can react to changes
  };
}
