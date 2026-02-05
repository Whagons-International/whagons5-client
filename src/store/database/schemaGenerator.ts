/**
 * Schema generator for DuckDB tables.
 * 
 * Generates CREATE TABLE DDL statements from:
 * 1. OpenAPI Resource schemas (api-docs.json)
 * 2. Table registry definitions
 * 
 * This runs at database initialization to create all tables.
 */

import { 
  SIMPLE_STORES, 
  INDEXED_STORES, 
  SPECIAL_KEYPATH_STORES,
  GENERIC_SLICE_STORES 
} from '../tableRegistry';
import type { 
  TableSchema, 
  ColumnDef, 
  IndexDef,
  DuckDBColumnType,
  OpenAPIDocument,
  OpenAPIProperty 
} from './types';

// ============================================================================
// OpenAPI Type Mapping
// ============================================================================

/**
 * Map OpenAPI types to DuckDB column types.
 */
function mapOpenAPIType(prop: OpenAPIProperty): DuckDBColumnType {
  const { type, format } = prop;

  // Handle format-specific mappings first
  if (format === 'date-time' || format === 'datetime') return 'TIMESTAMP';
  if (format === 'date') return 'DATE';

  // Then handle base types
  switch (type) {
    case 'integer':
      return 'INTEGER';
    case 'number':
      return 'DOUBLE';
    case 'boolean':
      return 'BOOLEAN';
    case 'string':
      return 'VARCHAR';
    case 'object':
    case 'array':
      return 'JSON';
    default:
      return 'VARCHAR';
  }
}

// ============================================================================
// Store to Resource Mapping
// ============================================================================

/**
 * Map store names to their OpenAPI Resource schema names.
 * Most follow a convention: 'categories' -> 'CategoryResource'
 * Exceptions are listed explicitly.
 */
const STORE_TO_RESOURCE: Record<string, string> = {
  // Explicit mappings for non-standard names
  'exceptions': 'WhExceptionResource',
  'session_logs': 'SessionLogResource',
  'config_logs': 'ConfigLogResource',
  'task_attachments': 'TaskAttachmentResource',
  'task_logs': 'TaskLogResource',
  'task_notes': 'TaskNoteResource',
  'task_recurrences': 'TaskRecurrenceResource',
  'task_tags': 'TaskTagResource',
  'task_users': 'TaskUserResource',
  'task_shares': 'TaskShareResource',
  'task_forms': 'TaskFormResource',
  'task_custom_field_values': 'TaskCustomFieldValueResource',
  'user_teams': 'UserTeamResource',
  'user_permissions': 'UserPermissionResource',
  'role_permissions': 'RolePermissionResource',
  'category_priorities': 'CategoryPriorityResource',
  'category_custom_fields': 'CategoryCustomFieldResource',
  'spot_types': 'SpotTypeResource',
  'spot_custom_fields': 'SpotCustomFieldResource',
  'spot_custom_field_values': 'SpotCustomFieldValueResource',
  'template_custom_fields': 'TemplateCustomFieldResource',
  'status_transitions': 'StatusTransitionResource',
  'status_transition_groups': 'StatusTransitionGroupResource',
  'status_transition_logs': 'StatusTransitionLogResource',
  'sla_policies': 'SlaPolicyResource',
  'sla_alerts': 'SlaAlertResource',
  'broadcast_acknowledgments': 'BroadcastAcknowledgmentResource',
  'schedule_templates': 'ScheduleTemplateResource',
  'schedule_template_days': 'ScheduleTemplateDayResource',
  'user_schedules': 'UserScheduleResource',
  'workspace_chat': 'WorkspaceChatResource',
  'workspace_resources': 'WorkspaceResourceResource',
  'board_members': 'BoardMemberResource',
  'board_messages': 'BoardMessageResource',
  'board_attachments': 'BoardAttachmentResource',
  'board_birthday_images': 'BoardBirthdayImageResource',
  'job_positions': 'JobPositionResource',
  'approval_approvers': 'ApprovalApproverResource',
  'task_approval_instances': 'TaskApprovalInstanceResource',
  'compliance_standards': 'ComplianceStandardResource',
  'compliance_requirements': 'ComplianceRequirementResource',
  'compliance_mappings': 'ComplianceMappingResource',
  'compliance_audits': 'ComplianceAuditResource',
  'plugin_routes': 'PluginRouteResource',
  'kpi_cards': 'KpiCardResource',
  'country_configs': 'CountryConfigResource',
  'overtime_rules': 'OvertimeRuleResource',
  'overtime_multipliers': 'OvertimeMultiplierResource',
  'holiday_calendars': 'HolidayCalendarResource',
  'working_schedules': 'WorkingScheduleResource',
  'working_schedule_days': 'WorkingScheduleDayResource',
  'working_schedule_breaks': 'WorkingScheduleBreakResource',
  'schedule_assignments': 'ScheduleAssignmentResource',
  'time_off_types': 'TimeOffTypeResource',
  'time_off_requests': 'TimeOffRequestResource',
  'form_fields': 'FormFieldResource',
  'form_versions': 'FormVersionResource',
  'field_options': 'FieldOptionResource',
};

