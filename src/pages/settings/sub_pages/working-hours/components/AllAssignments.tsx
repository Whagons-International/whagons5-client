import { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faUsers,
  faBriefcase,
  faPlus,
  faPen,
  faTrash,
  faSearch,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { RootState } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { genericActions } from "@/store/genericSlices";
import toast from "react-hot-toast";
import { ScheduleAssignment, WorkingSchedule } from "../types";
import { User, Team, JobPosition } from "@/store/types";
import { AssignmentDialog } from "./AssignmentDialog";

const TYPE_ICONS = {
  user: faUser,
  team: faUsers,
  job_position: faBriefcase,
} as const;

const TYPE_COLORS = {
  user: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  team: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  job_position: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
} as const;

const TYPE_LABELS = {
  user: "User",
  team: "Team",
  job_position: "Job Position",
} as const;

interface AllAssignmentsProps {
  tt: (key: string, fallback: string) => string;
}

export function AllAssignments({ tt }: AllAssignmentsProps) {
  const dispatch = useDispatch();

  // Redux state
  const { value: allAssignments } = useSelector((state: RootState) => state.scheduleAssignments) as { value: ScheduleAssignment[] };
  const { value: schedules } = useSelector((state: RootState) => state.workingSchedules) as { value: WorkingSchedule[] };
  const { value: users } = useSelector((state: RootState) => state.users) as { value: User[] };
  const { value: teams } = useSelector((state: RootState) => state.teams) as { value: Team[] };
  const { value: jobPositions } = useSelector((state: RootState) => state.jobPositions) as { value: JobPosition[] };

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [scheduleFilter, setScheduleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createScheduleId, setCreateScheduleId] = useState<number | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<ScheduleAssignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<ScheduleAssignment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resolve assignable name
  const resolveAssignableName = (type: string, id: number): string => {
    switch (type) {
      case "user": {
        const user = users.find((u) => u.id === id);
        return user?.name || user?.email || `User #${id}`;
      }
      case "team": {
        const team = teams.find((t) => t.id === id);
        return team?.name || `Team #${id}`;
      }
      case "job_position": {
        const jp = jobPositions.find((j) => j.id === id);
        return jp?.title || `Position #${id}`;
      }
      default:
        return `#${id}`;
    }
  };

  // Resolve schedule name
  const resolveScheduleName = (scheduleId: number): string => {
    const schedule = schedules.find((s) => s.id === scheduleId);
    return schedule?.name || `Schedule #${scheduleId}`;
  };

  // Filtered & sorted assignments
  const filteredAssignments = useMemo(() => {
    const search = searchQuery.toLowerCase();
    return allAssignments
      .filter((a) => {
        // Type filter
        if (typeFilter !== "all" && a.assignable_type !== typeFilter) return false;
        // Schedule filter
        if (scheduleFilter !== "all" && a.working_schedule_id !== Number(scheduleFilter)) return false;
        // Status filter
        if (statusFilter === "active" && !a.is_active) return false;
        if (statusFilter === "inactive" && a.is_active) return false;
        // Search
        if (search) {
          const name = resolveAssignableName(a.assignable_type, a.assignable_id).toLowerCase();
          const scheduleName = resolveScheduleName(a.working_schedule_id).toLowerCase();
          if (!name.includes(search) && !scheduleName.includes(search)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by schedule, then by type precedence (team -> job_position -> user)
        if (a.working_schedule_id !== b.working_schedule_id) {
          return resolveScheduleName(a.working_schedule_id).localeCompare(resolveScheduleName(b.working_schedule_id));
        }
        const TYPE_ORDER: Record<string, number> = { team: 0, job_position: 1, user: 2 };
        return (TYPE_ORDER[a.assignable_type] ?? 99) - (TYPE_ORDER[b.assignable_type] ?? 99);
      });
  }, [allAssignments, searchQuery, typeFilter, scheduleFilter, statusFilter, users, teams, jobPositions, schedules]);

  const handleDelete = async () => {
    if (!deletingAssignment) return;
    setIsSubmitting(true);
    try {
      await dispatch(genericActions.scheduleAssignments.removeAsync(deletingAssignment.id) as any);
      toast.success(tt("assignments.deleted", "Assignment removed"));
      setDeletingAssignment(null);
    } catch (error: any) {
      toast.error(error.message || tt("assignments.deleteError", "Failed to remove assignment"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return tt("assignments.indefinite", "Indefinite");
    return new Date(date).toLocaleDateString();
  };

  const hasFilters = typeFilter !== "all" || scheduleFilter !== "all" || statusFilter !== "all" || searchQuery !== "";

  // For creating from this tab, we need a schedule selected
  const handleCreateClick = () => {
    if (schedules.length === 1) {
      setCreateScheduleId(schedules[0].id);
      setIsCreateOpen(true);
    } else if (scheduleFilter !== "all") {
      setCreateScheduleId(Number(scheduleFilter));
      setIsCreateOpen(true);
    } else {
      // Default to first schedule
      setCreateScheduleId(schedules[0]?.id ?? null);
      setIsCreateOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
          />
          <Input
            placeholder={tt("assignments.searchAll", "Search by name or schedule...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Type filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tt("assignments.filterAllTypes", "All Types")}</SelectItem>
            <SelectItem value="user">
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-xs text-blue-500" />
                {tt("assignments.typeUser", "User")}
              </span>
            </SelectItem>
            <SelectItem value="team">
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faUsers} className="text-xs text-purple-500" />
                {tt("assignments.typeTeam", "Team")}
              </span>
            </SelectItem>
            <SelectItem value="job_position">
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faBriefcase} className="text-xs text-amber-500" />
                {tt("assignments.typeJobPosition", "Job Position")}
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Schedule filter */}
        <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Schedule" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tt("assignments.filterAllSchedules", "All Schedules")}</SelectItem>
            {schedules.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tt("assignments.filterAllStatus", "All")}</SelectItem>
            <SelectItem value="active">{tt("assignments.filterActive", "Active")}</SelectItem>
            <SelectItem value="inactive">{tt("assignments.filterInactive", "Inactive")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Add button */}
        <Button size="sm" onClick={handleCreateClick} disabled={schedules.length === 0}>
          <FontAwesomeIcon icon={faPlus} className="mr-1.5 text-xs" />
          {tt("assignments.add", "Add")}
        </Button>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          {filteredAssignments.length} {tt("assignments.assignmentsCount", "assignment(s)")}
          {hasFilters && ` (${allAssignments.length} ${tt("assignments.total", "total")})`}
        </span>
      </div>

      {/* Assignments Table */}
      {filteredAssignments.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <FontAwesomeIcon icon={faUsers} className="text-3xl text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? tt("assignments.noResults", "No assignments match your filters")
              : tt("assignments.empty", "No assignments yet")}
          </p>
          {!hasFilters && (
            <p className="text-xs text-muted-foreground mt-1">
              {tt("assignments.emptyHintGlobal", "Create assignments from here or from within a schedule's edit dialog")}
            </p>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_1fr_100px_100px_60px_50px] gap-2 px-3 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
            <div>{tt("assignments.entity", "Assigned To")}</div>
            <div>{tt("assignments.schedule", "Schedule")}</div>
            <div className="text-center">{tt("assignments.from", "From")}</div>
            <div className="text-center">{tt("assignments.to", "To")}</div>
            <div className="text-center">{tt("assignments.statusLabel", "Status")}</div>
            <div></div>
          </div>

          {/* Rows */}
          <div className="max-h-[500px] overflow-y-auto">
            {filteredAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className={`grid grid-cols-[1fr_1fr_100px_100px_60px_50px] gap-2 px-3 py-2.5 items-center border-b border-border last:border-b-0 transition-colors ${
                  assignment.is_active ? "bg-card hover:bg-accent/30" : "bg-muted/30 opacity-60"
                }`}
              >
                {/* Assigned To */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs flex-shrink-0 ${
                      TYPE_COLORS[assignment.assignable_type] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={TYPE_ICONS[assignment.assignable_type] || faUser}
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {resolveAssignableName(assignment.assignable_type, assignment.assignable_id)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {TYPE_LABELS[assignment.assignable_type] || assignment.assignable_type}
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div className="flex items-center gap-2 min-w-0">
                  <FontAwesomeIcon icon={faClock} className="text-xs text-orange-500 flex-shrink-0" />
                  <span className="text-sm truncate">
                    {resolveScheduleName(assignment.working_schedule_id)}
                  </span>
                </div>

                {/* From */}
                <div className="text-center text-sm text-muted-foreground">
                  {formatDate(assignment.effective_from)}
                </div>

                {/* To */}
                <div className="text-center text-sm text-muted-foreground">
                  {formatDate(assignment.effective_to)}
                </div>

                {/* Status */}
                <div className="text-center">
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    assignment.is_active
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400"
                  }`}>
                    {assignment.is_active ? tt("status.active", "Active") : tt("status.inactive", "Inactive")}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-1">
                  <button
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setEditingAssignment(assignment)}
                    title="Edit"
                  >
                    <FontAwesomeIcon icon={faPen} className="text-xs" />
                  </button>
                  <button
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    onClick={() => setDeletingAssignment(assignment)}
                    title="Delete"
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-xs" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Dialog - needs schedule selector */}
      {createScheduleId && (
        <AssignmentDialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) setCreateScheduleId(null);
          }}
          scheduleId={createScheduleId}
          assignment={null}
          tt={tt}
          schedules={schedules}
          showScheduleSelector
        />
      )}

      {/* Edit Dialog */}
      {editingAssignment && (
        <AssignmentDialog
          open={!!editingAssignment}
          onOpenChange={(open) => !open && setEditingAssignment(null)}
          scheduleId={editingAssignment.working_schedule_id}
          assignment={editingAssignment}
          tt={tt}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAssignment} onOpenChange={(open) => !open && setDeletingAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tt("assignments.deleteTitle", "Remove Assignment")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tt("assignments.deleteConfirm", "Are you sure you want to remove this assignment?")}
              {deletingAssignment && (
                <span className="font-medium">
                  {" "}
                  {resolveAssignableName(deletingAssignment.assignable_type, deletingAssignment.assignable_id)}
                  {" "}({resolveScheduleName(deletingAssignment.working_schedule_id)})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tt("actions.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? tt("actions.removing", "Removing...") : tt("actions.remove", "Remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AllAssignments;
