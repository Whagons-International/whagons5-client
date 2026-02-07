// Redux state management and derived state utilities for WorkspaceTable

import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import type { User } from '@/store/types';
import { TasksCache } from '@/store/indexedDB/TasksCache';
import { GRID_CONSTANTS } from './gridConfig';
import { refreshClientSideGrid } from './dataSource';
import type React from 'react';

import { Logger } from '@/utils/logger';
export interface GridStateOptions {
  workspaceId: string;
  searchText?: string;
}

export const useGridReduxState = () => {
  // Redux state selectors
  const statuses = useSelector((s: RootState) => (s as any).statuses.value as any[]);
  const priorities = useSelector((s: RootState) => (s as any).priorities.value as any[]);
  const spots = useSelector((s: RootState) => (s as any).spots.value as any[]);
  const workspaces = useSelector((s: RootState) => (s as any).workspaces.value as any[]);
  const users = useSelector((s: RootState) => (s as any).users.value as User[]);
  const categories = useSelector((s: RootState) => (s as any).categories.value as any[]);
  const templates = useSelector((s: RootState) => (s as any).templates?.value as any[] || []);
  const forms = useSelector((s: RootState) => (s as any).forms?.value as any[] || []);
  const formVersions = useSelector((s: RootState) => (s as any).formVersions?.value as any[] || []);
  const taskForms = useSelector((s: RootState) => (s as any).taskForms?.value as any[] || []);
  const statusTransitions = useSelector((s: RootState) => (s as any).statusTransitions.value as any[]);
  const approvals = useSelector((s: RootState) => (s as any).approvals?.value as any[] || []);
  const approvalApprovers = useSelector((s: RootState) => (s as any).approvalApprovers?.value as any[] || []);
  const taskApprovalInstances = useSelector((s: RootState) => (s as any).taskApprovalInstances?.value as any[] || []);
  const slas = useSelector((s: RootState) => (s as any).slas?.value as any[] || []);
  const tags = useSelector((s: RootState) => (s as any).tags?.value as any[] || []);
  const taskTags = useSelector((s: RootState) => (s as any).taskTags?.value as any[] || []);
  const taskUsers = useSelector((s: RootState) => (s as any).taskUsers?.value as any[] || []);
  const customFields = useSelector((s: RootState) => (s as any).customFields?.value as any[] || []);
  const categoryCustomFields = useSelector((s: RootState) => (s as any).categoryCustomFields?.value as any[] || []);
  const taskCustomFieldValues = useSelector((s: RootState) => (s as any).taskCustomFieldValues?.value as any[] || []);
  const taskNotes = useSelector((s: RootState) => (s as any).taskNotes?.value as any[] || []);
  const taskAttachments = useSelector((s: RootState) => (s as any).taskAttachments?.value as any[] || []);
  const roles = useSelector((s: RootState) => (s as any).roles?.value as any[] || []);

  return {
    statuses,
    priorities,
    spots,
    workspaces,
    users,
    categories,
    templates,
    forms,
    formVersions,
    taskForms,
    statusTransitions,
    approvals,
    approvalApprovers,
    taskApprovalInstances,
    slas,
    tags,
    taskTags,
    taskUsers,
    customFields,
    categoryCustomFields,
    taskCustomFieldValues,
    taskNotes,
    taskAttachments,
    roles,
  };
};

export const useDerivedGridState = (reduxState: ReturnType<typeof useGridReduxState>, options: GridStateOptions) => {
  const { workspaceId } = options;
  const { workspaces } = reduxState;

  // Derived state
  const isAllWorkspaces = useMemo(() => workspaceId === 'all', [workspaceId]);
  const workspaceNumericId = useMemo(() => isAllWorkspaces ? null : Number(workspaceId), [workspaceId, isAllWorkspaces]);

  const currentWorkspace = useMemo(() => {
    if (isAllWorkspaces) return null;
    return workspaces.find((w: any) => Number(w.id) === workspaceNumericId);
  }, [workspaces, workspaceNumericId, isAllWorkspaces]);

  const defaultCategoryId = currentWorkspace?.category_id ?? null;

  return {
    isAllWorkspaces,
    workspaceNumericId,
    currentWorkspace,
    defaultCategoryId,
  };
};

