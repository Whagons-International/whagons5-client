/**
 * Update KPI Card Frontend Action
 *
 * Handles the Update_Kpi tool call from the AI agent.
 * Parses a flat JSON input with an `id` + optional update fields,
 * merges with the existing card from Redux, dispatches the update via
 * genericActions, and navigates to the KPI management page.
 */

import type { FrontendToolResult, SendMessageCallback, NavigateCallback } from './frontend_tools';

// Re-use the same color/icon/type resolution helpers from createKpi
// (imported inline to keep this file self-contained and avoid circular deps)

const COLOR_MAP: Record<string, { color: string; badgeClass: string; barClass: string }> = {
  blue:    { color: 'text-blue-500',    badgeClass: 'bg-gradient-to-br from-blue-500 to-blue-600',    barClass: 'from-blue-500 via-blue-400 to-blue-500' },
  indigo:  { color: 'text-indigo-500',  badgeClass: 'bg-gradient-to-br from-indigo-500 to-indigo-600',  barClass: 'from-indigo-500 via-indigo-400 to-indigo-500' },
  amber:   { color: 'text-amber-500',   badgeClass: 'bg-gradient-to-br from-amber-500 to-orange-500',   barClass: 'from-amber-500 via-amber-400 to-amber-500' },
  emerald: { color: 'text-emerald-500', badgeClass: 'bg-gradient-to-br from-emerald-500 to-green-600', barClass: 'from-emerald-500 via-emerald-400 to-emerald-500' },
  purple:  { color: 'text-purple-500',  badgeClass: 'bg-gradient-to-br from-purple-500 to-violet-600',  barClass: 'from-purple-500 via-purple-400 to-purple-500' },
  rose:    { color: 'text-rose-500',    badgeClass: 'bg-gradient-to-br from-rose-500 to-pink-600',    barClass: 'from-rose-500 via-rose-400 to-rose-500' },
  teal:    { color: 'text-teal-500',    badgeClass: 'bg-gradient-to-br from-teal-500 to-cyan-600',    barClass: 'from-teal-500 via-teal-400 to-teal-500' },
  orange:  { color: 'text-orange-500',  badgeClass: 'bg-gradient-to-br from-orange-500 to-red-500',   barClass: 'from-orange-500 via-orange-400 to-orange-500' },
};

const COLOR_ALIASES: Record<string, string> = {
  green: 'emerald', verde: 'emerald',
  red: 'rose', rojo: 'rose', pink: 'rose',
  yellow: 'amber', amarillo: 'amber',
  violet: 'purple', morado: 'purple',
  cyan: 'teal',
  azul: 'blue',
  naranja: 'orange',
};

const VALID_ICONS = new Set([
  'faChartBar', 'faChartLine', 'faChartPie', 'faListCheck', 'faCheckCircle',
  'faTasks', 'faClipboardCheck', 'faClock', 'faCalendarCheck', 'faGauge',
  'faBullseye', 'faTrophy', 'faStar', 'faFire', 'faRocket',
  'faBolt', 'faUsers', 'faUserCheck', 'faHashtag', 'faPercent',
]);

const ICON_ALIASES: Record<string, string> = {
  'chart-bar': 'faChartBar', 'chartbar': 'faChartBar', 'bar-chart': 'faChartBar',
  'chart-line': 'faChartLine', 'chartline': 'faChartLine', 'line-chart': 'faChartLine',
  'chart-pie': 'faChartPie', 'chartpie': 'faChartPie', 'pie-chart': 'faChartPie',
  'list-check': 'faListCheck', 'listcheck': 'faListCheck',
  'check-circle': 'faCheckCircle', 'checkcircle': 'faCheckCircle', 'check': 'faCheckCircle',
  'tasks': 'faTasks', 'task': 'faTasks',
  'clipboard-check': 'faClipboardCheck', 'clipboardcheck': 'faClipboardCheck',
  'clock': 'faClock',
  'calendar-check': 'faCalendarCheck', 'calendarcheck': 'faCalendarCheck',
  'gauge': 'faGauge', 'speedometer': 'faGauge',
  'bullseye': 'faBullseye', 'target': 'faBullseye',
  'trophy': 'faTrophy', 'star': 'faStar', 'fire': 'faFire',
  'rocket': 'faRocket', 'bolt': 'faBolt', 'lightning': 'faBolt',
  'users': 'faUsers', 'people': 'faUsers',
  'user-check': 'faUserCheck', 'usercheck': 'faUserCheck',
  'hashtag': 'faHashtag', 'hash': 'faHashtag',
  'percent': 'faPercent', 'percentage': 'faPercent',
  'facheck': 'faCheckCircle',
};

