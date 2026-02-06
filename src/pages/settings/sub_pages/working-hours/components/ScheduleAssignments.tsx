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
  faCalendar,
} from "@fortawesome/free-solid-svg-icons";
import { RootState } from "@/store/store";
import { Button } from "@/components/ui/button";
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
import { useLanguage } from "@/providers/LanguageProvider";
import { genericActions } from "@/store/genericSlices";
import toast from "react-hot-toast";
import { ScheduleAssignment } from "../types";
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

interface ScheduleAssignmentsProps {
  scheduleId: number;
  tt: (key: string, fallback: string) => string;
}

export function ScheduleAssignments({ scheduleId, tt }: ScheduleAssignmentsProps) {
  const dispatch = useDispatch();

  // Redux state
  const { value: allAssignments } = useSelector((state: RootState) => state.scheduleAssignments) as { value: ScheduleAssignment[] };
  const { value: users } = useSelector((state: RootState) => state.users) as { value: User[] };
  const { value: teams } = useSelector((state: RootState) => state.teams) as { value: Team[] };
  const { value: jobPositions } = useSelector((state: RootState) => state.jobPositions) as { value: JobPosition[] };

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ScheduleAssignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<ScheduleAssignment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter assignments for this schedule, sorted by type precedence (team -> job_position -> user)
  const TYPE_ORDER: Record<string, number> = { team: 0, job_position: 1, user: 2 };
  const assignments = useMemo(() => {
    return allAssignments
      .filter((a) => a.working_schedule_id === scheduleId)
      .sort((a, b) => (TYPE_ORDER[a.assignable_type] ?? 99) - (TYPE_ORDER[b.assignable_type] ?? 99));
  }, [allAssignments, scheduleId]);

  // Resolve assignable name from local stores
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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            {tt("assignments.title", "Assignments")}
          </h4>
          <p className="text-xs text-muted-foreground">
            {tt("assignments.description", "Assign users, teams, or job positions to this schedule")}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setIsCreateOpen(true)}>
          <FontAwesomeIcon icon={faPlus} className="mr-1.5 text-xs" />
          {tt("assignments.add", "Add")}
        </Button>
      </div>

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border rounded-lg">
          <FontAwesomeIcon icon={faUsers} className="text-2xl text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            {tt("assignments.empty", "No assignments yet")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {tt("assignments.emptyHint", "Click 'Add' to assign this schedule to users, teams, or job positions")}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_120px_60px] gap-2 px-3 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
            <div>{tt("assignments.entity", "Assigned To")}</div>
            <div className="text-center">
              <FontAwesomeIcon icon={faCalendar} className="mr-1" />
              {tt("assignments.from", "From")}
            </div>
            <div className="text-center">
              <FontAwesomeIcon icon={faCalendar} className="mr-1" />
              {tt("assignments.to", "To")}
            </div>
            <div className="text-center">{tt("assignments.actions", "")}</div>
          </div>

          {/* Rows */}
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className={`grid grid-cols-[1fr_120px_120px_60px] gap-2 px-3 py-2.5 items-center border-b border-border last:border-b-0 transition-colors ${
                assignment.is_active ? "bg-card" : "bg-muted/30 opacity-60"
              }`}
            >
              {/* Entity */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs ${
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

              {/* Effective From */}
              <div className="text-center text-sm text-muted-foreground">
                {formatDate(assignment.effective_from)}
              </div>

              {/* Effective To */}
              <div className="text-center text-sm text-muted-foreground">
                {formatDate(assignment.effective_to)}
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
      )}

      {/* Create Dialog */}
      <AssignmentDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        scheduleId={scheduleId}
        assignment={null}
        tt={tt}
      />

      {/* Edit Dialog */}
      {editingAssignment && (
        <AssignmentDialog
          open={!!editingAssignment}
          onOpenChange={(open) => !open && setEditingAssignment(null)}
          scheduleId={scheduleId}
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

export default ScheduleAssignments;
