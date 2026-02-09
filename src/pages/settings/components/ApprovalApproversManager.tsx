import React, { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { Approval, User, Role, ApprovalApprover, JobPosition } from "@/store/types";
import { genericActions, genericCaches, genericEventNames, genericEvents } from '@/store/genericSlices';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import type { ComboboxOption } from "@/components/ui/combobox";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faUserShield, faUser, faUserTag, faBriefcase } from "@fortawesome/free-solid-svg-icons";

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

const TYPE_CONFIG: Record<ApproverType, { label: string; icon: typeof faUser; color: string }> = {
  user: { label: 'User', icon: faUser, color: 'text-blue-600 dark:text-blue-400' },
  role: { label: 'Role', icon: faUserShield, color: 'text-purple-600 dark:text-purple-400' },
  job_position: { label: 'Job Position', icon: faBriefcase, color: 'text-amber-600 dark:text-amber-400' },
};

export function ApprovalApproversManager({ open, onOpenChange, approval }: ApprovalApproversManagerProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { value: users } = useSelector((s: RootState) => s.users) as { value: User[] };
  const { value: roles } = useSelector((s: RootState) => s.roles) as { value: Role[] };
  const { value: jobPositions } = useSelector((s: RootState) => s.jobPositions) as { value: JobPosition[] };
  // Access slice to subscribe for external changes; actual data read via cache for consistency
  useSelector((s: RootState) => s.approvalApprovers.value as ApprovalApprover[]);

  const [items, setItems] = useState<LocalApprover[]>([]);
  const lastMutationRef = React.useRef<number>(0);
  const pendingRemovalsRef = React.useRef<Set<number>>(new Set());
  const [type, setType] = useState<ApproverType>('user');
  const [selectedId, setSelectedId] = useState<string>("");
  const [required, setRequired] = useState<boolean>(true);
  const isFirstApprover = items.length === 0;

  // Build combobox options, filtering out already-assigned approvers
  const availableOptions = useMemo((): ComboboxOption[] => {
    const assignedKeys = new Set(items.map(i => `${i.approver_type}-${i.approver_id}`));
    if (type === 'user') {
      return (users || [])
        .filter(u => !assignedKeys.has(`user-${u.id}`))
        .map((u) => ({ value: String(u.id), label: u.name }));
    } else if (type === 'role') {
      return (roles || [])
        .filter(r => !assignedKeys.has(`role-${r.id}`))
        .map((r) => ({ value: String(r.id), label: r.name }));
    } else if (type === 'job_position') {
      return (jobPositions || [])
        .filter(jp => !assignedKeys.has(`job_position-${jp.id}`))
        .map((jp) => ({ value: String(jp.id), label: jp.title }));
    }
    return [];
  }, [type, users, roles, jobPositions, items]);

  const refreshFromCache = React.useCallback(async (force: boolean = false) => {
    const aid = approval ? Number(approval.id) : null;
    if (!aid) return;
    try {
      // Skip transient refreshes triggered by events right after a local mutation
      if (!force) {
        const recentlyMutated = Date.now() - lastMutationRef.current < 1200;
        if (recentlyMutated) return;
      }
      const rows = await genericCaches.approvalApprovers.getAll();
      const pending = pendingRemovalsRef.current;
      const filtered = rows.filter((r: any) =>
        Number((r as any)?.approval_id ?? (r as any)?.approvalId) === aid &&
        !pending.has(Number((r as any)?.id))
      );
      if (filtered.length > 0) {
        setItems((prev) => {
          const byId = new Map<number, any>();
          const byKey = new Map<string, any>();
          for (const r of filtered as any[]) {
            if (r && r.id != null) byId.set(Number(r.id), r);
            const key = `${(r as any)?.approver_type}-${Number((r as any)?.approver_id)}`;
            byKey.set(key, r);
          }
          const out: any[] = [];
          for (const r of byId.values()) out.push(r);
          for (const r of prev) {
            if (r && r.id < 0) {
              const key = `${r.approver_type}-${Number(r.approver_id)}`;
              if (!byKey.has(key)) out.push(r);
            }
          }
          return out as any;
        });
      } else {
        const recentlyMutated = Date.now() - lastMutationRef.current < 2000;
        if (!recentlyMutated) setItems([]);
      }
    } catch {}
  }, [approval]);

  const loadData = React.useCallback(async () => {
    if (!approval) return;
    await refreshFromCache(true);
  }, [dispatch, approval, refreshFromCache]);

  React.useEffect(() => {
    if (open && approval) {
      pendingRemovalsRef.current.clear();
      loadData();
    }
  }, [open, approval, dispatch, loadData]);

  React.useEffect(() => {
    if (!open || !approval) return;
    const names = genericEventNames.approvalApprovers;
    const off1 = genericEvents.on(names.CREATED, refreshFromCache);
    const off2 = genericEvents.on(names.UPDATED, refreshFromCache);
    const off3 = genericEvents.on(names.DELETED, refreshFromCache);
    return () => { off1(); off2(); off3(); };
  }, [open, approval, refreshFromCache]);

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
      const saved = await dispatch(genericActions.approvalApprovers.addAsync({
        approval_id: Number(approval.id),
        approver_type: type,
        approver_id: approverId,
        required: requiredFlag,
        order_index: items.length,
        scope: 'global',
        scope_id: null,
      } as any) as any).unwrap();
      setItems(prev => {
        const copy = [...prev];
        const idx = copy.findIndex(r => r.id === optimistic.id);
        if (idx !== -1) copy[idx] = saved as any; else copy.push(saved as any);
        return copy;
      });
    } catch (e) {
      // rollback optimistic
      setItems(prev => prev.filter(i => i.id !== optimistic.id));
    } finally {
      refreshFromCache(true);
    }
  };

  const remove = async (id: number) => {
    // Track this ID as pending removal so refreshFromCache won't restore it
    pendingRemovalsRef.current.add(id);
    // Optimistically remove from local UI immediately
    setItems(prev => prev.filter(i => String(i.id) !== String(id)));
    lastMutationRef.current = Date.now();
    try {
      await dispatch(genericActions.approvalApprovers.removeAsync(id) as any).unwrap();
      // After successful API deletion, wait for cache to settle then refresh.
      // Clear the pending removal once the cache is likely updated.
      setTimeout(() => {
        pendingRemovalsRef.current.delete(id);
        refreshFromCache(true);
      }, 800);
    } catch (e) {
      // If server fails, clear pending and re-sync from cache to restore the item
      pendingRemovalsRef.current.delete(id);
      await refreshFromCache(true);
    }
  };

  const toggleRequired = async (id: number) => {
    if (items.length <= 1) return; // single approver must remain required
    const it = items.find(i => String(i.id) === String(id));
    if (!it) return;
    lastMutationRef.current = Date.now();
    try {
      await dispatch(genericActions.approvalApprovers.updateAsync({ id, updates: { required: !it.required } } as any) as any).unwrap();
    } catch (e) {
      // ignore
    } finally {
      refreshFromCache(true);
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

  const typeConfig = TYPE_CONFIG[type];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="overflow-visible max-h-[90vh] flex flex-col" style={{ maxWidth: 780 }}>
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center">
              <FontAwesomeIcon icon={faUserTag} className="text-blue-600 dark:text-blue-400 w-3.5 h-3.5" />
            </div>
            <span>Manage Approvers</span>
          </DialogTitle>
          {approval && (
            <DialogDescription className="text-sm">
              {approval.name} &mdash; Assign users or roles as approvers. Changes are saved immediately.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto flex-1 min-h-0 py-2">
          {/* Add approver section */}
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add approver</div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Type selector */}
              <Select value={type} onValueChange={(value) => { setType(value as ApproverType); setSelectedId(""); }}>
                <SelectTrigger className="w-full sm:w-[160px] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <span className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faUser} className="w-3 h-3 text-blue-500" />
                      User
                    </span>
                  </SelectItem>
                  <SelectItem value="role">
                    <span className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faUserShield} className="w-3 h-3 text-purple-500" />
                      Role
                    </span>
                  </SelectItem>
                  <SelectItem value="job_position">
                    <span className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faBriefcase} className="w-3 h-3 text-amber-500" />
                      Job Position
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Searchable entity selector */}
              <div className="flex-1">
                <Combobox
                  options={availableOptions}
                  value={selectedId || undefined}
                  onValueChange={(v) => setSelectedId(v ?? "")}
                  placeholder={`Search ${typeConfig.label.toLowerCase()}...`}
                  searchPlaceholder={`Type to search...`}
                  emptyText={`No ${typeConfig.label.toLowerCase()}s found.`}
                />
              </div>

              {/* Required checkbox + Add button */}
              <div className="flex items-center gap-3">
                {!isFirstApprover && (
                  <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                    <Checkbox
                      id="required-checkbox"
                      checked={required}
                      onCheckedChange={(checked) => setRequired(checked === true)}
                    />
                    <Label htmlFor="required-checkbox" className="cursor-pointer text-xs">
                      Required
                    </Label>
                  </div>
                )}
                <Button onClick={add} disabled={!selectedId} size="sm" className="h-10 px-4">
                  <FontAwesomeIcon icon={faPlus} className="mr-2 w-3 h-3" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Approvers list */}
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                <FontAwesomeIcon icon={faUserTag} className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium text-muted-foreground">No approvers assigned yet</div>
              <div className="text-xs text-muted-foreground">Search and add users, roles, or job positions above.</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Assigned approvers
                </div>
                <div className="text-xs text-muted-foreground">
                  {items.length} approver{items.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className="rounded-lg border divide-y max-h-[340px] overflow-y-auto">
                {items.map(i => {
                  const cfg = TYPE_CONFIG[i.approver_type] || TYPE_CONFIG.user;
                  return (
                    <div key={i.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group">
                      {/* Icon */}
                      <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <FontAwesomeIcon icon={cfg.icon} className={`w-3.5 h-3.5 ${cfg.color}`} />
                      </div>
                      {/* Name & type */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight truncate">{nameOf(i)}</div>
                        <div className="text-xs text-muted-foreground capitalize">{cfg.label}</div>
                      </div>
                      {/* Required badge */}
                      <button
                        type="button"
                        onClick={() => toggleRequired(i.id)}
                        disabled={items.length <= 1}
                        className={`
                          text-xs px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer
                          ${i.required
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}
                          ${items.length <= 1 ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80'}
                        `}
                        title={items.length <= 1 ? "Single approver is always required" : (i.required ? "Click to make optional" : "Click to make required")}
                      >
                        {i.required ? 'Required' : 'Optional'}
                      </button>
                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => remove(i.id)}
                        title="Remove approver"
                        aria-label="Remove approver"
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={close}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ApprovalApproversManager;