export const useGridModeDecision = (workspaceId: string, searchText: string) => {
  return useMemo(() => {
    const decideMode = async () => {
      try {
        if (!TasksCache.initialized) await TasksCache.init();

        // Build minimal params equivalent to the grid query
        const baseParams: any = { search: searchText };
        if (workspaceId !== 'all') baseParams.workspace_id = workspaceId;

        // Get filtered count only
        const countResp = await TasksCache.queryTasks({ ...baseParams, startRow: 0, endRow: 0 });
        const totalFiltered = countResp?.rowCount ?? 0;

        return {
          useClientSide: totalFiltered > 0 && totalFiltered <= GRID_CONSTANTS.CLIENT_THRESHOLD,
          totalFiltered,
        };
      } catch (e) {
        Logger.warn('workspaces', 'decideMode failed', e);
        return {
          useClientSide: false,
          totalFiltered: 0,
        };
      }
    };

    return decideMode;
  }, [workspaceId, searchText]);
};

export const useMetadataLoadedFlags = (reduxState: ReturnType<typeof useGridReduxState>) => {
  const { statuses, priorities, spots, users } = reduxState;

  return useMemo(() => ({
    statusesLoaded: !!(statuses && statuses.length > 0),
    prioritiesLoaded: !!(priorities && priorities.length > 0),
    spotsLoaded: !!(spots && spots.length > 0),
    usersLoaded: !!(users && users.length > 0),
  }), [statuses, priorities, spots, users]);
};

export interface WorkspaceTableModeParams {
  gridApi?: any;
  workspaceId: string;
  searchText: string;
  groupBy: 'none' | 'spot_id' | 'status_id' | 'priority_id';
  onModeChange?: (info: { useClientSide: boolean; totalFiltered: number }) => void;
  workspaceRef: React.MutableRefObject<string>;
  statusMapRef: React.MutableRefObject<any>;
  priorityMapRef: React.MutableRefObject<any>;
  spotMapRef: React.MutableRefObject<any>;
  userMapRef: React.MutableRefObject<any>;
  tagMapRef: React.MutableRefObject<any>;
  taskTagsRef: React.MutableRefObject<any>;
  spotVisibilityFilterRef?: React.MutableRefObject<(task: any) => boolean>;
}

/**
 * Decides row model based on task count and grouping:
 * - Grouping enabled => client-side row model (required for AG Grid grouping)
 * - Row count <= CLIENT_THRESHOLD => client-side row model (faster for local IndexedDB data)
 * - Row count > CLIENT_THRESHOLD => infinite row model (better for very large datasets)
 */
export const useWorkspaceTableMode = (params: WorkspaceTableModeParams) => {
  const [useClientSide, setUseClientSide] = useState(false);
  const [clientRows, setClientRows] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        if (!TasksCache.initialized) await TasksCache.init();

        // First, get the total count for this workspace/search
        const baseParams: any = { search: params.searchText };
        if (params.workspaceRef.current === 'shared') {
          baseParams.shared_with_me = true;
        } else if (params.workspaceRef.current !== 'all') {
          baseParams.workspace_id = params.workspaceRef.current;
        }

        const countResp = await TasksCache.queryTasks({ ...baseParams, startRow: 0, endRow: 0 });
        const totalFiltered = countResp?.rowCount ?? 0;

        // Use client-side mode if grouping is enabled OR row count is under threshold
        const shouldUseClientSide = (params.groupBy && params.groupBy !== 'none') || 
                                     totalFiltered <= GRID_CONSTANTS.CLIENT_THRESHOLD;

        if (shouldUseClientSide) {
          setUseClientSide(true);
          const sortModel = [{ colId: 'id', sort: 'desc' }];
          const { rows } = await refreshClientSideGrid(params.gridApi, TasksCache, {
            search: params.searchText,
            workspaceRef: params.workspaceRef,
            statusMapRef: params.statusMapRef,
            priorityMapRef: params.priorityMapRef,
            spotMapRef: params.spotMapRef,
            userMapRef: params.userMapRef,
            tagMapRef: params.tagMapRef,
            taskTagsRef: params.taskTagsRef,
            sortModel,
            spotVisibilityFilterRef: params.spotVisibilityFilterRef,
          });
          setClientRows(rows || []);
          params.onModeChange?.({ useClientSide: true, totalFiltered });
        } else {
          // Large dataset: use infinite row model
          setUseClientSide(false);
          setClientRows([]);
          params.onModeChange?.({ useClientSide: false, totalFiltered });
        }
      } catch (e) {
        Logger.warn('workspaces', 'Failed to determine row model mode', e);
        // Fallback to infinite mode on error
        setUseClientSide(false);
        setClientRows([]);
      }
    };

    run();
  }, [
    params.groupBy,
    params.gridApi,
    params.onModeChange,
    params.searchText,
    params.taskTagsRef,
    params.tagMapRef,
    params.priorityMapRef,
    params.spotMapRef,
    params.statusMapRef,
    params.userMapRef,
    params.workspaceId,
    params.workspaceRef,
    params.spotVisibilityFilterRef,
  ]);

  return { useClientSide, clientRows, setClientRows, setUseClientSide };
};
