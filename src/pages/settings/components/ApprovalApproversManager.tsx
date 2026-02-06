import React, { useMemo, useState } from "react";
import { Approval, User, Role, ApprovalApprover, JobPosition } from "@/store/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useTable, collections } from "@/store/dexie";

export interface ApprovalApproversManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approval: Approval | null;
}

type ApproverType = 'user' | 'role' | 'job_position';

type LocalApprover = {
  id: number;
  approval_id: number;
  approver_type: ApproverType;
  approver_id: number;
  required: boolean;
  order_index: number;
  scope: 'global' | 'creator_department' | 'creator_manager' | 'specific_department';
  scope_id: number | null;
};

export function ApprovalApproversManager({ open, onOpenChange, approval }: ApprovalApproversManagerProps) {
  const users = useTable<User>('users') ?? [];
  const roles = useTable<Role>('roles') ?? [];
  const jobPositions = useTable<JobPosition>('job_positions') ?? [];
  const approvalApprovers = useTable<ApprovalApprover>('approval_approvers') ?? [];

  const [items, setItems] = useState<LocalApprover[]>([]);
  const lastMutationRef = React.useRef<number>(0);
  const [type, setType] = useState<ApproverType>('user');
  const [selectedId, setSelectedId] = useState<string>("");
  const [required, setRequired] = useState<boolean>(true);
  const isFirstApprover = items.length === 0;

  const availableOptions = useMemo(() => {
    if (type === 'user') {
      return (users || []).map((u) => ({ value: String(u.id), label: u.name }));
    } else if (type === 'role') {
      return (roles || []).map((r) => ({ value: String(r.id), label: r.name }));
    } else if (type === 'job_position') {
      return (jobPositions || []).map((jp) => ({ value: String(jp.id), label: jp.title }));
    }
    return [];
  }, [type, users, roles, jobPositions]);

  // Derive items from live Dexie data - no manual cache refresh needed
  React.useEffect(() => {
    if (!open || !approval) return;
    const aid = Number(approval.id);
    const filtered = approvalApprovers.filter((r) => Number(r.approval_id) === aid);
    // Merge with optimistic local items (negative IDs)
    setItems((prev) => {
      const byId = new Map<number, ApprovalApprover>();
      const byKey = new Map<string, ApprovalApprover>();
      for (const r of filtered) {
        if (r && r.id != null) byId.set(Number(r.id), r);
        const key = `${r.approver_type}-${Number(r.approver_id)}`;
        byKey.set(key, r);
      }
      const out: LocalApprover[] = [];
      for (const r of byId.values()) out.push(r as LocalApprover);
      for (const r of prev) {
        if (r && r.id < 0) {
          const key = `${r.approver_type}-${Number(r.approver_id)}`;
          if (!byKey.has(key)) out.push(r);
        }
      }
      return out;
    });
  }, [open, approval, approvalApprovers]);

  const add = async () => {
    if (!approval || !selectedId) return;
    const approverId = Number(selectedId);
    const already = items.some(i => i.approver_type === type && i.approver_id === approverId);
    if (already) return;
    const requiredFlag = isFirstApprover ? true : required;
    const optimistic: LocalApprover = {
      id: -Date.now(),
      approval_id: Number(approval.id),
      approver_type: type,
      approver_id: approverId,
      required: requiredFlag,
      order_index: items.length,
      scope: 'global',
      scope_id: null,
    };
    setItems(prev => [...prev, optimistic]);
    setSelectedId("");
    lastMutationRef.current = Date.now();
    try {
      const saved = await collections.approvalApprovers.add({
        approval_id: Number(approval.id),
        approver_type: type,
        approver_id: approverId,
        required: requiredFlag,
        order_index: items.length,
        scope: 'global',
        scope_id: null,
      });
      setItems(prev => {
        const copy = [...prev];
        const idx = copy.findIndex(r => r.id === optimistic.id);
        if (idx !== -1) copy[idx] = saved as LocalApprover; else copy.push(saved as LocalApprover);
        return copy;
      });
    } catch (e) {
      // rollback optimistic
      setItems(prev => prev.filter(i => i.id !== optimistic.id));
    }
  };

  const remove = async (id: number) => {
    // Optimistically remove from local UI immediately
    setItems(prev => prev.filter(i => String(i.id) !== String(id)));
    lastMutationRef.current = Date.now();
    try {
      await collections.approvalApprovers.delete(id);
    } catch (e) {
      // If server fails, Dexie's live query will restore the item automatically
    }
  };

  const toggleRequired = async (id: number) => {
    if (items.length <= 1) return; // single approver must remain required
    const it = items.find(i => String(i.id) === String(id));
    if (!it) return;
    lastMutationRef.current = Date.now();
    try {
      await collections.approvalApprovers.update(id, { required: !it.required });
    } catch (e) {
      // ignore - Dexie's live query will revert if needed
    }
  };

  const nameOf = (i: LocalApprover): string => {
    if (i.approver_type === 'user') {
      return users.find(u => u.id === i.approver_id)?.name || `User #${i.approver_id}`;
    } else if (i.approver_type === 'role') {
      return roles.find(r => r.id === i.approver_id)?.name || `Role #${i.approver_id}`;
    } else if (i.approver_type === 'job_position') {
      return jobPositions.find(jp => jp.id === i.approver_id)?.title || `Job Position #${i.approver_id}`;
    }
    return `Unknown #${i.approver_id}`;
  };

  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl overflow-visible max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Approvers{approval ? ` • ${approval.name}` : ''}</DialogTitle>
          <DialogDescription>
            Assign users or roles as approvers for this approval. Changes are saved immediately and cached locally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="flex items-center gap-2">
            <Select value={type} onValueChange={(value) => setType(value as ApproverType)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="job_position">Job Position</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedId || undefined} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={`Select ${type}`} />
              </SelectTrigger>
              <SelectContent>
                {availableOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isFirstApprover && (
              <div className="flex items-center gap-2 text-sm">
                <Checkbox
                  id="required-checkbox"
                  checked={required}
                  onCheckedChange={(checked) => setRequired(checked === true)}
                />
                <Label htmlFor="required-checkbox" className="cursor-pointer">
                  Required
                </Label>
              </div>
            )}
            <Button onClick={add} disabled={!selectedId} size="sm">
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Add
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <div className="text-sm text-muted-foreground">No approvers assigned yet.</div>
              <div className="text-xs text-muted-foreground mt-1">Choose a type and an item above, then click Add.</div>
            </div>
          ) : (
            <div className="border rounded-md max-h-[400px] overflow-y-auto">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-muted/30 rounded-t-md sticky top-0 z-10">
                <div className="col-span-5">Approver</div>
                <div className="col-span-2">Approval Type</div>
                <div className="col-span-3">Required</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              <div className="divide-y">
                {items.map(i => (
                  <div key={i.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5">
                    <div className="col-span-5 truncate">
                      <div className="font-medium leading-tight">{nameOf(i)}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-sm capitalize">
                        {i.approver_type === 'user' ? 'User' : 
                         i.approver_type === 'role' ? 'Role' : 
                         i.approver_type === 'job_position' ? 'Job Position' : 
                         i.approver_type}
                      </div>
                    </div>
                    <div className="col-span-3">
                      <Checkbox
                        checked={i.required}
                        disabled={items.length <= 1}
                        onCheckedChange={() => toggleRequired(i.id)}
                        title={items.length <= 1 ? "Single approver is always required" : undefined}
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-end">
                      <Button variant="destructive" size="sm" className="h-7 w-7 p-0" onClick={() => remove(i.id)} title="Remove approver" aria-label="Remove approver">
                        <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center gap-2 w-full justify-between">
            <div className="text-xs text-muted-foreground">{items.length} approver{items.length === 1 ? '' : 's'}</div>
            <div className="flex items-center gap-2">
              <Input type="hidden" value={items.length} readOnly />
              <Button variant="outline" onClick={close}>Close</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ApprovalApproversManager;

