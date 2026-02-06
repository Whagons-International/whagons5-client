/**
 * Create KPI Card Frontend Action
 *
 * Handles the Create_Kpi tool call from the AI agent.
 * Parses a flat JSON input, maps it to the internal KpiCard shape,
 * dispatches the creation via Redux genericActions, and navigates
 * to the KPI management page so the user can see the result.
 */

import type { FrontendToolResult, SendMessageCallback, NavigateCallback } from './frontend_tools';

// ─── Color mapping (mirrors KpiCardBuilder.tsx COLOR_OPTIONS) ────────────────

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

const DEFAULT_COLOR = COLOR_MAP.blue;

// ─── Valid icon values (mirrors KpiCardBuilder.tsx ICON_OPTIONS) ─────────────

const VALID_ICONS = new Set([
  'faChartBar', 'faChartLine', 'faChartPie', 'faListCheck', 'faCheckCircle',
  'faTasks', 'faClipboardCheck', 'faClock', 'faCalendarCheck', 'faGauge',
  'faBullseye', 'faTrophy', 'faStar', 'faFire', 'faRocket',
  'faBolt', 'faUsers', 'faUserCheck', 'faHashtag', 'faPercent',
]);

const DEFAULT_ICON = 'faChartBar';

// ─── Icon alias map (handles common model mistakes) ──────────────────────────

const ICON_ALIASES: Record<string, string> = {
  // kebab-case / short names -> correct FA names
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
  'trophy': 'faTrophy',
  'star': 'faStar',
  'fire': 'faFire',
  'rocket': 'faRocket',
  'bolt': 'faBolt', 'lightning': 'faBolt',
  'users': 'faUsers', 'people': 'faUsers',
  'user-check': 'faUserCheck', 'usercheck': 'faUserCheck',
  'hashtag': 'faHashtag', 'hash': 'faHashtag',
  'percent': 'faPercent', 'percentage': 'faPercent',
  // Common model shortcuts without "fa" prefix
  'facheck': 'faCheckCircle',
};

// Color aliases — models may send "green" instead of "emerald", "red" instead of "rose", etc.
const COLOR_ALIASES: Record<string, string> = {
  green: 'emerald', verde: 'emerald',
  red: 'rose', rojo: 'rose', pink: 'rose',
  yellow: 'amber', amarillo: 'amber',
  violet: 'purple', morado: 'purple',
  cyan: 'teal',
  azul: 'blue',
  naranja: 'orange',
};

function resolveIcon(raw?: string): string {
  if (!raw) return DEFAULT_ICON;
  if (VALID_ICONS.has(raw)) return raw;
  // Try exact lowercase match first, then case-insensitive
  const alias = ICON_ALIASES[raw.toLowerCase()] || ICON_ALIASES[raw];
  if (alias) return alias;
  return DEFAULT_ICON;
}

// ─── Valid KPI types + aliases ───────────────────────────────────────────────

const VALID_TYPES = new Set(['task_count', 'task_percentage', 'trend', 'custom_query']);
const DEFAULT_TYPE = 'task_count';

// Models often send shortened or wrong type names — map them to the correct values
const TYPE_ALIASES: Record<string, string> = {
  'count': 'task_count',
  'task_count': 'task_count',
  'taskcount': 'task_count',
  'percentage': 'task_percentage',
  'task_percentage': 'task_percentage',
  'taskpercentage': 'task_percentage',
  'percent': 'task_percentage',
  'ratio': 'task_percentage',
  'trend': 'trend',
  'sparkline': 'trend',
  'custom': 'custom_query',
  'custom_query': 'custom_query',
  'customquery': 'custom_query',
};

function resolveType(raw?: string): string {
  if (!raw) return DEFAULT_TYPE;
  const resolved = TYPE_ALIASES[raw.toLowerCase()];
  if (resolved) return resolved;
  if (VALID_TYPES.has(raw)) return raw;
  return DEFAULT_TYPE;
}

// ─── Input interface (flat schema the AI model provides) ─────────────────────

export interface CreateKpiInput {
  name: string;
  type?: string;
  workspace_id?: number | null;

  // Query config (varies by type)
  status_filter_id?: number;
  numerator_status_id?: number;
  denominator_status_id?: number;
  trend_days?: number;
  custom_query_config?: Record<string, any>;

  // Display config
  icon?: string;
  color?: string;
  helper_text?: string;
}

// ─── Normalize raw input (handles camelCase, aliases, typos) ─────────────────

function normalizeRawInput(raw: Record<string, any>): CreateKpiInput {
  return {
    name: (raw.name ?? '').toString().trim(),
    type: raw.type,
    // Accept both snake_case and camelCase
    workspace_id: raw.workspace_id ?? raw.workspaceId ?? raw.workspace ?? null,
    status_filter_id: raw.status_filter_id ?? raw.statusFilterId ?? raw.statusId,
    numerator_status_id: raw.numerator_status_id ?? raw.numeratorStatusId ?? raw.numerator_id ?? raw.numeratorId,
    denominator_status_id: raw.denominator_status_id ?? raw.denominatorStatusId ?? raw.denominator_id ?? raw.denominatorId,
    trend_days: raw.trend_days ?? raw.trendDays ?? raw.days,
    custom_query_config: raw.custom_query_config ?? raw.customQueryConfig,
    icon: raw.icon,
    color: raw.color,
    helper_text: raw.helper_text ?? raw.helperText ?? raw.subtitle ?? raw.description,
  };
}

