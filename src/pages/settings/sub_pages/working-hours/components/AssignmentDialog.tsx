import { useState, useMemo, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faUsers,
  faBriefcase,
  faSearch,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { RootState } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { genericActions } from "@/store/genericSlices";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import { ScheduleAssignment, WorkingSchedule } from "../types";
import { User, Team, JobPosition } from "@/store/types";

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: number;
  assignment: ScheduleAssignment | null; // null = create mode
  tt: (key: string, fallback: string) => string;
  /** When opened from the global Assignments tab, allow picking the schedule */
  schedules?: WorkingSchedule[];
  showScheduleSelector?: boolean;
}

// Auto-assigned priority by type: User (highest) overrides Job Position, which overrides Team (lowest)
const AUTO_PRIORITIES: Record<string, number> = {
  team: 200,
  job_position: 100,
  user: 0,
};

export function AssignmentDialog({
  open,
  onOpenChange,
  scheduleId: initialScheduleId,
  assignment,
  tt,
  schedules,
  showScheduleSelector,
}: AssignmentDialogProps) {
  const dispatch = useDispatch();
  const isEditing = !!assignment;

  // Redux state
  const { value: users } = useSelector((state: RootState) => state.users) as { value: User[] };
  const { value: teams } = useSelector((state: RootState) => state.teams) as { value: Team[] };
  const { value: jobPositions } = useSelector((state: RootState) => state.jobPositions) as { value: JobPosition[] };

  // Schedule state (for global assignments tab)
  const [selectedScheduleId, setSelectedScheduleId] = useState<number>(initialScheduleId);
  const scheduleId = showScheduleSelector ? selectedScheduleId : initialScheduleId;

  // Form state
  const [assignableType, setAssignableType] = useState<"user" | "team" | "job_position">(
    assignment?.assignable_type || "user"
  );
  const [assignableId, setAssignableId] = useState<number | null>(
    assignment?.assignable_id || null
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    assignment?.effective_from || new Date().toISOString().split("T")[0]
  );
  const [effectiveTo, setEffectiveTo] = useState<string>(assignment?.effective_to || "");
  const [isActive, setIsActive] = useState<boolean>(assignment?.is_active ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entitySearch, setEntitySearch] = useState("");

  // Reset form when dialog opens/changes
  useEffect(() => {
    if (open) {
      setAssignableType(assignment?.assignable_type || "user");
      setAssignableId(assignment?.assignable_id || null);
      setEffectiveFrom(assignment?.effective_from || new Date().toISOString().split("T")[0]);
      setEffectiveTo(assignment?.effective_to || "");
      setIsActive(assignment?.is_active ?? true);
      setEntitySearch("");
      setSelectedIds(new Set());
      setSelectedScheduleId(initialScheduleId);
    }
  }, [open, assignment]);

  // Handle type change - reset entity and update default priority
  const handleTypeChange = (type: "user" | "team" | "job_position") => {
    setAssignableType(type);
    setAssignableId(null);
    setSelectedIds(new Set());
    setEntitySearch("");
  };

  // Toggle entity in multiselect (create mode)
  const toggleEntitySelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Get filtered entity options based on type and search
  const entityOptions = useMemo(() => {
    const search = entitySearch.toLowerCase();
    switch (assignableType) {
      case "user":
        return users
          .filter((u) => {
            if (!search) return true;
            return (
              u.name?.toLowerCase().includes(search) ||
              u.email?.toLowerCase().includes(search)
            );
          })
          .slice(0, 50)
          .map((u) => ({ id: u.id, label: u.name || u.email, sublabel: u.email }));
      case "team":
        return teams
          .filter((t) => {
            if (!search) return true;
            return t.name?.toLowerCase().includes(search);
          })
          .slice(0, 50)
          .map((t) => ({ id: t.id, label: t.name, sublabel: null }));
      case "job_position":
        return jobPositions
          .filter((jp) => {
            if (!search) return true;
            return (
              jp.title?.toLowerCase().includes(search) ||
              jp.code?.toLowerCase().includes(search)
            );
          })
          .slice(0, 50)
          .map((jp) => ({ id: jp.id, label: jp.title, sublabel: jp.code }));
      default:
        return [];
    }
  }, [assignableType, users, teams, jobPositions, entitySearch]);

  // Handle submit
  const handleSubmit = async () => {
    const idsToAssign = isEditing ? (assignableId ? [assignableId] : []) : Array.from(selectedIds);

    if (idsToAssign.length === 0) {
      toast.error(tt("assignments.validation.entityRequired", "Please select an entity to assign"));
      return;
    }
    if (!effectiveFrom) {
      toast.error(tt("assignments.validation.fromRequired", "Effective from date is required"));
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && assignment) {
        const data = {
          working_schedule_id: scheduleId,
          assignable_type: assignableType,
          assignable_id: assignableId!,
          priority: AUTO_PRIORITIES[assignableType],
          effective_from: effectiveFrom,
          effective_to: effectiveTo || null,
          is_active: isActive,
        };
        await dispatch(
          genericActions.scheduleAssignments.updateAsync({
            id: assignment.id,
            updates: data,
          }) as any
        );
        toast.success(tt("assignments.updated", "Assignment updated"));
      } else {
        // Create one assignment per selected entity
        const promises = idsToAssign.map((id) =>
          dispatch(
            genericActions.scheduleAssignments.addAsync({
              working_schedule_id: scheduleId,
              assignable_type: assignableType,
              assignable_id: id,
              priority: AUTO_PRIORITIES[assignableType],
              effective_from: effectiveFrom,
              effective_to: effectiveTo || null,
              is_active: isActive,
            }) as any
          )
        );
        await Promise.all(promises);
        const count = idsToAssign.length;
        toast.success(
          count === 1
            ? tt("assignments.created", "Assignment created")
            : tt("assignments.createdMultiple", `${count} assignments created`)
        );
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(
        error.message ||
          tt("assignments.saveError", "Failed to save assignment")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeOptions = [
    { value: "user", label: tt("assignments.typeUser", "User"), icon: faUser },
    { value: "team", label: tt("assignments.typeTeam", "Team"), icon: faUsers },
    { value: "job_position", label: tt("assignments.typeJobPosition", "Job Position"), icon: faBriefcase },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? tt("assignments.editTitle", "Edit Assignment")
              : tt("assignments.createTitle", "Add Assignment")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? tt("assignments.editDescription", "Update assignment details")
              : tt("assignments.createDescription", "Assign this schedule to a user, team, or job position")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Schedule Selector (when opened from global Assignments tab) */}
          {showScheduleSelector && schedules && schedules.length > 0 && (
            <div className="space-y-2">
              <Label>{tt("assignments.schedule", "Schedule")}</Label>
              <Select
                value={String(selectedScheduleId)}
                onValueChange={(val) => setSelectedScheduleId(Number(val))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={tt("assignments.selectSchedule", "Select a schedule")} />
                </SelectTrigger>
                <SelectContent>
                  {schedules.filter(s => s.is_active).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assignable Type */}
          <div className="space-y-2">
            <Label>{tt("assignments.type", "Assignment Type")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleTypeChange(opt.value as any)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm transition-all ${
                    assignableType === opt.value
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FontAwesomeIcon icon={opt.icon} className="text-base" />
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Entity Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                {assignableType === "user"
                  ? tt("assignments.selectUser", "Select User")
                  : assignableType === "team"
                  ? tt("assignments.selectTeam", "Select Team")
                  : tt("assignments.selectPosition", "Select Job Position")}
              </Label>
              {!isEditing && selectedIds.size > 0 && (
                <span className="text-xs text-primary font-medium">
                  {selectedIds.size} {tt("assignments.selected", "selected")}
                </span>
              )}
            </div>

            {/* Search input */}
            <div className="relative">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
              />
              <Input
                placeholder={tt("assignments.searchEntity", "Search...")}
                value={entitySearch}
                onChange={(e) => setEntitySearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            {/* Entity list */}
            <div className="border border-border rounded-lg max-h-40 overflow-y-auto">
              {entityOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  {tt("assignments.noEntities", "No matching entities found")}
                </div>
              ) : (
                entityOptions.map((opt) => {
                  const isSelected = isEditing
                    ? assignableId === opt.id
                    : selectedIds.has(opt.id);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (isEditing) {
                          setAssignableId(opt.id);
                        } else {
                          toggleEntitySelection(opt.id);
                        }
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm border-b border-border last:border-b-0 transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-accent"
                      }`}
                    >
                      {/* Checkbox indicator for multiselect (create mode) */}
                      {!isEditing && (
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? "bg-primary border-primary text-white"
                              : "border-border"
                          }`}
                        >
                          {isSelected && (
                            <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                          )}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="text-xs text-muted-foreground truncate">
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                      {isEditing && isSelected && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="effectiveFrom">
                {tt("assignments.effectiveFrom", "Effective From")} *
              </Label>
              <Input
                id="effectiveFrom"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectiveTo">
                {tt("assignments.effectiveTo", "Effective To")}
              </Label>
              <Input
                id="effectiveTo"
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                min={effectiveFrom}
                className="h-8 text-sm"
                placeholder="Indefinite"
              />
              {!effectiveTo && (
                <p className="text-xs text-muted-foreground">
                  {tt("assignments.noEndDate", "Leave empty for indefinite")}
                </p>
              )}
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <Switch
              id="assignmentActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="assignmentActive" className="text-sm">
              {tt("assignments.active", "Active")}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tt("actions.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || (isEditing ? !assignableId : selectedIds.size === 0)}>
            {isSubmitting
              ? tt("actions.saving", "Saving...")
              : isEditing
              ? tt("actions.save", "Save")
              : selectedIds.size > 1
              ? `${tt("assignments.add", "Add")} ${selectedIds.size} ${tt("assignments.assignments", "Assignments")}`
              : tt("assignments.add", "Add Assignment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AssignmentDialog;
