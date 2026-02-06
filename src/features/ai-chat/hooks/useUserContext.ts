import { useMemo } from "react";
import { useAuthUser } from "@/providers/AuthProvider";
import { useTable } from "@/store/dexie";

export type PromptUserContext = {
  user?: { id?: number; name?: string; email?: string };
  teams?: Array<{ id: number; name: string }>;
  workspaces?: Array<{ id: number; name: string }>;
  workspace_statuses?: string;
};

export function useUserContext(): PromptUserContext | undefined {
  const authedUser = useAuthUser();

  // Pull from Dexie tables
  const teams = useTable('teams') as Array<{ id: number; name: string }> ?? [];
  const workspaces = useTable('workspaces') as Array<{ id: number; name: string }> ?? [];
  const statuses = useTable('statuses') as Array<{ id: number; name: string; action?: string }> ?? [];
  const categories = useTable('categories') as Array<{ id: number; workspace_id: number; status_transition_group_id: number }> ?? [];
  const statusTransitions = useTable('status_transitions') as Array<{ status_transition_group_id: number; from_status: number; to_status: number }> ?? [];
  const userTeams = useTable('user_teams') as Array<{ user_id?: number; team_id?: number }> ?? [];

  return useMemo<PromptUserContext | undefined>(() => {
    if (!authedUser) return undefined;

    const uid = Number((authedUser as any)?.id);
    const name = String((authedUser as any)?.name || "");
    const email = String((authedUser as any)?.email || "");

    const teamIdSet = new Set<number>();
    for (const ut of userTeams || []) {
      if (Number((ut as any)?.user_id) === uid) {
        const tid = Number((ut as any)?.team_id);
        if (Number.isFinite(tid)) teamIdSet.add(tid);
      }
    }

    const myTeams = (teams || [])
      .filter((t) => teamIdSet.has(Number((t as any)?.id)))
      .map((t) => ({ id: Number((t as any)?.id), name: String((t as any)?.name || "") }))
      .filter((t) => Number.isFinite(t.id) && t.name)
      .slice(0, 200);

    const visibleWorkspaces = (workspaces || [])
      .map((w) => ({ id: Number((w as any)?.id), name: String((w as any)?.name || "") }))
      .filter((w) => Number.isFinite(w.id) && w.name)
      .slice(0, 200);

    // ── Build "Statuses available by workspace" text block ──
    // 1. status ID -> status object
    const statusMap = new Map<number, { id: number; name: string; action: string }>();
    for (const s of statuses || []) {
      const id = Number((s as any)?.id);
      if (Number.isFinite(id) && (s as any)?.name) {
        statusMap.set(id, { id, name: String((s as any).name), action: String((s as any)?.action || "NONE") });
      }
    }

    // 2. workspace_id -> Set of transition group IDs (via categories)
    const wsGroupIds = new Map<number, Set<number>>();
    for (const cat of categories || []) {
      const wsId = Number((cat as any)?.workspace_id);
      const gid = Number((cat as any)?.status_transition_group_id);
      if (!Number.isFinite(wsId) || !Number.isFinite(gid)) continue;
      if (!wsGroupIds.has(wsId)) wsGroupIds.set(wsId, new Set());
      wsGroupIds.get(wsId)!.add(gid);
    }

    // 3. transition group ID -> Set of status IDs
    const groupStatusIds = new Map<number, Set<number>>();
    for (const tr of statusTransitions || []) {
      const gid = Number((tr as any)?.status_transition_group_id);
      const from = Number((tr as any)?.from_status);
      const to = Number((tr as any)?.to_status);
      if (!Number.isFinite(gid)) continue;
      if (!groupStatusIds.has(gid)) groupStatusIds.set(gid, new Set());
      if (Number.isFinite(from)) groupStatusIds.get(gid)!.add(from);
      if (Number.isFinite(to)) groupStatusIds.get(gid)!.add(to);
    }

    // 4. workspace_id -> sorted status IDs (the unique set for that workspace)
    const wsStatusIds = new Map<number, number[]>();
    for (const ws of visibleWorkspaces) {
      const ids = new Set<number>();
      const gids = wsGroupIds.get(ws.id);
      if (gids) {
        for (const gid of gids) {
          const sids = groupStatusIds.get(gid);
          if (sids) for (const sid of sids) ids.add(sid);
        }
      }
      if (ids.size > 0) wsStatusIds.set(ws.id, Array.from(ids).sort((a, b) => a - b));
    }

    // 5. Group workspaces that share the exact same status set
    const wsNameMap = new Map<number, string>();
    for (const ws of visibleWorkspaces) wsNameMap.set(ws.id, ws.name);

    const statusSetGroups = new Map<string, { wsNames: string[]; statusIds: number[] }>();
    for (const [wsId, sids] of wsStatusIds) {
      const key = sids.join(',');
      if (!statusSetGroups.has(key)) statusSetGroups.set(key, { wsNames: [], statusIds: sids });
      statusSetGroups.get(key)!.wsNames.push(wsNameMap.get(wsId) || '');
    }

    // 6. Format as readable text
    let workspaceStatusesText = '';
    if (statusSetGroups.size > 0) {
      const lines: string[] = ['Statuses available by workspace:'];
      for (const { wsNames, statusIds } of statusSetGroups.values()) {
        lines.push('');
        lines.push(wsNames.join(', ') + ':');
        for (const sid of statusIds) {
          const s = statusMap.get(sid);
          if (s) lines.push(`  - ${s.name} (id=${s.id})`);
        }
      }
      workspaceStatusesText = lines.join('\n');
    }

    return {
      user: {
        id: Number.isFinite(uid) ? uid : undefined,
        name,
        email,
      },
      teams: myTeams,
      workspaces: visibleWorkspaces,
      ...(workspaceStatusesText ? { workspace_statuses: workspaceStatusesText } : {}),
    };
  }, [authedUser, teams, workspaces, statuses, categories, statusTransitions, userTeams]);
}
