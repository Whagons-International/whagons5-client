// ─── Trigger events that can start a workflow ──────────────────────

export const TRIGGER_EVENT_OPTIONS = [
  { value: "task.created", label: "When a task is created" },
  { value: "task.updated", label: "When a task is updated" },
  { value: "task.completed", label: "When a task is completed" },
  { value: "task.status_changed", label: "When a task status changes" },
  { value: "task.assigned", label: "When a task is assigned" },
  { value: "task.priority_changed", label: "When task priority changes" },
  { value: "sla.breached", label: "When an SLA is breached" },
  { value: "sla.warning", label: "When an SLA warning fires" },
  { value: "approval.resolved", label: "When an approval is resolved" },
  { value: "form.submitted", label: "When a form is submitted" },
  { value: "manual", label: "Manual trigger" },
] as const;

// ─── Action types that a workflow action node can perform ──────────

export const ACTION_TYPE_OPTIONS = [
  { value: "change_status", label: "Change task status", icon: "faArrowRightArrowLeft" },
  { value: "assign_user", label: "Assign user to task", icon: "faUserPlus" },
  { value: "create_task", label: "Create follow-up task", icon: "faSquarePlus" },
  { value: "set_priority", label: "Set task priority", icon: "faFlag" },
  { value: "add_tag", label: "Add tag to task", icon: "faTag" },
  { value: "notify_team", label: "Notify team", icon: "faBell" },
  { value: "send_email", label: "Send email", icon: "faEnvelope" },
  { value: "webhook", label: "Send webhook", icon: "faGlobe" },
] as const;

// ─── Condition operators ───────────────────────────────────────────

