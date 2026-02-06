import { actionsApi } from '@/api/whagonsActionsApi';
import { collections } from '@/store/dexie';

export type ApprovalDecision = 'approved' | 'rejected';

export interface DecideApprovalPayload {
  task_id: number;
  approval_id?: number | null;
  approver_user_id?: number | null;
  decision: ApprovalDecision;
  comment?: string | null;
  task_status_id?: number | null;
}

type DecideApprovalResponseData = {
  task?: any;
  instances?: any[];
  approval_status?: string;
  approval_completed_at?: string | null;
};

/**
 * Record an approval decision (server-side action endpoint) and eagerly sync local caches.
 *
 * Why this exists:
 * - `/approvals/decide` mutates multiple tables (instances, decisions, maybe tasks via actions).
 * - Generic slice CRUD thunks only cover `/task-approval-instances` etc.
 * - We still want immediate UI updates even if realtime isn't connected yet.
 */
export async function decideApprovalAndSync(payload: DecideApprovalPayload): Promise<DecideApprovalResponseData> {
  const resp = await actionsApi.post('/approvals/decide', payload);
  const data: DecideApprovalResponseData = resp?.data?.data ?? {};

  // 1) Update task approval instances in Dexie
  const instances = Array.isArray(data?.instances) ? data.instances : [];
  if (instances.length > 0) {
    // Dexie's put is upsert - works for both insert and update
    await Promise.all(
      instances
        .filter((r) => r && (r.id !== undefined && r.id !== null))
        .map((r) => collections.taskApprovalInstances.put(r))
    );
    // No need for syncReduxForTable - useLiveQuery reacts automatically
  }

  // 2) If server actions updated the task (status change, etc), update tasks too
  if (data?.task && (data.task.id !== undefined && data.task.id !== null)) {
    await collections.tasks.put(data.task);
    // No need for syncReduxForTable - useLiveQuery reacts automatically
  }

  return data;
}