/**
 * Convert store name to expected Resource name using convention.
 * 'categories' -> 'CategoryResource'
 * 'task_logs' -> 'TaskLogResource'
 */
function storeToResourceName(store: string): string {
  // Check explicit mapping first
  if (STORE_TO_RESOURCE[store]) {
    return STORE_TO_RESOURCE[store];
  }

  // Convert snake_case to PascalCase and append 'Resource'
  // 'categories' -> 'Category' (singular)
  // 'task_logs' -> 'TaskLog'
  const parts = store.split('_');
  const pascal = parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  
  // Handle plurals: remove trailing 's' for simple cases
  let singular = pascal;
  if (singular.endsWith('ies')) {
    singular = singular.slice(0, -3) + 'y'; // categories -> Category
  } else if (singular.endsWith('es') && !singular.endsWith('ses')) {
    singular = singular.slice(0, -2); // statuses -> Status
  } else if (singular.endsWith('s') && !singular.endsWith('ss')) {
    singular = singular.slice(0, -1); // tasks -> Task
  }

  return `${singular}Resource`;
}

// ============================================================================
// Fallback Schemas (for stores without OpenAPI definitions)
// ============================================================================

/**
 * Default columns that most tables have.
 */
const COMMON_COLUMNS: ColumnDef[] = [
  { name: 'id', type: 'INTEGER', primaryKey: true },
  { name: 'created_at', type: 'TIMESTAMP', nullable: true },
  { name: 'updated_at', type: 'TIMESTAMP', nullable: true },
];

/**
 * Fallback schema definitions for stores without OpenAPI schemas.
 * These are used when we can't find or parse the OpenAPI definition.
 */
const FALLBACK_SCHEMAS: Record<string, ColumnDef[]> = {
  // Whiteboards use workspaceId as key, store JSON data
  'whiteboards': [
    { name: 'workspaceId', type: 'INTEGER', primaryKey: true },
    { name: 'data', type: 'JSON', nullable: true },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: true },
  ],
  
  // Tenant availability uses tenantName as key
  'tenant_availability': [
    { name: 'tenantName', type: 'VARCHAR', primaryKey: true },
    { name: 'available', type: 'BOOLEAN', nullable: true },
    { name: 'checked_at', type: 'TIMESTAMP', nullable: true },
  ],

  // Notifications (client-only, no backend table)
  'notifications': [
    { name: 'id', type: 'INTEGER', primaryKey: true },
    { name: 'title', type: 'VARCHAR', nullable: true },
    { name: 'message', type: 'VARCHAR', nullable: true },
    { name: 'type', type: 'VARCHAR', nullable: true },
    { name: 'data', type: 'JSON', nullable: true },
    { name: 'received_at', type: 'TIMESTAMP', nullable: true },
    { name: 'viewed_at', type: 'TIMESTAMP', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: true },
  ],

  // Avatars cache (client-only)
  'avatars': [
    { name: 'id', type: 'INTEGER', primaryKey: true },
    { name: 'user_id', type: 'INTEGER', nullable: true },
    { name: 'data_url', type: 'TEXT', nullable: true },
    { name: 'fetched_at', type: 'TIMESTAMP', nullable: true },
  ],

  // Shared tasks (same schema as tasks)
  'shared_tasks': [
    { name: 'id', type: 'INTEGER', primaryKey: true },
    { name: 'name', type: 'VARCHAR', nullable: true },
    { name: 'description', type: 'TEXT', nullable: true },
    { name: 'workspace_id', type: 'INTEGER', nullable: true },
    { name: 'category_id', type: 'INTEGER', nullable: true },
    { name: 'team_id', type: 'INTEGER', nullable: true },
    { name: 'template_id', type: 'INTEGER', nullable: true },
    { name: 'spot_id', type: 'INTEGER', nullable: true },
    { name: 'status_id', type: 'INTEGER', nullable: true },
    { name: 'priority_id', type: 'INTEGER', nullable: true },
    { name: 'start_date', type: 'TIMESTAMP', nullable: true },
    { name: 'due_date', type: 'TIMESTAMP', nullable: true },
    { name: 'expected_duration', type: 'VARCHAR', nullable: true },
    { name: 'response_date', type: 'TIMESTAMP', nullable: true },
    { name: 'resolution_date', type: 'TIMESTAMP', nullable: true },
    { name: 'work_duration', type: 'VARCHAR', nullable: true },
    { name: 'pause_duration', type: 'VARCHAR', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: true },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: true },
    { name: 'deleted_at', type: 'TIMESTAMP', nullable: true },
  ],
};