// ─── Build the KpiCard payload from flat input ──────────────────────────────

function buildKpiCardPayload(input: CreateKpiInput) {
  const type = resolveType(input.type);

  // Build query_config based on type
  let query_config: Record<string, any> = { filters: {} };

  if (type === 'task_count') {
    if (input.status_filter_id != null) {
      query_config = { filters: { status_id: [input.status_filter_id] } };
    }
  } else if (type === 'task_percentage') {
    const numerator_filters: Record<string, any> = {};
    const denominator_filters: Record<string, any> = {};
    // Use explicit numerator_status_id if provided; otherwise fall back to
    // status_filter_id (the generic "statusId" the model often sends).
    const numId = input.numerator_status_id ?? input.status_filter_id;
    if (numId != null) {
      numerator_filters.status_id = [numId];
    }
    if (input.denominator_status_id != null) {
      denominator_filters.status_id = [input.denominator_status_id];
    }
    query_config = { numerator_filters, denominator_filters };
  } else if (type === 'trend') {
    const days = input.trend_days != null ? Math.min(30, Math.max(3, input.trend_days)) : 7;
    query_config = { days };
  } else if (type === 'custom_query') {
    query_config = input.custom_query_config ?? {};
  }

  // Build display_config
  const rawColorKey = (input.color ?? 'blue').toLowerCase();
  const colorKey = COLOR_ALIASES[rawColorKey] ?? rawColorKey;
  const colorTheme = COLOR_MAP[colorKey] ?? DEFAULT_COLOR;
  const icon = resolveIcon(input.icon);

  const display_config = {
    color: colorTheme.color,
    badgeClass: colorTheme.badgeClass,
    barClass: colorTheme.barClass,
    icon,
    helperText: input.helper_text ?? '',
  };

  return {
    name: input.name,
    type,
    query_config,
    display_config,
    workspace_id: input.workspace_id ?? null,
    is_enabled: true,
  };
}

// ─── Handler for the tool_result pathway (FRONTEND_TOOL_HANDLERS) ────────────

export function handleCreateKpi(
  result: FrontendToolResult,
  sendMessage?: SendMessageCallback,
  navigate?: NavigateCallback,
): boolean {
  // Accept both "create_kpi" action and direct invocation (when called via tool registry)
  if (result.action && result.action !== 'create_kpi') {
    return false;
  }

  // The input can come as a nested `data` object or directly on the result
  const rawInput = result.data ?? result;
  const input = normalizeRawInput(rawInput);

  // Validate required field
  if (!input.name) {
    console.error('[Create_Kpi] Missing required field: name');
    if (sendMessage) {
      sendMessage('Error creating KPI card: "name" is required.');
    }
    return true; // We handled it (with an error)
  }

  const cardData = buildKpiCardPayload(input);

  console.log('[Create_Kpi] Creating KPI card:', cardData);

  // Dispatch the creation asynchronously
  store
    .dispatch(genericActions.kpiCards.addAsync(cardData) as any)
    .unwrap()
    .then(() => {
      console.log('[Create_Kpi] KPI card created successfully');

      // Navigate to the management page so the user can see the new card
      if (navigate) {
        navigate('/settings/kpi-cards/manage');
      }

      if (sendMessage) {
        sendMessage(`KPI card "${input.name}" created successfully.`);
      }
    })
    .catch((error: any) => {
      console.error('[Create_Kpi] Failed to create KPI card:', error);
      if (sendMessage) {
        const errMsg = error?.message || error?.response?.data?.message || 'Unknown error';
        sendMessage(`Failed to create KPI card: ${errMsg}`);
      }
    });

  return true;
}

// ─── Handler for the frontend_tool_prompt pathway ────────────────────────────

export async function handleCreateKpiPrompt(
  data: { tool?: string; data?: Record<string, any> },
  send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
  navigate?: (path: string) => void,
): Promise<boolean> {
  const rawInput = data?.data;

  if (!rawInput?.name || typeof rawInput.name !== 'string' || rawInput.name.trim() === '') {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing required field: name' }),
    });
    return true;
  }

  const input = normalizeRawInput(rawInput);

  const cardData = buildKpiCardPayload(input);

  console.log('[Create_Kpi] Raw input from agent:', JSON.stringify(rawInput));
  console.log('[Create_Kpi] Resolved payload:', JSON.stringify(cardData));

  try {
    const created = await store.dispatch(genericActions.kpiCards.addAsync(cardData) as any).unwrap();
    console.log('[Create_Kpi] KPI card created successfully via prompt pathway:', created);

    if (navigate) {
      navigate('/settings/kpi-cards/manage');
    }

    // Return the full created card so the model can verify what was actually created
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({
        ok: true,
        card: {
          id: created?.id,
          name: cardData.name,
          type: cardData.type,
          workspace_id: cardData.workspace_id,
          query_config: cardData.query_config,
          display_config: cardData.display_config,
          is_enabled: cardData.is_enabled,
        },
      }),
    });
  } catch (error: any) {
    const errMsg = error?.message || error?.response?.data?.message || 'Unknown error';
    console.error('[Create_Kpi] Failed:', errMsg);
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: errMsg }),
    });
  }

  return true;
}