const VALID_TYPES = new Set(['task_count', 'task_percentage', 'trend', 'custom_query']);
const TYPE_ALIASES: Record<string, string> = {
  'count': 'task_count', 'task_count': 'task_count', 'taskcount': 'task_count',
  'percentage': 'task_percentage', 'task_percentage': 'task_percentage', 'taskpercentage': 'task_percentage',
  'percent': 'task_percentage', 'ratio': 'task_percentage',
  'trend': 'trend', 'sparkline': 'trend',
  'custom': 'custom_query', 'custom_query': 'custom_query', 'customquery': 'custom_query',
};

function resolveIcon(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (VALID_ICONS.has(raw)) return raw;
  const alias = ICON_ALIASES[raw.toLowerCase()] || ICON_ALIASES[raw];
  if (alias) return alias;
  return undefined; // Don't default — keep existing icon if unrecognized
}

function resolveType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const resolved = TYPE_ALIASES[raw.toLowerCase()];
  if (resolved) return resolved;
  if (VALID_TYPES.has(raw)) return raw;
  return undefined;
}

function resolveColor(raw?: string): string | undefined {
  if (!raw) return undefined;
  const key = raw.toLowerCase();
  const aliased = COLOR_ALIASES[key] ?? key;
  return COLOR_MAP[aliased] ? aliased : undefined;
}

// ─── Input normalization ─────────────────────────────────────────────────────

export interface UpdateKpiInput {
  id: number;
  name?: string;
  type?: string;
  workspace_id?: number | null;
  status_filter_id?: number;
  numerator_status_id?: number;
  denominator_status_id?: number;
  trend_days?: number;
  custom_query_config?: Record<string, any>;
  icon?: string;
  color?: string;
  helper_text?: string;
  is_enabled?: boolean;
}

function normalizeRawInput(raw: Record<string, any>): UpdateKpiInput {
  const id = raw.id ?? raw.kpi_id ?? raw.kpiId ?? raw.card_id ?? raw.cardId;
  return {
    id: typeof id === 'number' ? id : parseInt(id, 10),
    name: raw.name !== undefined ? (raw.name ?? '').toString().trim() : undefined,
    type: raw.type,
    workspace_id: raw.workspace_id ?? raw.workspaceId ?? raw.workspace,
    status_filter_id: raw.status_filter_id ?? raw.statusFilterId ?? raw.statusId,
    numerator_status_id: raw.numerator_status_id ?? raw.numeratorStatusId ?? raw.numerator_id ?? raw.numeratorId,
    denominator_status_id: raw.denominator_status_id ?? raw.denominatorStatusId ?? raw.denominator_id ?? raw.denominatorId,
    trend_days: raw.trend_days ?? raw.trendDays ?? raw.days,
    custom_query_config: raw.custom_query_config ?? raw.customQueryConfig,
    icon: raw.icon,
    color: raw.color,
    helper_text: raw.helper_text ?? raw.helperText ?? raw.subtitle ?? raw.description,
    is_enabled: raw.is_enabled ?? raw.isEnabled ?? raw.enabled,
  };
}

// ─── Build update payload (merges with existing card) ────────────────────────

function buildUpdatePayload(input: UpdateKpiInput, existingCard: any) {
  const updates: Record<string, any> = {};

  if (input.name !== undefined) updates.name = input.name;

  // Resolve type
  const newType = resolveType(input.type);
  const effectiveType = newType ?? existingCard?.type ?? 'task_count';
  if (newType !== undefined) updates.type = newType;

  // Rebuild query_config if any query-related fields changed
  const hasQueryUpdate = input.status_filter_id !== undefined ||
    input.numerator_status_id !== undefined ||
    input.denominator_status_id !== undefined ||
    input.trend_days !== undefined ||
    input.custom_query_config !== undefined ||
    newType !== undefined;

  if (hasQueryUpdate) {
    let query_config: Record<string, any> = existingCard?.query_config ?? { filters: {} };

    if (effectiveType === 'task_count') {
      if (input.status_filter_id != null) {
        query_config = { filters: { status_id: [input.status_filter_id] } };
      }
    } else if (effectiveType === 'task_percentage') {
      const numerator_filters: Record<string, any> = {};
      const denominator_filters: Record<string, any> = {};
      const numId = input.numerator_status_id ?? input.status_filter_id;
      if (numId != null) numerator_filters.status_id = [numId];
      if (input.denominator_status_id != null) denominator_filters.status_id = [input.denominator_status_id];
      query_config = { numerator_filters, denominator_filters };
    } else if (effectiveType === 'trend') {
      const days = input.trend_days != null ? Math.min(30, Math.max(3, input.trend_days)) : (existingCard?.query_config?.days ?? 7);
      query_config = { days };
    } else if (effectiveType === 'custom_query') {
      query_config = input.custom_query_config ?? existingCard?.query_config ?? {};
    }

    updates.query_config = query_config;
  }

  // Rebuild display_config if any display fields changed
  const hasDisplayUpdate = input.icon !== undefined || input.color !== undefined || input.helper_text !== undefined;
  if (hasDisplayUpdate) {
    const existingDisplay = existingCard?.display_config ?? {};
    const display_config = { ...existingDisplay };

    const resolvedColor = resolveColor(input.color);
    if (resolvedColor) {
      const colorTheme = COLOR_MAP[resolvedColor];
      display_config.color = colorTheme.color;
      display_config.badgeClass = colorTheme.badgeClass;
      display_config.barClass = colorTheme.barClass;
    }

    const resolvedIcon = resolveIcon(input.icon);
    if (resolvedIcon) {
      display_config.icon = resolvedIcon;
    }

    if (input.helper_text !== undefined) {
      display_config.helperText = input.helper_text;
    }

    updates.display_config = display_config;
  }

  if (input.workspace_id !== undefined) updates.workspace_id = input.workspace_id;
  if (input.is_enabled !== undefined) updates.is_enabled = input.is_enabled;

  return updates;
}

