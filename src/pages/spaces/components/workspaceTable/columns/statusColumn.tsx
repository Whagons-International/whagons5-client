/**
 * Status column definition with status cell renderer and approval blocking
 */

import { Clock } from 'lucide-react';
import StatusCell from '@/pages/spaces/components/StatusCell';
import { ColumnBuilderOptions } from './types';
import { computeApprovalStatusForTask } from '../utils/approvalStatus';
import { buildApproverDetails } from './ApprovalPopup';
import { promptForComment } from '../columnUtils/promptForComment';
import { decideApprovalAndSync } from '@/store/actions/approvalDecisions';

// Simple SLA indicator for the approval popup header
function renderSlaPillSimple(slaId: any, slaMap: Record<number, any>) {
  const sla = slaMap?.[Number(slaId)];
  if (!sla) return null;
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-opacity-10 flex-shrink-0"
      style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
      <Clock className="w-3 h-3 text-purple-600" />
      <span className="text-[10px] font-medium text-purple-600">SLA</span>
    </div>
  );
}

export function createStatusColumn(opts: ColumnBuilderOptions) {
  const {
    statusMap,
    statusesLoaded,
    getStatusIcon,
    getAllowedNextStatuses,
    handleChangeStatus,
    visibleColumns,
    approvalMap,
    taskApprovalInstances,
    approvalApprovers,
    userMap,
    getUserDisplayName,
    currentUserId,
    currentUserRoleIds,
    slaMap,
    roleMap,
    categoryMap,
  } = opts;

  const visibilitySet: Set<string> | null = Array.isArray(visibleColumns)
    ? new Set<string>(visibleColumns as string[])
    : null;

  const isVisible = (id: string | undefined): boolean => {
    if (!visibilitySet) return true;
    if (!id) return true;
    if (id === 'name' || id === 'notes' || id === 'id') return true;
    return visibilitySet.has(id);
  };

  const t = opts.t || ((key: string, fallback?: string) => fallback || key);
  
  return {
    field: 'status_id',
    headerName: t('workspace.columns.status', 'Status'),
    sortable: true,
    rowGroup: undefined,
    hide: !isVisible('status_id'),
    filter: 'agSetColumnFilter',
    valueFormatter: (p: any) => {
      const meta: any = statusMap[p.value as number];
      return meta?.name || `#${p.value}`;
    },
    filterParams: {
      values: (params: any) => {
        const ids = Object.keys(statusMap).map((k: any) => Number(k));
        params.success(ids);
      },
      suppressMiniFilter: false,
      valueFormatter: (p: any) => {
        const meta: any = statusMap[p.value as number];
        return meta?.name || `#${p.value}`;
      },
    },
    cellRenderer: (p: any) => {
      if (!p.data) {
        return (
          <div className="flex items-center h-full py-2">
            <div className="h-5 w-24 bg-muted animate-pulse rounded" />
          </div>
        );
      }
      const row = p.data;
      if (!statusesLoaded || !row) return (<div className="flex items-center h-full py-2"><span className="opacity-0">.</span></div>);
      const meta: any = statusMap[p.value as number];
      if (!meta) return (<div className="flex items-center h-full py-2"><span className="opacity-0">.</span></div>);
      
      const approvalId = row.approval_id;
      const approvalRequired = !!approvalId;
      const approval = approvalId ? approvalMap?.[Number(approvalId)] : null;
      const taskRowId = Number(row?.id);
      
      const derived = computeApprovalStatusForTask({
        taskId: taskRowId,
        approvalId,
        approval,
        taskApprovalInstances,
      });
      
      const approvalPending = approvalRequired && derived === 'pending';
      const approvalRejected = approvalRequired && derived === 'rejected';
      const approvalApproved = approvalRequired && derived === 'approved';
      const allowedNext = getAllowedNextStatuses(row);
      
      // Build approval props when approval is pending, rejected, or approved
      let approvalProps = undefined;
      if (approvalPending || approvalRejected || approvalApproved) {
        const approverDetails = buildApproverDetails(
          approvalId,
          taskRowId,
          taskApprovalInstances,
          approvalApprovers,
          userMap,
          getUserDisplayName,
          roleMap
        );
        
        // Check if current user can act on this approval:
        // 1. Direct user match: approverUserId matches currentUserId
        // 2. Role-based match: approverRoleId is in currentUserRoleIds
        const canAct = !!currentUserId && approverDetails.some((d) => {
          const pendingLike = !d.status || d.status === 'pending' || d.status === 'not started';
          if (!pendingLike) return false;
          
          // Check direct user match
          const uid = Number(d.approverUserId);
          if (Number.isFinite(uid) && uid === Number(currentUserId)) {
            return true;
          }
          
          // Check role-based match
          const roleId = d.approverRoleId;
          if (roleId && Array.isArray(currentUserRoleIds) && currentUserRoleIds.includes(roleId)) {
            return true;
          }
          
          return false;
        });
        
        // Get SLA pill if applicable
        const categoryId = row?.category_id;
        const category = categoryId ? categoryMap?.[Number(categoryId)] : null;
        const slaId = row?.sla_id ?? category?.sla_id;
        const slaPill = slaId ? renderSlaPillSimple(slaId, slaMap) : undefined;
        
        const submitDecision = async (decision: 'approved' | 'rejected', onSuccess?: () => void) => {
          let comment: string | null = null;
          if (decision === 'rejected') {
            comment = await promptForComment('Reject approval', 'A comment is required to reject this approval.');
            if (comment === null) return;
          }
          const currentUid = Number(currentUserId);
          
          // Find the approver instance that matches current user:
          // 1. Direct user match
          // 2. Role-based match where current user has the role
          const myInstance = approverDetails.find((d) => {
            const pendingLike = !d.status || d.status === 'pending' || d.status === 'not started';
            if (!pendingLike) return false;
            
            // Direct user match
            if (Number(d.approverUserId) === currentUid) return true;
            
            // Role-based match
            const roleId = d.approverRoleId;
            if (roleId && Array.isArray(currentUserRoleIds) && currentUserRoleIds.includes(roleId)) return true;
            
            return false;
          });
          
          // For role-based approvers, we send the current user's ID (backend validates role membership)
          const approverUserIdToSend = myInstance?.approverUserId ?? (Number.isFinite(currentUid) ? currentUid : null);
          if (!approverUserIdToSend && !myInstance?.approverRoleId) {
            try {
              window.dispatchEvent(new CustomEvent('wh:notify', {
                detail: { type: 'error', message: 'No matching approver found for this task.' }
              }));
            } catch {}
            return;
          }
          try {
            await decideApprovalAndSync({
              task_id: row?.id,
              approval_id: approvalId,
              approver_user_id: approverUserIdToSend,
              decision,
              comment,
              task_status_id: row?.status_id,
            });
            try { p.api?.refreshCells({ force: true }); } catch {}
            try {
              window.dispatchEvent(new CustomEvent('wh:approvalDecision:success', {
                detail: { taskId: row?.id, approvalId, decision }
              }));
              window.dispatchEvent(new CustomEvent('wh:notify', {
                detail: { type: 'success', message: `Decision ${decision} recorded.` }
              }));
            } catch {}
            onSuccess?.();
          } catch (e) {
            console.warn('approval decision failed', e);
            try {
              const msg = (e as any)?.response?.data?.message || 'Failed to record approval decision';
              window.dispatchEvent(new CustomEvent('wh:approvalDecision:error', {
                detail: { taskId: row?.id, approvalId, decision, error: e }
              }));
              window.dispatchEvent(new CustomEvent('wh:notify', {
                detail: { type: 'error', message: msg }
              }));
            } catch {}
          }
        };
        
        approvalProps = {
          approval,
          approvalStatus: derived as 'pending' | 'approved' | 'rejected' | null,
          approverDetails,
          canAct,
          slaPill,
          submitDecision,
        };
      }
      
      return (
        <StatusCell
          value={p.value}
          statusMap={statusMap}
          getStatusIcon={getStatusIcon}
          allowedNext={approvalApproved ? allowedNext : (approvalProps ? [] : allowedNext)}
          onChange={(to: number) => handleChangeStatus(row, to)}
          approvalProps={approvalProps}
        />
      );
    },
    onCellClicked: (params: any) => {
      // Prevent row click event from firing when clicking anywhere in the status column
      if (params.event) {
        params.event.stopPropagation();
        params.event.preventDefault();
      }
    },
    width: 170,
    minWidth: 160,
    maxWidth: 220,
  };
}
