/**
 * Generic CRUD Action Factory
 *
 * Eliminates boilerplate for entity management actions from the AI assistant.
 * Generates both tool_result and prompt pathway handlers for any entity that
 * uses `genericActions` from the generic slice system.
 *
 * Each entity config produces 8 handlers:
 *   handleCreate / handleCreatePrompt
 *   handleUpdate / handleUpdatePrompt
 *   handleDelete / handleDeletePrompt
 *   handleList   / handleListPrompt
 */

import type { FrontendToolResult, SendMessageCallback, NavigateCallback } from './frontend_tools';
import { store } from '@/store/store';
import { genericActions } from '@/store/genericSlices';
import { Logger } from '@/utils/logger';

// ─── Config interface ────────────────────────────────────────────────────────

export interface EntityActionConfig {
  /** The entity name as it appears in genericActions (e.g., 'categories', 'statuses') */
  sliceName: string;
  /** Human-readable label for logs/messages (e.g., 'category', 'status') */
  label: string;
  /** Required fields for creation (validated before dispatch) */
  requiredFields?: string[];
  /** Optional navigation path after create/update */
  navigateTo?: string;
}

// ─── Return type ─────────────────────────────────────────────────────────────

export interface GenericCrudHandlers {
  handleCreate: (result: FrontendToolResult, sendMessage?: SendMessageCallback, navigate?: NavigateCallback) => boolean;
  handleCreatePrompt: (
    data: { tool?: string; data?: Record<string, any> },
    send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
    navigate?: (path: string) => void,
  ) => Promise<boolean>;
  handleUpdate: (result: FrontendToolResult, sendMessage?: SendMessageCallback, navigate?: NavigateCallback) => boolean;
  handleUpdatePrompt: (
    data: { tool?: string; data?: Record<string, any> },
    send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
    navigate?: (path: string) => void,
  ) => Promise<boolean>;
  handleDelete: (result: FrontendToolResult, sendMessage?: SendMessageCallback, navigate?: NavigateCallback) => boolean;
  handleDeletePrompt: (
    data: { tool?: string; data?: Record<string, any> },
    send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
    navigate?: (path: string) => void,
  ) => Promise<boolean>;
  handleList: (result: FrontendToolResult, sendMessage?: SendMessageCallback, navigate?: NavigateCallback) => boolean;
  handleListPrompt: (
    data: { tool?: string; data?: Record<string, any> },
    send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
    navigate?: (path: string) => void,
  ) => Promise<boolean>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert camelCase sliceName to snake_case action name (e.g., 'spotTypes' -> 'spot_types') */
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/** Normalize a numeric ID from various input shapes */
function normalizeId(raw: Record<string, any>): number | null {
  const val = raw.id;
  if (val == null) return null;
  const num = typeof val === 'number' ? val : parseInt(val, 10);
  return isNaN(num) ? null : num;
}

/** Extract error message from various error shapes */
function extractError(error: any): string {
  return error?.response?.data?.message || error?.message || 'Unknown error';
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createGenericCrudHandlers(config: EntityActionConfig): GenericCrudHandlers {
  const { sliceName, label, requiredFields = [], navigateTo } = config;
  const snakeName = toSnakeCase(sliceName);
  const TAG = `[Generic_${label}]`;

  // Access the slice actions dynamically
  const actions = (genericActions as any)[sliceName];

  // ─── CREATE (tool_result pathway) ──────────────────────────────────────────

  function handleCreate(
    result: FrontendToolResult,
    sendMessage?: SendMessageCallback,
    navigate?: NavigateCallback,
  ): boolean {
    if (result.action && result.action !== `create_${snakeName}`) return false;

    const rawInput = result.data ?? result;

    // Validate required fields
    for (const field of requiredFields) {
      if (rawInput[field] == null || rawInput[field] === '') {
        Logger.error('assistant', `${TAG} Missing required field: ${field}`);
        if (sendMessage) sendMessage(`Error creating ${label}: "${field}" is required.`);
        return true;
      }
    }

    Logger.info('assistant', `${TAG} Creating ${label}:`, rawInput);

    store
      .dispatch(actions.addAsync(rawInput) as any)
      .unwrap()
      .then((created: any) => {
        Logger.info('assistant', `${TAG} ${label} created successfully:`, created?.id);
        if (navigateTo && navigate) navigate(navigateTo);
        if (sendMessage) sendMessage(`${label} created successfully.`);
      })
      .catch((error: any) => {
        Logger.error('assistant', `${TAG} Failed to create ${label}:`, error);
        if (sendMessage) sendMessage(`Failed to create ${label}: ${extractError(error)}`);
      });

    return true;
  }

  // ─── CREATE (prompt pathway) ───────────────────────────────────────────────

  async function handleCreatePrompt(
    data: { tool?: string; data?: Record<string, any> },
    send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
    navigate?: (path: string) => void,
  ): Promise<boolean> {
    const rawInput = data?.data;

    // Validate required fields
    for (const field of requiredFields) {
      if (!rawInput || rawInput[field] == null || rawInput[field] === '') {
        send({
          type: 'frontend_tool_response',
          tool: data?.tool,
          response: JSON.stringify({ ok: false, error: `Missing required field: ${field}` }),
        });
        return true;
      }
    }

    Logger.info('assistant', `${TAG} Raw input from agent:`, JSON.stringify(rawInput));

    try {
      const created = await store.dispatch(actions.addAsync(rawInput) as any).unwrap();
      Logger.info('assistant', `${TAG} ${label} created successfully via prompt pathway:`, created?.id);

      if (navigateTo && navigate) navigate(navigateTo);

      send({
        type: 'frontend_tool_response',
        tool: data?.tool,
        response: JSON.stringify({ ok: true, item: created ?? rawInput }),
      });
    } catch (error: any) {
      const errMsg = extractError(error);
      Logger.error('assistant', `${TAG} Failed:`, errMsg);
      send({
        type: 'frontend_tool_response',
        tool: data?.tool,
        response: JSON.stringify({ ok: false, error: errMsg }),
      });
    }

    return true;
  }

  // ─── UPDATE (tool_result pathway) ──────────────────────────────────────────

  function handleUpdate(
    result: FrontendToolResult,
    sendMessage?: SendMessageCallback,
    navigate?: NavigateCallback,
  ): boolean {
    if (result.action && result.action !== `update_${snakeName}`) return false;

    const rawInput = result.data ?? result;
    const id = normalizeId(rawInput);

    if (!id) {
      Logger.error('assistant', `${TAG} Missing required field: id`);
      if (sendMessage) sendMessage(`Error updating ${label}: "id" is required.`);
      return true;
    }

    const { id: _id, ...updates } = rawInput;
    Logger.info('assistant', `${TAG} Updating ${label}:`, { id, updates });

    store
      .dispatch(actions.updateAsync({ id, updates }) as any)
      .unwrap()
      .then(() => {
        Logger.info('assistant', `${TAG} ${label} updated successfully`);
        if (navigateTo && navigate) navigate(navigateTo);
        if (sendMessage) sendMessage(`${label} #${id} updated successfully.`);
      })
      .catch((error: any) => {
        Logger.error('assistant', `${TAG} Failed to update ${label}:`, error);
        if (sendMessage) sendMessage(`Failed to update ${label}: ${extractError(error)}`);
      });

    return true;
  }

  // ─── UPDATE (prompt pathway) ───────────────────────────────────────────────

  async function handleUpdatePrompt(
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

    const id = normalizeId(rawInput);

    if (!id) {
      send({
        type: 'frontend_tool_response',
        tool: data?.tool,
        response: JSON.stringify({ ok: false, error: 'id must be a valid number' }),
      });
      return true;
    }

    const { id: _id, ...updates } = rawInput;

    Logger.info('assistant', `${TAG} Raw input from agent:`, JSON.stringify(rawInput));
    Logger.info('assistant', `${TAG} Resolved updates:`, JSON.stringify(updates));

    try {
      const updated = await store.dispatch(actions.updateAsync({ id, updates }) as any).unwrap();
      Logger.info('assistant', `${TAG} ${label} updated successfully via prompt pathway`);

      if (navigateTo && navigate) navigate(navigateTo);

      send({
        type: 'frontend_tool_response',
        tool: data?.tool,
        response: JSON.stringify({ ok: true, item: updated ?? { id, ...updates } }),
      });
    } catch (error: any) {
      const errMsg = extractError(error);
      Logger.error('assistant', `${TAG} Failed:`, errMsg);
      send({
        type: 'frontend_tool_response',
        tool: data?.tool,
        response: JSON.stringify({ ok: false, error: errMsg }),
      });
    }

    return true;
  }

  // ─── DELETE (tool_result pathway) ──────────────────────────────────────────

  function handleDelete(
    result: FrontendToolResult,
    sendMessage?: SendMessageCallback,
    navigate?: NavigateCallback,
  ): boolean {
    if (result.action && result.action !== `delete_${snakeName}`) return false;

    const rawInput = result.data ?? result;
    const id = normalizeId(rawInput);

    if (!id) {
      Logger.error('assistant', `${TAG} Missing required field: id`);
      if (sendMessage) sendMessage(`Error deleting ${label}: "id" is required.`);
      return true;
    }

    Logger.info('assistant', `${TAG} Deleting ${label} #${id}`);

    store
      .dispatch(actions.removeAsync(id) as any)
      .unwrap()
      .then(() => {
        Logger.info('assistant', `${TAG} ${label} deleted successfully`);
        if (navigateTo && navigate) navigate(navigateTo);
        if (sendMessage) sendMessage(`${label} #${id} deleted successfully.`);
      })
      .catch((error: any) => {
        Logger.error('assistant', `${TAG} Failed to delete ${label}:`, error);
        if (sendMessage) sendMessage(`Failed to delete ${label}: ${extractError(error)}`);
      });

    return true;
  }

  // ─── DELETE (prompt pathway) ───────────────────────────────────────────────

  async function handleDeletePrompt(
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

    Logger.info('assistant', `${TAG} Deleting ${label} #${id}`);

    try {
      await store.dispatch(actions.removeAsync(id) as any).unwrap();
      Logger.info('assistant', `${TAG} ${label} deleted successfully via prompt pathway`);

      if (navigateTo && navigate) navigate(navigateTo);

      send({
        type: 'frontend_tool_response',
        tool: data?.tool,
        response: JSON.stringify({ ok: true, deleted: { id } }),
      });
    } catch (error: any) {
      const errMsg = extractError(error);
      Logger.error('assistant', `${TAG} Failed:`, errMsg);
      send({
        type: 'frontend_tool_response',
        tool: data?.tool,
        response: JSON.stringify({ ok: false, error: errMsg }),
      });
    }

    return true;
  }

  // ─── LIST (tool_result pathway) ────────────────────────────────────────────

  function handleList(
    result: FrontendToolResult,
    sendMessage?: SendMessageCallback,
    _navigate?: NavigateCallback,
  ): boolean {
    if (result.action && result.action !== `list_${snakeName}`) return false;

    const rawInput = result.data ?? result;
    const workspaceId = rawInput.workspace_id ?? rawInput.workspaceId ?? rawInput.workspace ?? null;

    const state = store.getState() as any;
    let items = state[sliceName]?.value ?? [];

    if (workspaceId != null) {
      items = items.filter((item: any) => item.workspace_id === workspaceId || item.workspace_id === null);
    }

    Logger.info('assistant', `${TAG} Found ${items.length} ${label}(s)`);
    if (sendMessage) sendMessage(`Found ${items.length} ${label}(s).`);

    return true;
  }

  // ─── LIST (prompt pathway) ─────────────────────────────────────────────────

  async function handleListPrompt(
    data: { tool?: string; data?: Record<string, any> },
    send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
    _navigate?: (path: string) => void,
  ): Promise<boolean> {
    const rawInput = data?.data ?? {};
    const workspaceId = rawInput.workspace_id ?? rawInput.workspaceId ?? rawInput.workspace ?? null;

    try {
      const state = store.getState() as any;
      let items = state[sliceName]?.value ?? [];

      if (workspaceId != null) {
        items = items.filter((item: any) => item.workspace_id === workspaceId || item.workspace_id === null);
      }

      Logger.info('assistant', `${TAG} Returning ${items.length} ${label}(s)`);

      send({
        type: 'frontend_tool_response',
        tool: data?.tool,
        response: JSON.stringify({ ok: true, items, count: items.length }),
      });
    } catch (error: any) {
      const errMsg = extractError(error);
      Logger.error('assistant', `${TAG} Failed:`, errMsg);
      send({
        type: 'frontend_tool_response',
        tool: data?.tool,
        response: JSON.stringify({ ok: false, error: errMsg }),
      });
    }

    return true;
  }

  return {
    handleCreate,
    handleCreatePrompt,
    handleUpdate,
    handleUpdatePrompt,
    handleDelete,
    handleDeletePrompt,
    handleList,
    handleListPrompt,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Entity Registrations
// ═════════════════════════════════════════════════════════════════════════════

// Settings entities
export const categoryActions = createGenericCrudHandlers({ sliceName: 'categories', label: 'category', requiredFields: ['name'], navigateTo: '/settings/categories' });
export const statusActions = createGenericCrudHandlers({ sliceName: 'statuses', label: 'status', requiredFields: ['name', 'category_id'], navigateTo: '/settings/statuses' });
export const priorityActions = createGenericCrudHandlers({ sliceName: 'priorities', label: 'priority', requiredFields: ['name'], navigateTo: '/settings/priorities' });
export const tagActions = createGenericCrudHandlers({ sliceName: 'tags', label: 'tag', requiredFields: ['name'] });
export const spotActions = createGenericCrudHandlers({ sliceName: 'spots', label: 'spot', requiredFields: ['name'] });
export const spotTypeActions = createGenericCrudHandlers({ sliceName: 'spotTypes', label: 'spot type', requiredFields: ['name'] });
export const templateActions = createGenericCrudHandlers({ sliceName: 'templates', label: 'template', requiredFields: ['name'] });
export const customFieldActions = createGenericCrudHandlers({ sliceName: 'customFields', label: 'custom field', requiredFields: ['name', 'type'] });

// Teams & Users
export const teamActions = createGenericCrudHandlers({ sliceName: 'teams', label: 'team', requiredFields: ['name'] });
export const userActions = createGenericCrudHandlers({ sliceName: 'users', label: 'user', requiredFields: ['email'] });
export const userTeamActions = createGenericCrudHandlers({ sliceName: 'userTeams', label: 'user team assignment', requiredFields: ['user_id', 'team_id'] });
export const invitationActions = createGenericCrudHandlers({ sliceName: 'invitations', label: 'invitation', requiredFields: ['email'] });

// Workspaces
export const workspaceActions = createGenericCrudHandlers({ sliceName: 'workspaces', label: 'workspace', requiredFields: ['name'] });

// SLAs
export const slaActions = createGenericCrudHandlers({ sliceName: 'slas', label: 'SLA', requiredFields: ['name'] });
export const slaPolicyActions = createGenericCrudHandlers({ sliceName: 'slaPolicies', label: 'SLA policy', requiredFields: ['sla_id'] });
export const slaAlertActions = createGenericCrudHandlers({ sliceName: 'slaAlerts', label: 'SLA alert', requiredFields: ['sla_id'] });
export const slaEscalationActions = createGenericCrudHandlers({ sliceName: 'slaEscalationLevels', label: 'SLA escalation level', requiredFields: ['sla_id'] });

// Approvals & Workflows
export const approvalActions = createGenericCrudHandlers({ sliceName: 'approvals', label: 'approval', requiredFields: ['name'] });
export const approvalApproverActions = createGenericCrudHandlers({ sliceName: 'approvalApprovers', label: 'approval approver', requiredFields: ['approval_id', 'user_id'] });
export const workflowActions = createGenericCrudHandlers({ sliceName: 'workflows', label: 'workflow', requiredFields: ['name'] });

// Forms
export const formActions = createGenericCrudHandlers({ sliceName: 'forms', label: 'form', requiredFields: ['name'] });
export const formFieldActions = createGenericCrudHandlers({ sliceName: 'formFields', label: 'form field', requiredFields: ['form_id', 'name', 'type'] });

// Boards
export const boardActions = createGenericCrudHandlers({ sliceName: 'boards', label: 'board', requiredFields: ['name'] });
export const boardMemberActions = createGenericCrudHandlers({ sliceName: 'boardMembers', label: 'board member', requiredFields: ['board_id', 'user_id'] });
export const boardMessageActions = createGenericCrudHandlers({ sliceName: 'boardMessages', label: 'board message', requiredFields: ['board_id', 'content'] });

// Broadcasts
export const broadcastActions = createGenericCrudHandlers({ sliceName: 'broadcasts', label: 'broadcast', requiredFields: ['title', 'content'] });

// Plugins
export const pluginActions = createGenericCrudHandlers({ sliceName: 'plugins', label: 'plugin' });

// Status Transitions
export const statusTransitionActions = createGenericCrudHandlers({ sliceName: 'statusTransitions', label: 'status transition', requiredFields: ['from_status_id', 'to_status_id'] });

// Asset Management
export const assetTypeActions = createGenericCrudHandlers({ sliceName: 'assetTypes', label: 'asset type', requiredFields: ['name'] });
export const assetItemActions = createGenericCrudHandlers({ sliceName: 'assetItems', label: 'asset item', requiredFields: ['name', 'asset_type_id'] });
export const assetMaintenanceActions = createGenericCrudHandlers({ sliceName: 'assetMaintenanceSchedules', label: 'maintenance schedule', requiredFields: ['asset_item_id'] });

// QR Codes
export const qrCodeActions = createGenericCrudHandlers({ sliceName: 'qrCodes', label: 'QR code', requiredFields: ['name'] });

// Compliance
export const complianceStandardActions = createGenericCrudHandlers({ sliceName: 'complianceStandards', label: 'compliance standard', requiredFields: ['name'] });
export const complianceRequirementActions = createGenericCrudHandlers({ sliceName: 'complianceRequirements', label: 'compliance requirement', requiredFields: ['standard_id', 'name'] });
export const complianceAuditActions = createGenericCrudHandlers({ sliceName: 'complianceAudits', label: 'compliance audit', requiredFields: ['standard_id'] });

// Documents
export const documentActions = createGenericCrudHandlers({ sliceName: 'documents', label: 'document', requiredFields: ['title'] });

// Working Hours
export const workingScheduleActions = createGenericCrudHandlers({ sliceName: 'workingSchedules', label: 'working schedule', requiredFields: ['name'] });
export const scheduleAssignmentActions = createGenericCrudHandlers({ sliceName: 'scheduleAssignments', label: 'schedule assignment', requiredFields: ['schedule_id', 'user_id'] });
export const timeOffTypeActions = createGenericCrudHandlers({ sliceName: 'timeOffTypes', label: 'time-off type', requiredFields: ['name'] });
export const timeOffRequestActions = createGenericCrudHandlers({ sliceName: 'timeOffRequests', label: 'time-off request', requiredFields: ['type_id', 'start_date', 'end_date'] });
export const holidayCalendarActions = createGenericCrudHandlers({ sliceName: 'holidayCalendars', label: 'holiday calendar', requiredFields: ['name'] });
export const overtimeRuleActions = createGenericCrudHandlers({ sliceName: 'overtimeRules', label: 'overtime rule', requiredFields: ['name'] });

// Task-related entities that use generic slices
export const taskAttachmentActions = createGenericCrudHandlers({ sliceName: 'taskAttachments', label: 'task attachment', requiredFields: ['task_id'] });
export const taskRecurrenceActions = createGenericCrudHandlers({ sliceName: 'taskRecurrences', label: 'task recurrence', requiredFields: ['task_id'] });
export const taskShareActions = createGenericCrudHandlers({ sliceName: 'taskShares', label: 'task share', requiredFields: ['task_id'] });

// ═════════════════════════════════════════════════════════════════════════════
// Master action map — maps snake_case action names to handler sets
// ═════════════════════════════════════════════════════════════════════════════

export const GENERIC_ACTION_MAP: Record<string, ReturnType<typeof createGenericCrudHandlers>> = {
  categories: categoryActions,
  statuses: statusActions,
  priorities: priorityActions,
  tags: tagActions,
  spots: spotActions,
  spot_types: spotTypeActions,
  templates: templateActions,
  custom_fields: customFieldActions,
  teams: teamActions,
  users: userActions,
  user_teams: userTeamActions,
  invitations: invitationActions,
  workspaces: workspaceActions,
  slas: slaActions,
  sla_policies: slaPolicyActions,
  sla_alerts: slaAlertActions,
  sla_escalation_levels: slaEscalationActions,
  approvals: approvalActions,
  approval_approvers: approvalApproverActions,
  workflows: workflowActions,
  forms: formActions,
  form_fields: formFieldActions,
  boards: boardActions,
  board_members: boardMemberActions,
  board_messages: boardMessageActions,
  broadcasts: broadcastActions,
  plugins: pluginActions,
  status_transitions: statusTransitionActions,
  asset_types: assetTypeActions,
  asset_items: assetItemActions,
  asset_maintenance_schedules: assetMaintenanceActions,
  qr_codes: qrCodeActions,
  compliance_standards: complianceStandardActions,
  compliance_requirements: complianceRequirementActions,
  compliance_audits: complianceAuditActions,
  documents: documentActions,
  working_schedules: workingScheduleActions,
  schedule_assignments: scheduleAssignmentActions,
  time_off_types: timeOffTypeActions,
  time_off_requests: timeOffRequestActions,
  holiday_calendars: holidayCalendarActions,
  overtime_rules: overtimeRuleActions,
  task_attachments: taskAttachmentActions,
  task_recurrences: taskRecurrenceActions,
  task_shares: taskShareActions,
};