export const CONDITION_OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "greater_than", label: "is greater than" },
  { value: "less_than", label: "is less than" },
  { value: "greater_than_or_equal", label: "is greater than or equal to" },
  { value: "less_than_or_equal", label: "is less than or equal to" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
  { value: "in", label: "is one of" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
] as const;

// ─── Available context variables for interpolation ─────────────────

export const CONTEXT_VARIABLES = [
  { path: "trigger.task.id", label: "Task ID" },
  { path: "trigger.task.name", label: "Task name" },
  { path: "trigger.task.description", label: "Task description" },
  { path: "trigger.task.status_id", label: "Task status ID" },
  { path: "trigger.task.priority_id", label: "Task priority ID" },
  { path: "trigger.task.workspace_id", label: "Task workspace ID" },
  { path: "trigger.task.category_id", label: "Task category ID" },
  { path: "trigger.task.created_by", label: "Task creator ID" },
  { path: "trigger.task_id", label: "Task ID (flat)" },
  { path: "trigger.sla_id", label: "SLA ID" },
  { path: "trigger.sla_phase", label: "SLA phase" },
  { path: "user.id", label: "Current user ID" },
  { path: "now", label: "Current timestamp" },
] as const;

// ─── Condition field options (what can be checked) ─────────────────

export const CONDITION_FIELDS = [
  { value: "trigger.task.status_id", label: "Task status" },
  { value: "trigger.task.priority_id", label: "Task priority" },
  { value: "trigger.task.workspace_id", label: "Task workspace" },
  { value: "trigger.task.category_id", label: "Task category" },
  { value: "trigger.task.created_by", label: "Task creator" },
  { value: "trigger.task.team_id", label: "Task team" },
  { value: "trigger.task.sla_id", label: "Task SLA" },
  { value: "trigger.task.name", label: "Task name" },
  { value: "trigger.sla_phase", label: "SLA phase" },
  { value: "trigger.breach_type", label: "Breach type" },
] as const;

// ─── Node type palette config ──────────────────────────────────────

export const NODE_PALETTE = [
  { type: "trigger", label: "Trigger", description: "Start the workflow", color: "#22c55e" },
  { type: "condition", label: "Condition", description: "Filter by rule", color: "#eab308" },
  { type: "branch", label: "Branch", description: "Multiple paths", color: "#f97316" },
  { type: "action", label: "Action", description: "Perform action", color: "#3b82f6" },
  { type: "delay", label: "Delay", description: "Wait before next", color: "#6b7280" },
] as const;

// ─── Webhook HTTP methods ──────────────────────────────────────────

export const WEBHOOK_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

// ─── Pre-built workflow templates ──────────────────────────────────

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: { label: string; nodeType: string; config: Record<string, any> };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    type?: string;
    animated?: boolean;
  }>;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "auto-assign-high-priority",
    name: "Auto-assign high-priority tasks",
    description: "When a task is created with high priority, automatically assign it to a specific user or team.",
    nodes: [
      {
        id: "tpl_trigger_1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: { label: "Task Created", nodeType: "trigger", config: { event: "task.created" } },
      },
      {
        id: "tpl_cond_1",
        type: "condition",
        position: { x: 300, y: 180 },
        data: {
          label: "High Priority?",
          nodeType: "condition",
          config: { field: "trigger.task.priority_id", operator: "equals", value: "1" },
        },
      },
      {
        id: "tpl_action_1",
        type: "action",
        position: { x: 150, y: 340 },
        data: {
          label: "Assign User",
          nodeType: "action",
          config: { action_type: "assign_user", task_source: "trigger" },
        },
      },
    ],
    edges: [
      { id: "tpl_e1", source: "tpl_trigger_1", target: "tpl_cond_1", type: "smoothstep", animated: true },
      { id: "tpl_e2", source: "tpl_cond_1", target: "tpl_action_1", label: "true", type: "smoothstep", animated: true },
    ],
  },
  {
    id: "notify-team-sla-breach",
    name: "Notify team on SLA breach",
    description: "When an SLA is breached, notify the responsible team immediately.",
    nodes: [
      {
        id: "tpl_trigger_2",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: { label: "SLA Breached", nodeType: "trigger", config: { event: "sla.breached" } },
      },
      {
        id: "tpl_action_2",
        type: "action",
        position: { x: 300, y: 200 },
        data: {
          label: "Notify Team",
          nodeType: "action",
          config: {
            action_type: "notify_team",
            title: "SLA Breach Alert",
            message: "Task \"{{trigger.task.name}}\" has breached its SLA ({{trigger.sla_phase}}).",
          },
        },
      },
    ],
    edges: [
      { id: "tpl_e3", source: "tpl_trigger_2", target: "tpl_action_2", type: "smoothstep", animated: true },
    ],
  },
  {
    id: "create-followup-on-completion",
    name: "Create follow-up task on completion",
    description: "When a task is completed, automatically create a follow-up task in the same workspace.",
    nodes: [
      {
        id: "tpl_trigger_3",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: { label: "Task Completed", nodeType: "trigger", config: { event: "task.completed" } },
      },
      {
        id: "tpl_action_3",
        type: "action",
        position: { x: 300, y: 200 },
        data: {
          label: "Create Follow-up",
          nodeType: "action",
          config: {
            action_type: "create_task",
            title: "Follow-up: {{trigger.task.name}}",
            description: "Auto-created follow-up for completed task #{{trigger.task.id}}.",
          },
        },
      },
    ],
    edges: [
      { id: "tpl_e4", source: "tpl_trigger_3", target: "tpl_action_3", type: "smoothstep", animated: true },
    ],
  },
  {
    id: "webhook-on-status-change",
    name: "Send webhook on status change",
    description: "When a task status changes, send a webhook to an external system.",
    nodes: [
      {
        id: "tpl_trigger_4",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: { label: "Status Changed", nodeType: "trigger", config: { event: "task.status_changed" } },
      },
      {
        id: "tpl_action_4",
        type: "action",
        position: { x: 300, y: 200 },
        data: {
          label: "Send Webhook",
          nodeType: "action",
          config: {
            action_type: "webhook",
            url: "https://api.example.com/webhook",
            method: "POST",
            body_template: '{"task_id": "{{trigger.task.id}}", "new_status": "{{trigger.new_status_id}}"}',
          },
        },
      },
    ],
    edges: [
      { id: "tpl_e5", source: "tpl_trigger_4", target: "tpl_action_4", type: "smoothstep", animated: true },
    ],
  },
];
