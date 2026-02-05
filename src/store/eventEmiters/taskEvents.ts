import { GenericEvents } from '../genericSliceFactory';

/**
 * Task-specific event system for updating UI components when tasks change.
 * This is a thin wrapper around GenericEvents for backward compatibility.
 */
export class TaskEvents {
  // Delegate to GenericEvents
  static on = GenericEvents.on.bind(GenericEvents);
  static emit = GenericEvents.emit.bind(GenericEvents);

  // Pre-defined event types for tasks
  static readonly EVENTS = {
    TASK_CREATED: 'task:created',
    TASK_UPDATED: 'task:updated', 
    TASK_DELETED: 'task:deleted',
    TASKS_BULK_UPDATE: 'tasks:bulk_update',
    CACHE_INVALIDATE: 'cache:invalidate'
  } as const;
}
