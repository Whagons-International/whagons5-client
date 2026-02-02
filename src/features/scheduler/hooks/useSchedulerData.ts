import { useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import type { SchedulerResource, SchedulerEvent } from "../types/scheduler";
import { parseLocalDateTime } from "../utils/dateTime";

interface User {
  id: number;
  name: string;
  email?: string;
  url_picture?: string | null;
  color?: string | null;
}

interface Team {
  id: number;
  name: string;
  color?: string | null;
}

interface UserTeam {
  id: number;
  user_id: number;
  team_id: number;
}

interface TaskUser {
  id: number;
  task_id: number;
  user_id: number;
}

interface Task {
  id: number;
  name: string;
  description?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  expected_duration?: number | null;
  user_ids?: number[];
  priority_id?: number | null;
  status_id?: number | null;
  category_id?: number | null;
  spot_id?: number | null;
  workspace_id: number;
  recurrence_id?: number | null;
  recurrence_instance_number?: number | null;
}

interface Status {
  id: number;
  name: string;
  color?: string | null;
}

interface Priority {
  id: number;
  name: string;
  color?: string | null;
}

interface Spot {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  icon?: string | null;
}

export function useSchedulerData(workspaceId: string | undefined) {
  // Fetch users, teams, and userTeams from Redux
  const users = useSelector((state: RootState) => (state.users as any)?.value ?? []) as User[];
  const teams = useSelector((state: RootState) => (state.teams as any)?.value ?? []) as Team[];
  const userTeams = useSelector((state: RootState) => (state.userTeams as any)?.value ?? []) as UserTeam[];
  const rawTasks = useSelector((state: RootState) => (state.tasks as any)?.value ?? []) as Task[];
  const taskUsers = useSelector((state: RootState) => (state.taskUsers as any)?.value ?? []) as TaskUser[];
  
  // Build user_ids from taskUsers pivot table (deduplicated, single source of truth)
  const taskUserMap = useMemo(() => {
    const map = new Map<number, Set<number>>();
    taskUsers.forEach((tu) => {
      const existing = map.get(tu.task_id);
      if (existing) existing.add(tu.user_id);
      else map.set(tu.task_id, new Set([tu.user_id]));
    });
    return map;
  }, [taskUsers]);

  // Enrich tasks with user_ids — pivot table takes priority, deduplicate tasks and user_ids
  const tasks = useMemo(() => {
    // Deduplicate tasks by id (in case Redux has duplicates from hydration + sync)
    const seen = new Set<number>();
    const unique: Task[] = [];
    for (const task of rawTasks) {
      if (seen.has(task.id)) continue;
      seen.add(task.id);
      unique.push(task);
    }
    return unique.map((task) => {
      const pivotUserIds = taskUserMap.get(task.id);
      if (pivotUserIds && pivotUserIds.size > 0) {
        return { ...task, user_ids: [...pivotUserIds] };
      }
      if (task.user_ids && task.user_ids.length > 0) {
        return { ...task, user_ids: [...new Set(task.user_ids)] };
      }
      return task;
    });
  }, [rawTasks, taskUserMap]);

  // Fetch metadata for display names
  const statuses = useSelector((state: RootState) => (state.statuses as any)?.value ?? []) as Status[];
  const priorities = useSelector((state: RootState) => (state.priorities as any)?.value ?? []) as Priority[];
  const spots = useSelector((state: RootState) => (state.spots as any)?.value ?? []) as Spot[];
  const categories = useSelector((state: RootState) => (state.categories as any)?.value ?? []) as Category[];

  // Get loading states from Redux
  const usersLoading = useSelector((state: RootState) => (state.users as any)?.loading ?? false);
  const teamsLoading = useSelector((state: RootState) => (state.teams as any)?.loading ?? false);
  const tasksLoading = useSelector((state: RootState) => (state.tasks as any)?.loading ?? false);
  const loading = usersLoading || teamsLoading || tasksLoading;
  
  // Create lookup maps for O(1) access
  const statusMap = useMemo(() => new Map(statuses.map(s => [s.id, s])), [statuses]);
  const priorityMap = useMemo(() => new Map(priorities.map(p => [p.id, p])), [priorities]);
  const spotMap = useMemo(() => new Map(spots.map(s => [s.id, s])), [spots]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Transform users to scheduler resources
  const resources = useMemo<SchedulerResource[]>(() => {
    if (!workspaceId) return [];

    const isAll = workspaceId === 'all';
    const workspaceTasks = isAll ? tasks : tasks.filter((t) => String(t.workspace_id) === workspaceId);
    const assignedUserIds = new Set<number>();
    
    workspaceTasks.forEach((task) => {
      if (task.user_ids) {
        task.user_ids.forEach((id) => assignedUserIds.add(id));
      }
    });

    // Get team info for each user
    const userTeamMap = new Map<number, Team>();
    userTeams.forEach((ut) => {
      const team = teams.find((t) => t.id === ut.team_id);
      if (team) {
        userTeamMap.set(ut.user_id, team);
      }
    });

    // Transform all users to scheduler resources
    // Filtering by selectedUserIds is done in SchedulerViewTab via displayedResources
    return users.map((user) => {
      const team = userTeamMap.get(user.id);
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.url_picture || undefined,
        teamId: team?.id,
        teamName: team?.name,
        color: user.color || undefined,
      };
    });
  }, [users, teams, userTeams, tasks, workspaceId]);

  // Transform tasks to scheduler events
  const events = useMemo<SchedulerEvent[]>(() => {
    if (!workspaceId) {
      return [];
    }

    const isAll = workspaceId === 'all';
    const workspaceTasks = isAll ? tasks : tasks.filter((t) => String(t.workspace_id) === workspaceId);
    const schedulerEvents: SchedulerEvent[] = [];
    

    workspaceTasks.forEach((task) => {
      if (!task.start_date || !task.user_ids || task.user_ids.length === 0) {
        return; // Skip tasks without start date or user assignments
      }

      const startDate = parseLocalDateTime(task.start_date);
      let endDate: Date;

      if (task.due_date) {
        endDate = parseLocalDateTime(task.due_date);
      } else if (task.expected_duration) {
        // Calculate end date from expected duration (assuming duration is in minutes)
        endDate = new Date(startDate.getTime() + task.expected_duration * 60000);
      } else {
        // Default to 1 hour if no duration specified
        endDate = new Date(startDate.getTime() + 3600000);
      }

      // Get resolved names for display
      const status = task.status_id ? statusMap.get(task.status_id) : undefined;
      const priority = task.priority_id ? priorityMap.get(task.priority_id) : undefined;
      const spot = task.spot_id ? spotMap.get(task.spot_id) : undefined;
      const category = task.category_id ? categoryMap.get(task.category_id) : undefined;

      // Create one event per user assignment
      task.user_ids.forEach((userId) => {
        const event: SchedulerEvent = {
          id: task.id * 10000 + userId, // Unique ID combining task and user
          resourceId: userId,
          name: task.name,
          startDate,
          endDate,
          color: getEventColor(task.priority_id, task.status_id, priority?.color, status?.color),
          taskId: task.id,
          priorityId: task.priority_id || undefined,
          statusId: task.status_id || undefined,
          categoryId: task.category_id || undefined,
          spotId: task.spot_id || undefined,
          // Resolved names for tooltip display
          statusName: status?.name,
          statusColor: status?.color || undefined,
          priorityName: priority?.name,
          priorityColor: priority?.color || undefined,
          spotName: spot?.name,
          categoryName: category?.name,
          categoryIcon: category?.icon || undefined,
          description: task.description || undefined,
          // Recurrence info
          recurrenceId: task.recurrence_id || undefined,
          recurrenceInstanceNumber: task.recurrence_instance_number || undefined,
          isRecurring: !!task.recurrence_id,
        };
        schedulerEvents.push(event);
      });
    });
    

    // Deduplicate events by id (safety net)
    const seenEvents = new Set<number>();
    return schedulerEvents.filter((ev) => {
      if (seenEvents.has(ev.id)) return false;
      seenEvents.add(ev.id);
      return true;
    });
  }, [tasks, workspaceId, statusMap, priorityMap, spotMap, categoryMap]);

  // Check if data is loading from Redux state
  const isLoading = useSelector((state: RootState) => {
    const tasksState = (state.tasks as any);
    const usersState = (state.users as any);
    return (tasksState?.loading === true) || (usersState?.loading === true);
  });

  return {
    resources,
    events,
    loading: isLoading ?? false,
  };
}

// Convert hex to rgba with transparency
function hexToRgba(hex: string, alpha: number): string | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return null;
  return `rgba(${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}, ${alpha})`;
}

// Helper function to get event color based on priority/status
// Returns transparent colors for a modern pastel look
function getEventColor(
  priorityId: number | null | undefined, 
  statusId: number | null | undefined,
  priorityColor?: string | null,
  statusColor?: string | null
): string | undefined {
  // Use actual priority color from DB as a transparent wash
  if (priorityColor) {
    return hexToRgba(priorityColor, 0.18) ?? undefined;
  }
  
  // Use actual status color from DB as a transparent wash
  if (statusColor) {
    return hexToRgba(statusColor, 0.18) ?? undefined;
  }
  
  // Return undefined to let the component use theme-aware defaults
  return undefined;
}
