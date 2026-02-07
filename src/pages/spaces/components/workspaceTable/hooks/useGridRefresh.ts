/**
 * Hook for grid refresh logic
 */

import { useCallback } from 'react';
import { TasksCache } from '@/store/indexedDB/TasksCache';
import { refreshClientSideGrid } from '../grid/dataSource';

import { Logger } from '@/utils/logger';
export function useGridRefresh(opts: {
  modulesLoaded: boolean;
  gridRef: React.RefObject<any>;
  useClientSide: boolean;
  rowCache: React.MutableRefObject<Map<string, { rows: any[]; rowCount: number }>>;
  searchRef: React.MutableRefObject<string>;
  workspaceRef: React.MutableRefObject<string>;
  statusMapRef: React.MutableRefObject<any>;
  priorityMapRef: React.MutableRefObject<any>;
  spotMapRef: React.MutableRefObject<any>;
  userMapRef: React.MutableRefObject<any>;
  tagMapRef: React.MutableRefObject<any>;
  taskTagsRef: React.MutableRefObject<any>;
  suppressPersistRef: React.MutableRefObject<boolean>;
  debugFilters: React.MutableRefObject<boolean>;
  setClientRows: (rows: any[]) => void;
  spotVisibilityFilterRef?: React.MutableRefObject<(task: any) => boolean>;
}) {
  const {
    modulesLoaded,
    gridRef,
    useClientSide,
    rowCache,
    searchRef,
    workspaceRef,
    statusMapRef,
    priorityMapRef,
    spotMapRef,
    userMapRef,
    tagMapRef,
    taskTagsRef,
    suppressPersistRef,
    debugFilters,
    setClientRows,
    spotVisibilityFilterRef,
  } = opts;

  const refreshGrid = useCallback(async () => {
    const api = gridRef.current?.api;
    if (!modulesLoaded || !api || api.isDestroyed?.()) return;

    if (suppressPersistRef.current) {
      return;
    }

    // Check actual row model type at runtime to avoid calling wrong API methods
    const isInfiniteModel = api.getGridOption?.('rowModelType') === 'infinite';

    suppressPersistRef.current = true;

    if (!isInfiniteModel) {
      // Client-side row model
      try {
        if (!TasksCache.initialized) await TasksCache.init();
        const sortModel = api.getSortModel?.() || [{ colId: 'id', sort: 'desc' }];
        const { rows, totalFiltered } = await refreshClientSideGrid(api, TasksCache, {
          search: searchRef.current,
          workspaceRef,
          statusMapRef,
          priorityMapRef,
          spotMapRef,
          userMapRef,
          tagMapRef,
          taskTagsRef,
          sortModel,
          spotVisibilityFilterRef,
        });

        setClientRows(rows);
        api.refreshClientSideRowModel?.('everything');
      } catch (e) {
        Logger.warn('workspaces', 'refreshGrid (client-side) failed', e);
      }
    } else {
      // Infinite row model
      rowCache.current.clear();
      // Use purgeInfiniteCache() instead of refreshInfiniteCache() to completely
      // clear all cached blocks and force a full reload. This prevents visual
      // artifacts like duplicate/overlapping rows when tasks are created or deleted,
      // as refreshInfiniteCache() can leave stale row nodes in the DOM during refresh.
      api.purgeInfiniteCache?.() ?? api.refreshInfiniteCache?.();
    }

    setTimeout(() => {
      suppressPersistRef.current = false;
    }, 0);
  }, [modulesLoaded, rowCache, useClientSide, searchRef, workspaceRef, statusMapRef, priorityMapRef, spotMapRef, userMapRef, tagMapRef, taskTagsRef, suppressPersistRef, debugFilters, setClientRows, gridRef]);

  return refreshGrid;
}
