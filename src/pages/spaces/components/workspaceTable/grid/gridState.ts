// Dexie state management and derived state utilities for WorkspaceTable

import { useEffect, useMemo, useState } from 'react';
import type { User } from '@/store/types';
import { GRID_CONSTANTS } from './gridConfig';
import { refreshClientSideGrid } from './dataSource';
import { useTable } from '@/store/dexie';
import { queryTasks } from '@/store/dexie';
import type React from 'react';

export interface GridStateOptions {
  workspaceId: string;
  searchText?: string;
}

export const useGridDexieState = () => {
  // Dexie table hooks (reactive queries)
  const statuses = useTable('statuses') || [];
  const priorities = useTable('priorities') || [];
  const spots = useTable('spots') || [];
  const workspaces = useTable('workspaces') || [];
  const users = (useTable('users') || []) as User[];
  const categories = useTable('categories') || [];
  const templates = useTable('templates') || [];
  const forms = useTable('forms') || [];
  const formVersions = useTable('form_versions') || [];
  const taskForms = useTable('task_forms') || [];
  const statusTransitions = useTable('status_transitions') || [];
  const approvals = useTable('approvals') || [];
  const approvalApprovers = useTable('approval_approvers') || [];
  const taskApprovalInstances = useTable('task_approval_instances') || [];
  const slas = useTable('slas') || [];
  const tags = useTable('tags') || [];
  const taskTags = useTable('task_tags') || [];
  const taskUsers = useTable('task_users') || [];
  const customFields = useTable('custom_fields') || [];
  const categoryCustomFields = useTable('category_custom_fields') || [];
  const taskCustomFieldValues = useTable('task_custom_field_values') || [];
  const taskNotes = useTable('task_notes') || [];
  const taskAttachments = useTable('task_attachments') || [];
  const roles = useTable('roles') || [];

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

// Alias for backward compatibility
export const useGridReduxState = useGridDexieState;

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
        // Build minimal params equivalent to the grid query
        const baseParams: any = { search: searchText };
        if (workspaceId !== 'all') baseParams.workspace_id = Number(workspaceId);

        // Get filtered count only
        const countResp = await queryTasks({ ...baseParams, startRow: 0, endRow: 0 });
        const totalFiltered = countResp?.rowCount ?? 0;

        return {
          useClientSide: totalFiltered > 0 && totalFiltered <= GRID_CONSTANTS.CLIENT_THRESHOLD,
          totalFiltered,
        };
      } catch (e) {
        console.warn('decideMode failed', e);
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
}

/**
 * Enforces current mode behavior:
 * - Grouping => client-side row model (load all rows)
 * - No grouping => infinite row model (do not load all rows)
 */
export const useWorkspaceTableMode = (params: WorkspaceTableModeParams) => {
  const [useClientSide, setUseClientSide] = useState(false);
  const [clientRows, setClientRows] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      // When grouping is enabled we must use client-side row model
      if (params.groupBy && params.groupBy !== 'none') {
        setUseClientSide(true);
        try {
          const sortModel = [{ colId: 'id', sort: 'desc' }];
          const { rows, totalFiltered } = await refreshClientSideGrid(params.gridApi, {
            search: params.searchText,
            workspaceRef: params.workspaceRef,
            statusMapRef: params.statusMapRef,
            priorityMapRef: params.priorityMapRef,
            spotMapRef: params.spotMapRef,
            userMapRef: params.userMapRef,
            tagMapRef: params.tagMapRef,
            taskTagsRef: params.taskTagsRef,
            sortModel,
          });
          setClientRows(rows || []);
          try {
            params.onModeChange?.({ useClientSide: true, totalFiltered });
          } catch {
            // ignore
          }
        } catch (e) {
          console.warn('Failed to load client-side rows for grouping', e);
          setClientRows([]);
        }
        return;
      }

      // No grouping: always use infinite row model to avoid client-side filter quirks
      setUseClientSide(false);
      setClientRows([]);
      try {
        params.onModeChange?.({ useClientSide: false, totalFiltered: 0 });
      } catch {
        // ignore
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
  ]);

  return { useClientSide, clientRows, setClientRows, setUseClientSide };
};