// ============================================================================
// Schema Generation
// ============================================================================

/**
 * Parse OpenAPI schema to extract column definitions.
 */
function parseOpenAPISchema(
  schemaName: string, 
  schemas: Record<string, any>,
  keyPath: string = 'id'
): ColumnDef[] {
  const schema = schemas[schemaName];
  if (!schema || !schema.properties) {
    return [];
  }

  const columns: ColumnDef[] = [];
  const required = new Set(schema.required || []);

  for (const [propName, prop] of Object.entries(schema.properties)) {
    const propDef = prop as OpenAPIProperty;
    columns.push({
      name: propName,
      type: mapOpenAPIType(propDef),
      nullable: !required.has(propName),
      primaryKey: propName === keyPath,
    });
  }

  return columns;
}

/**
 * Get the primary key column for a store.
 */
function getKeyPath(store: string): string {
  if (SPECIAL_KEYPATH_STORES[store]) {
    return SPECIAL_KEYPATH_STORES[store].keyPath;
  }
  if (INDEXED_STORES[store]) {
    return INDEXED_STORES[store].keyPath;
  }
  return 'id';
}

/**
 * Get index definitions for a store.
 */
function getIndexes(store: string): IndexDef[] {
  const indexedStore = INDEXED_STORES[store];
  if (!indexedStore || !indexedStore.indexes) {
    return [];
  }

  return indexedStore.indexes.map(idx => ({
    name: `idx_${store}_${idx.name}`,
    columns: [idx.keyPath],
    unique: idx.unique,
  }));
}

/**
 * Generate table schema for a store.
 */
export function generateTableSchema(
  store: string, 
  openAPISchemas?: Record<string, any>
): TableSchema {
  const keyPath = getKeyPath(store);
  const indexes = getIndexes(store);

  // Check for fallback schema first
  if (FALLBACK_SCHEMAS[store]) {
    return {
      name: store,
      columns: FALLBACK_SCHEMAS[store],
      primaryKey: keyPath,
      indexes,
    };
  }

  // Try to get schema from OpenAPI
  if (openAPISchemas) {
    const resourceName = storeToResourceName(store);
    const columns = parseOpenAPISchema(resourceName, openAPISchemas, keyPath);
    
    if (columns.length > 0) {
      // Ensure we have the key column
      if (!columns.find(c => c.name === keyPath)) {
        columns.unshift({
          name: keyPath,
          type: keyPath === 'id' ? 'INTEGER' : 'VARCHAR',
          primaryKey: true,
        });
      }
      
      // Ensure we have timestamp columns if not present
      if (!columns.find(c => c.name === 'created_at')) {
        columns.push({ name: 'created_at', type: 'TIMESTAMP', nullable: true });
      }
      if (!columns.find(c => c.name === 'updated_at')) {
        columns.push({ name: 'updated_at', type: 'TIMESTAMP', nullable: true });
      }

      return {
        name: store,
        columns,
        primaryKey: keyPath,
        indexes,
      };
    }
  }

  // Fall back to generic schema
  console.warn(`[SchemaGenerator] No schema found for store '${store}', using generic schema`);
  return {
    name: store,
    columns: [
      { name: keyPath, type: keyPath === 'id' ? 'INTEGER' : 'VARCHAR', primaryKey: true },
      { name: 'data', type: 'JSON', nullable: true },
      { name: 'created_at', type: 'TIMESTAMP', nullable: true },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: true },
    ],
    primaryKey: keyPath,
    indexes,
  };
}