// ─── Handler for the tool_result pathway (FRONTEND_TOOL_HANDLERS) ────────────

export function handleUpdateKpi(
  result: FrontendToolResult,
  sendMessage?: SendMessageCallback,
  navigate?: NavigateCallback,
): boolean {
  if (result.action && result.action !== 'update_kpi') return false;

  const rawInput = result.data ?? result;
  const input = normalizeRawInput(rawInput);

  if (!input.id || isNaN(input.id)) {
    console.error('[Update_Kpi] Missing required field: id');
    if (sendMessage) sendMessage('Error updating KPI card: "id" is required.');
    return true;
  }

  // Look up existing card from Redux store
  const state = store.getState() as any;
  const kpiCards = state.kpiCards?.value ?? [];
  const existingCard = kpiCards.find((c: any) => c.id === input.id);

  if (!existingCard) {
    console.error(`[Update_Kpi] KPI card #${input.id} not found`);
    if (sendMessage) sendMessage(`Error: KPI card #${input.id} not found.`);
    return true;
  }

  const updates = buildUpdatePayload(input, existingCard);
  console.log('[Update_Kpi] Updating KPI card:', { id: input.id, updates });

  store
    .dispatch(genericActions.kpiCards.updateAsync({ id: input.id, updates }) as any)
    .unwrap()
    .then(() => {
      console.log('[Update_Kpi] KPI card updated successfully');
      if (navigate) navigate('/settings/kpi-cards/manage');
      if (sendMessage) sendMessage(`KPI card #${input.id} updated successfully.`);
    })
    .catch((error: any) => {
      console.error('[Update_Kpi] Failed to update KPI card:', error);
      if (sendMessage) {
        const errMsg = error?.message || error?.response?.data?.message || 'Unknown error';
        sendMessage(`Failed to update KPI card: ${errMsg}`);
      }
    });

  return true;
}

// ─── Handler for the frontend_action pathway (primary, via whagons.ts bridge) ─

export async function handleUpdateKpiPrompt(
  data: { tool?: string; data?: Record<string, any> },
  send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
  navigate?: (path: string) => void,
): Promise<boolean> {
  const rawInput = data?.data;

  if (!rawInput?.id) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing required field: id' }),
    });
    return true;
  }

  const input = normalizeRawInput(rawInput);

  if (isNaN(input.id)) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'id must be a valid number' }),
    });
    return true;
  }

  // Look up existing card from Redux store
  const state = store.getState() as any;
  const kpiCards = state.kpiCards?.value ?? [];
  const existingCard = kpiCards.find((c: any) => c.id === input.id);

  if (!existingCard) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: `KPI card #${input.id} not found` }),
    });
    return true;
  }

  const updates = buildUpdatePayload(input, existingCard);

  console.log('[Update_Kpi] Raw input from agent:', JSON.stringify(rawInput));
  console.log('[Update_Kpi] Resolved updates:', JSON.stringify(updates));

  try {
    const updated = await store.dispatch(genericActions.kpiCards.updateAsync({ id: input.id, updates }) as any).unwrap();
    console.log('[Update_Kpi] KPI card updated successfully via prompt pathway:', updated);

    if (navigate) navigate('/settings/kpi-cards/manage');

    // Return the full updated card so the model can verify
    const resultCard = { ...existingCard, ...updates, id: input.id };
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({
        ok: true,
        card: {
          id: resultCard.id,
          name: resultCard.name,
          type: resultCard.type,
          workspace_id: resultCard.workspace_id,
          query_config: resultCard.query_config,
          display_config: resultCard.display_config,
          is_enabled: resultCard.is_enabled,
        },
      }),
    });
  } catch (error: any) {
    const errMsg = error?.message || error?.response?.data?.message || 'Unknown error';
    console.error('[Update_Kpi] Failed:', errMsg);
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: errMsg }),
    });
  }

  return true;
}
