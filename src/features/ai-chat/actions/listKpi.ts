/**
 * List KPI Cards Frontend Action
 *
 * Handles the List_Kpi tool call from the AI agent.
 * Reads KPI cards from the Redux store (already synced via IndexedDB)
 * and returns them as a JSON response. Optionally filters by workspace_id.
 */

import type { FrontendToolResult, SendMessageCallback, NavigateCallback } from './frontend_tools';

// ─── Handler for the tool_result pathway (FRONTEND_TOOL_HANDLERS) ────────────

export function handleListKpi(
  result: FrontendToolResult,
  sendMessage?: SendMessageCallback,
  _navigate?: NavigateCallback,
): boolean {
  if (result.action && result.action !== 'list_kpi') return false;

  const rawInput = result.data ?? result;
  const workspaceId = rawInput.workspace_id ?? rawInput.workspaceId ?? rawInput.workspace ?? null;

  const state = store.getState() as any;
  let cards = state.kpiCards?.value ?? [];

  if (workspaceId != null) {
    cards = cards.filter((c: any) => c.workspace_id === workspaceId || c.workspace_id === null);
  }

  const summary = cards.map((c: any) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    workspace_id: c.workspace_id,
    is_enabled: c.is_enabled,
    icon: c.display_config?.icon,
    color: c.display_config?.color,
  }));

  console.log(`[List_Kpi] Found ${summary.length} KPI card(s)`);
  if (sendMessage) sendMessage(`Found ${summary.length} KPI card(s).`);

  return true;
}

// ─── Handler for the frontend_action pathway (primary, via whagons.ts bridge) ─

export async function handleListKpiPrompt(
  data: { tool?: string; data?: Record<string, any> },
  send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
  _navigate?: (path: string) => void,
): Promise<boolean> {
  const rawInput = data?.data ?? {};
  const workspaceId = rawInput.workspace_id ?? rawInput.workspaceId ?? rawInput.workspace ?? null;

  try {
    const state = store.getState() as any;
    let cards = state.kpiCards?.value ?? [];

    if (workspaceId != null) {
      cards = cards.filter((c: any) => c.workspace_id === workspaceId || c.workspace_id === null);
    }

    // Return a summary with useful fields for the model
    const summary = cards.map((c: any) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      workspace_id: c.workspace_id,
      is_enabled: c.is_enabled,
      icon: c.display_config?.icon,
      color: c.display_config?.color,
      helper_text: c.display_config?.helperText,
    }));

    console.log(`[List_Kpi] Returning ${summary.length} KPI card(s)`);

    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: true, cards: summary }),
    });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error('[List_Kpi] Failed:', errMsg);
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: errMsg }),
    });
  }

  return true;
}
