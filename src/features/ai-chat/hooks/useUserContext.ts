import { useMemo } from "react";
import { useAuthUser } from "@/providers/AuthProvider";
import { useSelector, shallowEqual } from "react-redux";
import type { RootState } from "@/store/store";

export type PromptUserContext = {
  user?: { id?: number; name?: string; email?: string };
  teams?: Array<{ id: number; name: string }>;
  workspaces?: Array<{ id: number; name: string }>;
};

export function useUserContext(): PromptUserContext | undefined {
  const authedUser = useAuthUser();

  // Pull from Redux store (populated during AuthProvider hydration)
  const teams = useSelector(
    (state: RootState) => (((state as any)?.teams?.value ?? []) as Array<{ id: number; name: string }>),
    shallowEqual
  );
  const workspaces = useSelector(
    (state: RootState) => (((state as any)?.workspaces?.value ?? []) as Array<{ id: number; name: string }>),
    shallowEqual
  );
  const userTeams = useSelector(
    (state: RootState) => (((state as any)?.userTeams?.value ?? []) as Array<{ user_id?: number; team_id?: number }>),
    shallowEqual
  );

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

    return {
      user: {
        id: Number.isFinite(uid) ? uid : undefined,
        name,
        email,
      },
      teams: myTeams,
      workspaces: visibleWorkspaces,
    };
  }, [authedUser, teams, workspaces, userTeams]);
}