/**
 * Generate CREATE TABLE DDL for a table schema.
 */
export function generateCreateTableDDL(schema: TableSchema): string {
  const columnDefs = schema.columns.map(col => {
    let def = `${col.name} ${col.type}`;
    if (col.primaryKey) {
      def += ' PRIMARY KEY';
    } else if (!col.nullable) {
      def += ' NOT NULL';
    }
    return def;
  });

  return `CREATE TABLE IF NOT EXISTS ${schema.name} (\n  ${columnDefs.join(',\n  ')}\n);`;
}

/**
 * Generate CREATE INDEX DDL statements for a table schema.
 */
export function generateCreateIndexDDL(schema: TableSchema): string[] {
  if (!schema.indexes || schema.indexes.length === 0) {
    return [];
  }

  return schema.indexes.map(idx => {
    const uniqueStr = idx.unique ? 'UNIQUE ' : '';
    return `CREATE ${uniqueStr}INDEX IF NOT EXISTS ${idx.name} ON ${schema.name} (${idx.columns.join(', ')});`;
  });
}

/**
 * Generate all DDL statements for all stores.
 */
export function generateAllSchemas(openAPISchemas?: Record<string, any>): Map<string, { createTable: string; createIndexes: string[] }> {
  const result = new Map<string, { createTable: string; createIndexes: string[] }>();
  
  // Collect all store names
  const allStores = new Set<string>([
    ...SIMPLE_STORES,
    ...Object.keys(INDEXED_STORES),
    ...Object.keys(SPECIAL_KEYPATH_STORES),
  ]);

  for (const store of allStores) {
    const schema = generateTableSchema(store, openAPISchemas);
    result.set(store, {
      createTable: generateCreateTableDDL(schema),
      createIndexes: generateCreateIndexDDL(schema),
    });
  }

  return result;
}

/**
 * Load OpenAPI schemas from the api-docs.json file.
 * This can be done at build time or runtime.
 */
export async function loadOpenAPISchemas(): Promise<Record<string, any> | null> {
  try {
    // Try to dynamically import the OpenAPI doc
    // This path assumes the file is accessible from the frontend
    const response = await fetch('/api-docs/api-docs.json');
    if (!response.ok) {
      console.warn('[SchemaGenerator] Could not load OpenAPI schemas:', response.status);
      return null;
    }
    const doc: OpenAPIDocument = await response.json();
    return doc.components?.schemas || null;
  } catch (e) {
    console.warn('[SchemaGenerator] Failed to load OpenAPI schemas:', e);
    return null;
  }
}

/**
 * Hardcoded schemas extracted from OpenAPI for offline use.
 * This is generated at build time and bundled with the app.
 * 
 * Call generateHardcodedSchemas() to update this.
 */
