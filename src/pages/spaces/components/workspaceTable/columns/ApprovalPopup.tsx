/**
 * Shared ApprovalPopup component for displaying approval details and actions
 * Used by both StatusCell (when approval pending) and ConfigColumn (for completed approvals)
 */

import React, { useState } from 'react';
import dayjs from 'dayjs';
import { CheckCircle2, Clock, XCircle, X, Check, User, ChevronRight } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ApproverDetail {
  id: number | string;
  name: string;
  status: string;
  statusColor: string;
  isRequired: boolean;
  step: number;
  respondedAt?: string | null;
  comment?: string | null;
  approverUserId?: number | null;
  approverRoleId?: number | null; // For role-based approvers
}

export interface ApprovalPopupProps {
  approval: any;
  normalizedApprovalStatus: string;
  approvalStatusLabel: string;
  approverDetails: ApproverDetail[];
  canAct: boolean;
  slaPill?: React.ReactNode;
  submitDecision: (decision: 'approved' | 'rejected', onSuccess?: () => void) => Promise<void>;
  trigger: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ApprovalPopup({
  approval,
  normalizedApprovalStatus,
  approvalStatusLabel,
  approverDetails,
  canAct,
  slaPill,
  submitDecision,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ApprovalPopupProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

  const handleSubmitDecision = async (decision: 'approved' | 'rejected') => {
    await submitDecision(decision, () => {
      setOpen(false);
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        side="right"
        className="w-[420px] p-0 overflow-hidden rounded-lg bg-popover text-popover-foreground border border-border shadow-md"
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border bg-muted/40">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {approval?.name || 'Approval Required'}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={[
                      'gap-1.5',
                      normalizedApprovalStatus === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : normalizedApprovalStatus === 'rejected'
                          ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                    ].join(' ')}
                  >
                    {normalizedApprovalStatus === 'approved' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : normalizedApprovalStatus === 'rejected' ? (
                      <XCircle className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {approvalStatusLabel}
                  </Badge>
                  {slaPill}
                </div>
              </div>
            </div>
          </div>

          {/* Approvers */}
          <div className="p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Approval Progress
            </div>

            {approverDetails && approverDetails.length > 0 ? (
              <div className="space-y-2">
                {approverDetails.map((detail) => {
                  const isApproved = detail.status === 'approved';
                  const isRejected = detail.status === 'rejected';
                  const isSkipped = detail.status === 'skipped';
                  const isPendingLike = !detail.status || detail.status === 'pending' || detail.status === 'not started';

                  const statusLabel =
                    detail.status === 'not started' ? 'Not started' :
                    detail.status === 'pending' ? 'Pending' :
                    detail.status ? detail.status.charAt(0).toUpperCase() + detail.status.slice(1) : 'Pending';

                  return (
                    <div
                      key={detail.id}
                      className="rounded-md border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background">
                          {isApproved ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : isRejected ? (
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          ) : isSkipped ? (
                            <ChevronRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium truncate">{detail.name}</div>
                            {approverDetails.length > 1 && (
                              <Badge variant="outline" className="h-5 text-[10px] px-1.5">
                                Step {detail.step}
                              </Badge>
                            )}
                            {detail.isRequired ? (
                              <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                                Required
                              </Badge>
                            ) : null}
                          </div>

                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span
                              className={
                                isApproved ? 'text-emerald-600 dark:text-emerald-400'
                                  : isRejected ? 'text-red-600 dark:text-red-400'
                                    : isSkipped ? 'text-amber-700 dark:text-amber-400'
                                      : isPendingLike ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'
                              }
                            >
                              {statusLabel}
                            </span>
                            {detail.respondedAt && dayjs(detail.respondedAt).isValid() ? (
                              <>
                                <span className="text-muted-foreground/60">•</span>
                                <span>{dayjs(detail.respondedAt).format('MMM D, h:mm A')}</span>
                              </>
                            ) : null}
                          </div>

                          {detail.comment ? (
                            <div className="mt-2 rounded-md border border-border bg-background/60 p-2 text-xs text-muted-foreground">
                              <div className="font-medium text-foreground mb-1">Comment</div>
                              <div className="whitespace-pre-wrap break-words leading-relaxed">{detail.comment}</div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No approvers configured yet.
              </div>
            )}
          </div>

          {/* Actions */}
          {canAct && (
            <div className="p-4 pt-0">
              <div className="flex items-center gap-2">
                <Button
                  className="flex-1"
                  onClick={(e) => { e.stopPropagation(); handleSubmitDecision('approved'); }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={(e) => { e.stopPropagation(); handleSubmitDecision('rejected'); }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper function to build approver details from instances and approvers
export function buildApproverDetails(
  approvalId: number,
  taskId: number,
  taskApprovalInstances: any[],
  approvalApprovers: any[],
  userMap: Record<string | number, any>,
  getUserDisplayName: (user: any) => string,
  roleMap: Record<number, any>
): ApproverDetail[] {
  let approverDetails: ApproverDetail[] = [];
  
  if (approvalId && taskApprovalInstances.length > 0) {
    const instances = taskApprovalInstances
      .filter((inst: any) => Number(inst.task_id) === taskId)
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
    
    approverDetails = instances.map((inst: any, idx: number) => {
      // Look up the source approver config to get role information
      const sourceApprover = inst.source_approver_id && Array.isArray(approvalApprovers)
        ? approvalApprovers.find((ap: any) => Number(ap.id) === Number(inst.source_approver_id))
        : null;
      const isRoleBased = sourceApprover?.approver_type === 'role';
      const roleId = isRoleBased ? Number(sourceApprover.approver_id) : null;
      
      const userRecord = inst.approver_user_id != null
        ? ((userMap?.[Number(inst.approver_user_id)]) || (userMap?.[String(inst.approver_user_id)]) || null)
        : null;
      
      // For role-based approvers without a specific user, show the role name
      let displayName: string;
      if (userRecord) {
        displayName = getUserDisplayName(userRecord);
      } else if (isRoleBased && roleId) {
        displayName = roleMap[roleId]?.name || `Role #${roleId}`;
      } else {
        displayName = inst.approver_name || `Approver ${idx + 1}`;
      }
      
      const normalizedStatus = (inst.status || 'pending').toString().toLowerCase();
      const statusColor =
        normalizedStatus === 'approved'
          ? 'text-green-600'
          : normalizedStatus === 'rejected'
            ? 'text-red-600'
            : normalizedStatus === 'skipped'
              ? 'text-amber-600'
              : 'text-blue-600';
      return {
        id: inst.id ?? `${inst.task_id}-${idx}`,
        name: displayName,
        status: normalizedStatus,
        statusColor,
        isRequired: inst.is_required !== false,
        step: (inst.order_index ?? idx) + 1,
        respondedAt: inst.responded_at,
        comment: inst.response_comment,
        approverUserId: inst.approver_user_id != null ? Number(inst.approver_user_id) : null,
        approverRoleId: roleId,
      };
    });
  }

  if (approverDetails.length === 0 && approvalId && Array.isArray(approvalApprovers)) {
    const configuredApprovers = approvalApprovers
      .filter((ap: any) => Number(ap.approval_id) === Number(approvalId))
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
    if (configuredApprovers.length > 0) {
      approverDetails = configuredApprovers.map((config: any, idx: number) => {
        const userRecord = config.approver_type === 'user'
          ? ((userMap?.[Number(config.approver_id)]) || (userMap?.[String(config.approver_id)]) || null)
          : null;
        const name = userRecord
          ? getUserDisplayName(userRecord)
          : (
            config.approver_type === 'role'
              ? (roleMap[Number(config.approver_id)]?.name || `Role #${config.approver_id}`)
              : config.approver_label || `Approver ${idx + 1}`
          );
        const scopeLabel = config.scope && config.scope !== 'global'
          ? ` • ${String(config.scope).replace(/_/g, ' ')}`
          : '';
        return {
          id: config.id ?? `config-${idx}`,
          name: `${name}${scopeLabel}`,
          status: 'not started',
          statusColor: 'text-muted-foreground',
          isRequired: config.required !== false,
          step: (config.order_index ?? idx) + 1,
          respondedAt: null,
          approverUserId: config.approver_type === 'user' && config.approver_id ? Number(config.approver_id) : null,
          approverRoleId: config.approver_type === 'role' && config.approver_id ? Number(config.approver_id) : null,
        };
      });
    }
  }

  return approverDetails;
}
