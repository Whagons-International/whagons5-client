// Datasource and refresh helpers for WorkspaceTable

import type React from 'react';

import { Logger } from '@/utils/logger';
const DEFAULT_SORT = [{ colId: 'id', sort: 'desc' }];
const getSort = (s?: any[]) => Array.isArray(s) && s.length > 0 ? s : DEFAULT_SORT;
const buildParams = (wr: React.MutableRefObject<string>, sm: any, pm: any, spm: any, um: any, tm: any, tt: any) => {
  const p: any = { __statusMap: sm.current, __priorityMap: pm.current, __spotMap: spm.current, __userMap: um.current, __tagMap: tm.current, __taskTags: tt.current };
  if (wr.current === 'shared') p.shared_with_me = true;
  else if (wr.current !== 'all') p.workspace_id = wr.current;
  return p;
};

export function buildGetRows(TasksCache: any, refs: any) {
  const { rowCache, workspaceRef, searchRef, statusMapRef, priorityMapRef, spotMapRef, userMapRef, tagMapRef, taskTagsRef, externalFilterModelRef, normalizeFilterModelForQuery, setEmptyOverlayVisible, spotVisibilityFilterRef } = refs;
  return async (params: any) => {
    const sortModel = getSort(params.sortModel);
    const cacheKey = `${workspaceRef.current}-${params.startRow}-${params.endRow}-${JSON.stringify(params.filterModel || {})}-${JSON.stringify(sortModel)}-${searchRef.current}`;
    if (rowCache.current.has(cacheKey)) {
      const cachedData = rowCache.current.get(cacheKey)!;
      try { setEmptyOverlayVisible?.(cachedData.rowCount === 0); } catch {}
      params.successCallback(cachedData.rows, cachedData.rowCount);
      return;
    }
    try {
      if (!TasksCache.initialized) {
        await TasksCache.init();
      }
      const normalized: any = { ...params };

      const gridFm = params?.filterModel || {};
      const cleanedGridFm: any = {};
      for (const [key, value] of Object.entries(gridFm)) {
        // For set filters, empty values array means "show all" - ignore it
        if (value && typeof value === 'object' && (value as any).filterType === 'set') {
          const values = (value as any).values || [];
          if (values.length > 0) {
            cleanedGridFm[key] = value;
          }
        } else {
          // For other filter types, include them
          cleanedGridFm[key] = value;
        }
      }

      const externalFm = (externalFilterModelRef?.current as any) || {};
      const hasExternal = externalFm && Object.keys(externalFm).length > 0;
      const hasGrid = Object.keys(cleanedGridFm).length > 0;

      // Prefer the grid's current model when present; fall back to the last
      // external model (e.g. from presets) when gridFm is empty.
      let mergedFm: any = {};
      if (hasGrid) {
        mergedFm = cleanedGridFm;
      } else if (hasExternal) {
        mergedFm = externalFm;
      }

      normalized.filterModel = Object.keys(mergedFm).length > 0 ? normalizeFilterModelForQuery(mergedFm) : undefined;
      try {
        if (localStorage.getItem('wh-debug-filters') === 'true') {
          Logger.info('workspaces', '[WT getRows] merged filter=', JSON.stringify(mergedFm, null, 2));
          Logger.info('workspaces', '[WT getRows] normalized filterModel=', JSON.stringify(normalized.filterModel, null, 2));
          Logger.info('workspaces', '[WT getRows] search=', searchRef.current, 'ws=', workspaceRef.current);
        }
      } catch {}
      const queryParams: any = {
        ...normalized,
        search: searchRef.current,
        sortModel,
        ...buildParams(workspaceRef, statusMapRef, priorityMapRef, spotMapRef, userMapRef, tagMapRef, taskTagsRef),
      };

      const result = await TasksCache.queryTasks(queryParams);
      let rows = result?.rows || [];
      // Apply spot-based visibility filter (belt-and-suspenders with backend filtering)
      if (spotVisibilityFilterRef?.current) {
        rows = rows.filter(spotVisibilityFilterRef.current);
      }
      // Use the total row count from the query result, not the filtered page length
      const total = result?.rowCount || 0;
      try { if (localStorage.getItem('wh-debug-filters') === 'true') Logger.info('workspaces', '[WT getRows] result rows=', rows.length, 'total=', total); } catch {}
      rowCache.current.set(cacheKey, { rows, rowCount: total });
      try { setEmptyOverlayVisible?.(total === 0); } catch {}
      params.successCallback(rows, total);
    } catch (error) {
      Logger.error('workspaces', 'Error querying local tasks cache:', error);
      try { setEmptyOverlayVisible?.(false); } catch {}
      params.failCallback();
    }
  };
}

export async function refreshClientSideGrid(gridApi: any, TasksCache: any, params: any) {
  const { search, workspaceRef, statusMapRef, priorityMapRef, spotMapRef, userMapRef, tagMapRef, taskTagsRef, sortModel, spotVisibilityFilterRef } = params;
  const baseParams: any = { search, ...buildParams(workspaceRef, statusMapRef, priorityMapRef, spotMapRef, userMapRef, tagMapRef, taskTagsRef) };
  const effectiveSortModel = getSort(sortModel);

  const countResp = await TasksCache.queryTasks({ ...baseParams, sortModel: effectiveSortModel, startRow: 0, endRow: 0 });
  const totalFiltered = countResp?.rowCount ?? 0;
  const rowsResp = await TasksCache.queryTasks({ ...baseParams, sortModel: effectiveSortModel, startRow: 0, endRow: totalFiltered });
  let rows = rowsResp?.rows || [];
  // Apply spot-based visibility filter
  if (spotVisibilityFilterRef?.current) {
    rows = rows.filter(spotVisibilityFilterRef.current);
  }
  try {
    gridApi?.setGridOption?.('rowData', rows);
  } catch {
    // ignore
  }
  return { rows, totalFiltered };
}