export const HARDCODED_SCHEMAS: Record<string, ColumnDef[]> = {
  'tasks': [
    { name: 'id', type: 'INTEGER', primaryKey: true },
    { name: 'name', type: 'VARCHAR', nullable: true },
    { name: 'description', type: 'TEXT', nullable: true },
    { name: 'workspace_id', type: 'INTEGER', nullable: true },
    { name: 'category_id', type: 'INTEGER', nullable: true },
    { name: 'team_id', type: 'INTEGER', nullable: true },
    { name: 'template_id', type: 'INTEGER', nullable: true },
    { name: 'spot_id', type: 'INTEGER', nullable: true },
    { name: 'status_id', type: 'INTEGER', nullable: true },
    { name: 'priority_id', type: 'INTEGER', nullable: true },
    { name: 'start_date', type: 'TIMESTAMP', nullable: true },
    { name: 'due_date', type: 'TIMESTAMP', nullable: true },
    { name: 'expected_duration', type: 'VARCHAR', nullable: true },
    { name: 'response_date', type: 'TIMESTAMP', nullable: true },
    { name: 'resolution_date', type: 'TIMESTAMP', nullable: true },
    { name: 'work_duration', type: 'VARCHAR', nullable: true },
    { name: 'pause_duration', type: 'VARCHAR', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: true },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: true },
    { name: 'deleted_at', type: 'TIMESTAMP', nullable: true },
    { name: 'user_ids', type: 'JSON', nullable: true },
  ],
  'categories': [
    { name: 'id', type: 'INTEGER', primaryKey: true },
    { name: 'name', type: 'VARCHAR', nullable: true },
    { name: 'description', type: 'TEXT', nullable: true },
    { name: 'color', type: 'VARCHAR', nullable: true },
    { name: 'icon', type: 'VARCHAR', nullable: true },
    { name: 'enabled', type: 'BOOLEAN', nullable: true },
    { name: 'sla_id', type: 'INTEGER', nullable: true },
    { name: 'team_id', type: 'INTEGER', nullable: true },
    { name: 'workspace_id', type: 'INTEGER', nullable: true },
    { name: 'status_transition_group_id', type: 'INTEGER', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: true },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: true },
  ],
  'statuses': [
    { name: 'id', type: 'INTEGER', primaryKey: true },
    { name: 'name', type: 'VARCHAR', nullable: true },
    { name: 'description', type: 'TEXT', nullable: true },
    { name: 'color', type: 'VARCHAR', nullable: true },
    { name: 'icon', type: 'VARCHAR', nullable: true },
    { name: 'is_default', type: 'BOOLEAN', nullable: true },
    { name: 'is_final', type: 'BOOLEAN', nullable: true },
    { name: 'order', type: 'INTEGER', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: true },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: true },
  ],
  'priorities': [
    { name: 'id', type: 'INTEGER', primaryKey: true },
    { name: 'name', type: 'VARCHAR', nullable: true },
    { name: 'description', type: 'TEXT', nullable: true },
    { name: 'color', type: 'VARCHAR', nullable: true },
    { name: 'icon', type: 'VARCHAR', nullable: true },
    { name: 'level', type: 'INTEGER', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: true },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: true },
  ],
  'workspaces': [
    { name: 'id', type: 'INTEGER', primaryKey: true },
    { name: 'name', type: 'VARCHAR', nullable: true },
    { name: 'description', type: 'TEXT', nullable: true },
    { name: 'color', type: 'VARCHAR', nullable: true },
    { name: 'icon', type: 'VARCHAR', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: true },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: true },
  ],
  'teams': [
    { name: 'id', type: 'INTEGER', primaryKey: true },
    { name: 'name', type: 'VARCHAR', nullable: true },
    { name: 'description', type: 'TEXT', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: true },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: true },
  ],
  'users': [
    { name: 'id', type: 'INTEGER', primaryKey: true },
    { name: 'name', type: 'VARCHAR', nullable: true },
    { name: 'email', type: 'VARCHAR', nullable: true },
    { name: 'firebase_uid', type: 'VARCHAR', nullable: true },
    { name: 'role_id', type: 'INTEGER', nullable: true },
    { name: 'team_id', type: 'INTEGER', nullable: true },
    { name: 'job_position_id', type: 'INTEGER', nullable: true },
    { name: 'avatar_url', type: 'VARCHAR', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: true },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: true },
  ],
  'spots': [
    { name: 'id', type: 'INTEGER', primaryKey: true },
    { name: 'name', type: 'VARCHAR', nullable: true },
    { name: 'description', type: 'TEXT', nullable: true },
    { name: 'spot_type_id', type: 'INTEGER', nullable: true },
    { name: 'parent_id', type: 'INTEGER', nullable: true },
    { name: 'workspace_id', type: 'INTEGER', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: true },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: true },
  ],
  'tags': [
    { name: 'id', type: 'INTEGER', primaryKey: true },
    { name: 'name', type: 'VARCHAR', nullable: true },
    { name: 'color', type: 'VARCHAR', nullable: true },
    { name: 'workspace_id', type: 'INTEGER', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: true },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: true },
  ],
};

/**
 * Get schema for a store, using hardcoded schemas first, then OpenAPI fallback.
 */
export function getSchemaForStore(store: string, openAPISchemas?: Record<string, any>): TableSchema {
  const keyPath = getKeyPath(store);
  const indexes = getIndexes(store);

  // Use hardcoded schema if available
  if (HARDCODED_SCHEMAS[store]) {
    return {
      name: store,
      columns: HARDCODED_SCHEMAS[store],
      primaryKey: keyPath,
      indexes,
    };
  }

  // Fall back to generated schema
  return generateTableSchema(store, openAPISchemas);
}
