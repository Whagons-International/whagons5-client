// ============================================================================
// TABLE REGISTRY - Single source of truth for all data tables
// ============================================================================
//
// This file defines ALL tables that the frontend manages.
// Both DB.ts (IndexedDB) and genericSlices.ts (Redux) import from here.
//
// To add a new table:
// 1. Add the snake_case store name to the appropriate array below
// 2. Bump CURRENT_DB_VERSION in DB.ts
// That's it!
//
// Naming convention (auto-derived from store name):
//   store: 'spot_custom_fields'
//   → table: 'wh_spot_custom_fields'
//   → endpoint: '/spot-custom-fields'
//   → slice name: 'spotCustomFields'

// ============================================================================
// SIMPLE STORES - keyPath: 'id', no indexes
// ============================================================================

export const SIMPLE_STORES = [
  // Core entities
  'workspaces', 'categories', 'tasks', 'shared_tasks', 'teams',
  'statuses', 'priorities', 'spots', 'tags', 'custom_fields',
  'category_custom_fields', 'users', 'roles', 'permissions',
  
  // User relations
  'user_teams', 'user_permissions', 'role_permissions', 'task_users',
  
  // Status & transitions
  'status_transitions', 'status_transition_groups', 'status_transition_logs',
  
  // Task relations
  'task_tags', 'task_shares', 'task_logs', 'task_attachments',
  'task_notes', 'task_recurrences', 'task_forms', 'task_custom_field_values',
  
  // Spots
  'spot_types', 'spot_custom_fields', 'spot_custom_field_values',
  
  // SLA
  'slas', 'sla_policies', 'sla_alerts',
  
  // Categories & priorities
  'category_priorities',
  
  // Forms
  'forms', 'form_fields', 'form_versions', 'field_options',
  
  // Templates
  'templates', 'template_custom_fields',
  
  // Invitations & logs
  'invitations', 'session_logs', 'config_logs', 'exceptions',
  
  // Messages
  'messages',
  
  // Jobs
  'job_positions',
  
  // Approvals
  'approvals', 'approval_approvers', 'task_approval_instances',
  
  // Broadcasts
  'broadcasts',
  
  // Workspaces
  'workspace_chat', 'workspace_resources',
  
  // Boards
  'boards', 'board_members', 'board_messages', 'board_attachments', 'board_birthday_images',
  
  // Workflows
  'workflows',
  
  // Compliance
  'compliance_standards', 'compliance_requirements', 'compliance_mappings', 'compliance_audits',
  
  // Schedules (legacy)
  'schedule_templates', 'schedule_template_days', 'user_schedules',
  
  // Avatars
  'avatars',
] as const;

// ============================================================================
// INDEXED STORES - stores that need IndexedDB indexes for queries
// ============================================================================

interface IndexDef {
  name: string;
  keyPath: string;
  unique?: boolean;
}

export interface IndexedStoreDef {
  keyPath: string;
  indexes: IndexDef[];
}

export const INDEXED_STORES: Record<string, IndexedStoreDef> = {
  'broadcast_acknowledgments': {
    keyPath: 'id',
    indexes: [
      { name: 'broadcast_id', keyPath: 'broadcast_id' },
      { name: 'user_id', keyPath: 'user_id' },
      { name: 'status', keyPath: 'status' }
    ]
  },
  'plugins': {
    keyPath: 'id',
    indexes: [
      { name: 'slug', keyPath: 'slug', unique: true },
      { name: 'is_enabled', keyPath: 'is_enabled' }
    ]
  },
  'plugin_routes': {
    keyPath: 'id',
    indexes: [{ name: 'plugin_id', keyPath: 'plugin_id' }]
  },
  'kpi_cards': {
    keyPath: 'id',
    indexes: [
      { name: 'workspace_id', keyPath: 'workspace_id' },
      { name: 'user_id', keyPath: 'user_id' },
      { name: 'is_enabled', keyPath: 'is_enabled' },
      { name: 'position', keyPath: 'position' }
    ]
  },
  'notifications': {
    keyPath: 'id',
    indexes: [
      { name: 'received_at', keyPath: 'received_at' },
      { name: 'viewed_at', keyPath: 'viewed_at' }
    ]
  },
  // Working Hours Plugin stores
  'country_configs': {
    keyPath: 'id',
    indexes: [{ name: 'country_code', keyPath: 'country_code', unique: true }]
  },
  'overtime_rules': {
    keyPath: 'id',
    indexes: [{ name: 'country_config_id', keyPath: 'country_config_id' }]
  },
  'overtime_multipliers': {
    keyPath: 'id',
    indexes: [{ name: 'overtime_rule_id', keyPath: 'overtime_rule_id' }]
  },
  'holiday_calendars': {
    keyPath: 'id',
    indexes: [
      { name: 'country_config_id', keyPath: 'country_config_id' },
      { name: 'calendar_year', keyPath: 'calendar_year' }
    ]
  },
  'holidays': {
    keyPath: 'id',
    indexes: [
      { name: 'holiday_calendar_id', keyPath: 'holiday_calendar_id' },
      { name: 'date', keyPath: 'date' }
    ]
  },
  'working_schedules': {
    keyPath: 'id',
    indexes: [{ name: 'is_default', keyPath: 'is_default' }]
  },
  'working_schedule_days': {
    keyPath: 'id',
    indexes: [{ name: 'working_schedule_id', keyPath: 'working_schedule_id' }]
  },
  'working_schedule_breaks': {
    keyPath: 'id',
    indexes: [{ name: 'working_schedule_day_id', keyPath: 'working_schedule_day_id' }]
  },
  'schedule_assignments': {
    keyPath: 'id',
    indexes: [
      { name: 'working_schedule_id', keyPath: 'working_schedule_id' },
      { name: 'assignable_type', keyPath: 'assignable_type' }
    ]
  },
  'time_off_types': {
    keyPath: 'id',
    indexes: [{ name: 'code', keyPath: 'code', unique: true }]
  },
  'time_off_requests': {
    keyPath: 'id',
    indexes: [
      { name: 'user_id', keyPath: 'user_id' },
      { name: 'status', keyPath: 'status' },
      { name: 'time_off_type_id', keyPath: 'time_off_type_id' }
    ]
  },
};

