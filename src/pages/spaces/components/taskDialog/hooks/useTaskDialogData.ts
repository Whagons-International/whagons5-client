import { useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useTable } from '@/store/dexie';

export function useTaskDialogData() {
  const categories = useTable('categories') ?? [];
  const priorities = useTable('priorities') ?? [];
  const categoryPriorityAssignments = useTable('category_priorities') ?? [];
  const statuses = useTable('statuses') ?? [];
  const statusTransitions = useTable('status_transitions') ?? [];
  const spots = useTable('spots') ?? [];
  const users = useTable('users') ?? [];
  const teams = useTable('teams') ?? [];
  const spotTypes = useTable('spot_types') ?? [];
  const workspaces = useTable('workspaces') ?? [];
  const slas = useTable('slas') ?? [];
  const approvals = useTable('approvals') ?? [];
  const templates = useTable('templates') ?? [];
  const tags = useTable('tags') ?? [];
  const taskTags = useTable('task_tags') ?? [];
  const taskUsers = useTable('task_users') ?? [];
  const customFields = useTable('custom_fields') ?? [];
  const categoryCustomFields = useTable('category_custom_fields') ?? [];
  const taskCustomFieldValues = useTable('task_custom_field_values') ?? [];
  const userTeams = useTable('user_teams') ?? [];
  
  const { user } = useAuth();

  const userTeamIds = useMemo(() => {
    if (!user?.id) return [];
    return (userTeams as any[])
      .filter((ut: any) => Number(ut.user_id) === Number(user.id))
      .map((ut: any) => Number(ut.team_id))
      .filter((id: number) => Number.isFinite(id));
  }, [user, userTeams]);

  const approvalMap = useMemo(() => {
    const map: Record<number, any> = {};
    for (const a of approvals || []) {
      const id = Number((a as any)?.id);
      if (Number.isFinite(id)) map[id] = a;
    }
    return map;
  }, [approvals]);

  const taskCustomFieldValueMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const row of taskCustomFieldValues || []) {
      const tId = Number((row as any)?.task_id ?? (row as any)?.taskId);
      const fId = Number((row as any)?.field_id ?? (row as any)?.custom_field_id ?? (row as any)?.fieldId);
      if (!Number.isFinite(tId) || !Number.isFinite(fId)) continue;
      m.set(`${tId}:${fId}`, row);
    }
    return m;
  }, [taskCustomFieldValues]);

  return {
    categories,
    priorities,
    categoryPriorityAssignments,
    statuses,
    statusTransitions,
    spots,
    users,
    teams,
    spotTypes,
    workspaces,
    slas,
    approvals,
    templates,
    tags,
    taskTags,
    taskUsers,
    customFields,
    categoryCustomFields,
    taskCustomFieldValues,
    userTeams,
    user,
    userTeamIds,
    approvalMap,
    taskCustomFieldValueMap,
  };
}
