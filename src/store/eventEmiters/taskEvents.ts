/**
 * Simple event emitter for task-related events.
 * 
 * Note: With Dexie + useLiveQuery, most UI updates happen automatically.
 * This event system is kept for backward compatibility and for cases
 * where components need to react to specific events (e.g., refresh grids).
 */

type EventCallback = (data?: any) => void;
type Unsubscribe = () => void;

const listeners: Map<string, Set<EventCallback>> = new Map();

export class TaskEvents {
  /**
   * Subscribe to an event
   */
  static on(event: string, callback: EventCallback): Unsubscribe {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(callback);
    
    return () => {
      listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit an event to all listeners
   */
  static emit(event: string, data?: any): void {
    const callbacks = listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`[TaskEvents] Error in listener for ${event}:`, e);
        }
      });
    }
  }

  // Pre-defined event types for tasks
  static readonly EVENTS = {
    TASK_CREATED: 'task:created',
    TASK_UPDATED: 'task:updated', 
    TASK_DELETED: 'task:deleted',
    TASKS_BULK_UPDATE: 'tasks:bulk_update',
    CACHE_INVALIDATE: 'cache:invalidate'
  } as const;
}