// ============================================================================
// SPECIAL KEYPATH STORES - stores with non-'id' keyPaths
// ============================================================================

export const SPECIAL_KEYPATH_STORES: Record<string, { keyPath: string }> = {
  'tenant_availability': { keyPath: 'tenantName' },
  'whiteboards': { keyPath: 'workspaceId' },
};

// ============================================================================
// GENERIC SLICE STORES - stores managed by the generic slice factory
// ============================================================================
// These get Redux slices, caches, and actions auto-generated.
// Excludes: tasks (custom slice), roles/permissions (not synced), etc.

export const GENERIC_SLICE_STORES = [
  // Custom Fields & Values
  'spot_custom_fields',
  'template_custom_fields',
  'task_custom_field_values',
  'spot_custom_field_values',

  // Forms & Fields
  'forms',
  'form_fields',
  'form_versions',
  'task_forms',
  'field_options',

  // User Management
  'users',
  'user_teams',

  // Task Relations
  'task_users',
  'task_tags',
  'task_shares',
  'task_logs',
  'status_transition_logs',

  // Reference Tables
  'statuses',
  'priorities',
  'spots',
  'tags',
  'spot_types',
  'status_transitions',
  'status_transition_groups',

  // Business Logic
  'slas',
  'sla_policies',
  'sla_alerts',
  'approvals',
  'approval_approvers',
  'task_approval_instances',
  
  // Broadcasts & Acknowledgments
  'broadcasts',
  'broadcast_acknowledgments',
  'category_priorities',
  'invitations',

  // Activity & Logging
  'session_logs',
  'config_logs',

  // File Management
  'task_attachments',
  'task_notes',
  'task_recurrences',
  'workspace_chat',
  'workspace_resources',

  // Error Tracking
  'exceptions',

  // Core Entities
  'categories',
  'category_custom_fields',
  'custom_fields',
  'teams',
  'templates',
  'messages',
  'workflows',
  'workspaces',

  // Boards (Communication Boards)
  'boards',
  'board_members',
  'board_messages',
  'board_attachments',
  'board_birthday_images',

  // Job Positions
  'job_positions',

  // Compliance Module
  'compliance_standards',
  'compliance_requirements',
  'compliance_mappings',
  'compliance_audits',

  // Plugin System
  'plugins',
  'plugin_routes',
  
  // KPI Cards
  'kpi_cards',

  // Working Hours Plugin
  'country_configs',
  'overtime_rules',
  'overtime_multipliers',
  'holiday_calendars',
  'holidays',
  'working_schedules',
  'working_schedule_days',
  'working_schedule_breaks',
  'schedule_assignments',
  'time_off_types',
  'time_off_requests',

  // Notifications (client-side only, no backend table)
  'notifications',
] as const;

// ============================================================================
// SPECIAL TABLE NAMING - exceptions to the standard naming convention
// ============================================================================
// Standard: store 'spot_custom_fields' → table 'wh_spot_custom_fields'
// These have non-standard table names (e.g., singular instead of plural)

export const SPECIAL_TABLE_NAMES: Record<string, { table?: string; endpoint?: string }> = {
  // Tables with singular names in backend
  'template_custom_fields': { table: 'wh_template_custom_field' },
  'task_custom_field_values': { table: 'wh_task_custom_field_value' },
  'spot_custom_field_values': { table: 'wh_spot_custom_field_value' },
  'category_custom_fields': { table: 'wh_category_custom_field' },
  'task_forms': { table: 'wh_task_form' },
  'user_teams': { table: 'wh_user_team' },
  'category_priorities': { table: 'wh_category_priority' },
  // Client-only store (no backend table/endpoint)
  'notifications': { table: '', endpoint: '' },
};

// ============================================================================
// UTILITY FUNCTIONS - name conversions
// ============================================================================

// Convert snake_case to camelCase: 'spot_custom_fields' → 'spotCustomFields'
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Convert snake_case to kebab-case: 'spot_custom_fields' → 'spot-custom-fields'
export function toKebabCase(str: string): string {
  return str.replace(/_/g, '-');
}

// Get the full table name: 'spot_custom_fields' → 'wh_spot_custom_fields'
export function getTableName(store: string): string {
  const special = SPECIAL_TABLE_NAMES[store];
  if (special?.table !== undefined) return special.table;
  return `wh_${store}`;
}

// Get the API endpoint: 'spot_custom_fields' → '/spot-custom-fields'
export function getEndpoint(store: string): string {
  const special = SPECIAL_TABLE_NAMES[store];
  if (special?.endpoint !== undefined) return special.endpoint;
  return `/${toKebabCase(store)}`;
}

// Type for generic slice store names
export type GenericSliceStore = typeof GENERIC_SLICE_STORES[number];
