// Event handling utilities for WorkspaceTable

import { TaskEvents } from '@/store/eventEmiters/taskEvents';

export interface EventHandlerRefs {
  refreshGrid: () => Promise<void>;
  workspaceId: string;
}

export const setupTaskEventHandlers = (refs: EventHandlerRefs) => {
  const { refreshGrid, workspaceId } = refs;

  // Debounce refresh calls to prevent rapid-fire refreshes
  // Also track if a refresh is in progress to prevent overlapping refreshes
  let refreshTimeout: NodeJS.Timeout | null = null;
  let refreshInProgress = false;
  let pendingRefresh = false;

  const executeRefresh = async () => {
    if (refreshInProgress) {
      // Mark that we need another refresh after the current one completes
      pendingRefresh = true;
      return;
    }

    refreshInProgress = true;
    try {
      await refreshGrid();
    } finally {
      refreshInProgress = false;
      // If there was a pending refresh request, execute it now
      if (pendingRefresh) {
        pendingRefresh = false;
        // Small delay to let the grid settle before next refresh
        setTimeout(executeRefresh, 50);
      }
    }
  };

  const debouncedRefresh = () => {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    refreshTimeout = setTimeout(() => {
      executeRefresh();
      refreshTimeout = null;
    }, 100); // 100ms debounce
  };

  const unsubscribeCreated = TaskEvents.on(TaskEvents.EVENTS.TASK_CREATED, () => {
    debouncedRefresh();
  });

  const unsubscribeUpdated = TaskEvents.on(TaskEvents.EVENTS.TASK_UPDATED, () => {
    debouncedRefresh();
  });

  const unsubscribeDeleted = TaskEvents.on(TaskEvents.EVENTS.TASK_DELETED, () => {
    debouncedRefresh();
  });

  const unsubscribeBulkUpdate = TaskEvents.on(TaskEvents.EVENTS.TASKS_BULK_UPDATE, (data) => {
    if (workspaceId === 'shared' || workspaceId === 'all') {
      debouncedRefresh();
      return;
    }
    const wsIdNum = Number(workspaceId);
    if (!Number.isFinite(wsIdNum)) {
      debouncedRefresh();
      return;
    }
    // If we received an array of tasks, refresh only if at least one matches the current workspace.
    if (Array.isArray(data)) {
      const hasRelevant = data.some((t: any) => Number(t?.workspace_id) === wsIdNum);
      if (hasRelevant) debouncedRefresh();
      return;
    }
    // If we received a single task-like object, refresh if it matches.
    if (data && typeof data === 'object' && 'workspace_id' in data) {
      if (Number((data as any).workspace_id) === wsIdNum) debouncedRefresh();
      return;
    }
    // Unknown payload: safest is to refresh.
    debouncedRefresh();
  });

  const unsubscribeInvalidate = TaskEvents.on(TaskEvents.EVENTS.CACHE_INVALIDATE, () => {
    debouncedRefresh();
  });

  // Return cleanup function
  return () => {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      refreshTimeout = null;
    }
    unsubscribeCreated();
    unsubscribeUpdated();
    unsubscribeDeleted();
    unsubscribeBulkUpdate();
    unsubscribeInvalidate();
  };
};
