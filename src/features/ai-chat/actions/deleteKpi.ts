/**
 * Delete KPI Card Frontend Action
 *
 * Handles the Delete_Kpi tool call from the AI agent.
 * Takes a card `id`, dispatches removal via genericActions.kpiCards.removeAsync.
 */

import type { FrontendToolResult, SendMessageCallback, NavigateCallback } from './frontend_tools';

import { Logger } from '@/utils/logger';
// ─── Input normalization ─────────────────────────────────────────────────────

function normalizeId(raw: Record<string, any>): number | null {
  const id = raw.id ?? raw.kpi_id ?? raw.kpiId ?? raw.card_id ?? raw.cardId;
  if (id == null) return null;
  const num = typeof id === 'number' ? id : parseInt(id, 10);
  return isNaN(num) ? null : num;
}

// ─── Handler for the tool_result pathway (FRONTEND_TOOL_HANDLERS) ────────────

export function handleDeleteKpi(
  result: FrontendToolResult,
  sendMessage?: SendMessageCallback,
  navigate?: NavigateCallback,
): boolean {
  if (result.action && result.action !== 'delete_kpi') return false;

  const rawInput = result.data ?? result;
  const id = normalizeId(rawInput);

  if (!id) {
    Logger.error('assistant', '[Delete_Kpi] Missing required field: id');
    if (sendMessage) sendMessage('Error deleting KPI card: "id" is required.');
    return true;
  }

  // Verify card exists
  const state = store.getState() as any;
  const kpiCards = state.kpiCards?.value ?? [];
  const existingCard = kpiCards.find((c: any) => c.id === id);

  if (!existingCard) {
    Logger.error('assistant', `[Delete_Kpi] KPI card #${id} not found`);
    if (sendMessage) sendMessage(`Error: KPI card #${id} not found.`);
    return true;
  }

  Logger.info('assistant', `[Delete_Kpi] Deleting KPI card #${id}: "${existingCard.name}"`);

  store
    .dispatch(genericActions.kpiCards.removeAsync(id) as any)
    .unwrap()
    .then(() => {
      Logger.info('assistant', '[Delete_Kpi] KPI card deleted successfully');
      if (navigate) navigate('/settings/kpi-cards/manage');
      if (sendMessage) sendMessage(`KPI card "${existingCard.name}" deleted successfully.`);
    })
    .catch((error: any) => {
      Logger.error('assistant', '[Delete_Kpi] Failed to delete KPI card:', error);
      if (sendMessage) {
        const errMsg = error?.message || error?.response?.data?.message || 'Unknown error';
        sendMessage(`Failed to delete KPI card: ${errMsg}`);
      }
    });

  return true;
}

// ─── Handler for the frontend_action pathway (primary, via whagons.ts bridge) ─

export async function handleDeleteKpiPrompt(
  data: { tool?: string; data?: Record<string, any> },
  send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
  navigate?: (path: string) => void,
): Promise<boolean> {
  const rawInput = data?.data;

  if (!rawInput) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing data payload' }),
    });
    return true;
  }

  const id = normalizeId(rawInput);

  if (!id) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing required field: id (must be a number)' }),
    });
    return true;
  }

  // Verify card exists
  const state = store.getState() as any;
  const kpiCards = state.kpiCards?.value ?? [];
  const existingCard = kpiCards.find((c: any) => c.id === id);

  if (!existingCard) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: `KPI card #${id} not found` }),
    });
    return true;
  }

  Logger.info('assistant', `[Delete_Kpi] Deleting KPI card #${id}: "${existingCard.name}"`);

  try {
    await store.dispatch(genericActions.kpiCards.removeAsync(id) as any).unwrap();
    Logger.info('assistant', '[Delete_Kpi] KPI card deleted successfully via prompt pathway');

    if (navigate) navigate('/settings/kpi-cards/manage');

    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({
        ok: true,
        deleted: { id, name: existingCard.name },
      }),
    });
  } catch (error: any) {
    const errMsg = error?.message || error?.response?.data?.message || 'Unknown error';
    Logger.error('assistant', '[Delete_Kpi] Failed:', errMsg);
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: errMsg }),
    });
  }

  return true;
}
