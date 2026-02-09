/**
 * RTE (Real-Time Engine) API client
 * 
 * Used for tech support features like error telemetry queries.
 * This bypasses the normal Laravel API and calls RTE directly.
 */

import { getEnvVariables } from '@/lib/getEnvVariables';
import { auth } from '@/firebase/firebaseConfig';
import { getTokenForUser } from '@/api/whagonsApi';

/**
 * Get the RTE base URL
 */
function getRteBaseUrl(): string {
  const { VITE_DEVELOPMENT, VITE_RTE_DOMAIN } = getEnvVariables();
  
  if (VITE_DEVELOPMENT === 'true') {
    return 'http://localhost:8082';
  }
  
  // Production: use VITE_RTE_DOMAIN or derive from API URL
  if (VITE_RTE_DOMAIN) {
    const normalized = VITE_RTE_DOMAIN.replace(/^(wss?:\/\/|https?:\/\/)/, '');
    return `https://${normalized}`;
  }
  
  return 'https://rte.whagons.com';
}

/**
 * Get auth headers for RTE requests
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated - no Firebase user');
  }
  
  const token = getTokenForUser(currentUser.uid);
  if (!token) {
    throw new Error('No auth token available - token not found for user');
  }
  
  // Get subdomain for domain parameter
  // subdomain is stored with trailing dot (e.g., "mycompany.")
  const subdomain = localStorage.getItem('whagons-subdomain') || '';
  const { VITE_API_URL } = getEnvVariables();
  const apiUrlWithoutPort = VITE_API_URL.replace(/:\d+$/, '');
  
  // Ensure subdomain has trailing dot if present
  let cleanSubdomain = subdomain.trim();
  if (cleanSubdomain && !cleanSubdomain.endsWith('.')) {
    cleanSubdomain += '.';
  }
  
  const domain = cleanSubdomain ? `${cleanSubdomain}${apiUrlWithoutPort}` : apiUrlWithoutPort;
  
  // Debug logging
  console.log('[RTE API] Auth headers:', {
    domain,
    subdomain: cleanSubdomain,
    apiUrl: VITE_API_URL,
    tokenPreview: token.substring(0, 15) + '...',
    firebaseUid: currentUser.uid,
  });
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Domain': domain,
  };
}

/**
 * Query error telemetry from RTE
 */
export interface TelemetryQueryParams {
  page?: number;
  per_page?: number;
  tenant_name?: string;
  category?: string;
  user_id?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface TelemetryError {
  id: string;
  tenant_name: string;
  user_id: number | null;
  user_uid: string | null;
  user_email: string | null;
  category: string;
  message: string;
  stack: string | null;
  app_version: string;
  commit_hash: string;
  build_time: string;
  url: string;
  user_agent: string;
  redux_state: Record<string, unknown> | null;
  client_timestamp: string | null;
  received_at: string;
  session_id: string;
}

export interface TelemetryQueryResponse {
  data: TelemetryError[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export async function queryErrorTelemetry(params: TelemetryQueryParams): Promise<TelemetryQueryResponse> {
  const baseUrl = getRteBaseUrl();
  const headers = await getAuthHeaders();
  
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.per_page) queryParams.set('per_page', String(params.per_page));
  if (params.tenant_name) queryParams.set('tenant_name', params.tenant_name);
  if (params.category) queryParams.set('category', params.category);
  if (params.user_id) queryParams.set('user_id', String(params.user_id));
  if (params.search) queryParams.set('search', params.search);
  if (params.start_date) queryParams.set('start_date', params.start_date);
  if (params.end_date) queryParams.set('end_date', params.end_date);
  if (params.sort_by) queryParams.set('sort_by', params.sort_by);
  if (params.sort_order) queryParams.set('sort_order', params.sort_order);
  
  const url = `${baseUrl}/api/telemetry/errors?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RTE API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Get telemetry statistics
 */
export interface TelemetryStats {
  total_errors: number;
  errors_last_24h: number;
  errors_last_7d: number;
  top_categories: { category: string; count: number }[];
  top_tenants: { tenant_name: string; count: number }[];
}

export async function getTelemetryStats(): Promise<TelemetryStats> {
  const baseUrl = getRteBaseUrl();
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${baseUrl}/api/telemetry/stats`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RTE API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Session information from RTE
 */
export interface RteSession {
  session_id: string;
  tenant_name: string;
  user_id: number;
  user_email: string;
  connected_at: string;
  last_ping: string;
}

export interface SessionsResponse {
  sessions: RteSession[];
  total: number;
  by_tenant: Record<string, number>;
}

/**
 * Get active WebSocket sessions
 */
export async function getActiveSessions(): Promise<SessionsResponse> {
  const baseUrl = getRteBaseUrl();
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${baseUrl}/api/telemetry/sessions`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RTE API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Tenant information from RTE
 */
export interface RteTenant {
  id: number;
  name: string;
  domain: string;
  database: string;
  connected: boolean;
  active_sessions: number;
}

export interface TenantsResponse {
  tenants: RteTenant[];
  total: number;
  connected: number;
}

/**
 * Get all tenants overview
 */
export async function getTenants(): Promise<TenantsResponse> {
  const baseUrl = getRteBaseUrl();
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${baseUrl}/api/telemetry/tenants`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RTE API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Database query result
 */
export interface DbQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  execution_time_ms: number;
}

/**
 * Execute a read-only SQL query against a tenant database
 */
export async function executeDbQuery(tenantName: string, query: string): Promise<DbQueryResult> {
  const baseUrl = getRteBaseUrl();
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${baseUrl}/api/telemetry/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tenant_name: tenantName, query }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RTE API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * RTE health/metrics
 */
export interface RteHealth {
  status: string;
  service: string;
  version: string;
  data: {
    active_sessions: number;
    negotiation_sessions: number;
    total_sessions: number;
    tenant_databases: number;
    landlord_connected: boolean;
    uptime: string;
  };
}

/**
 * Get RTE health status
 */
export async function getRteHealth(): Promise<RteHealth> {
  const baseUrl = getRteBaseUrl();
  
  const response = await fetch(`${baseUrl}/api/health`, {
    method: 'GET',
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RTE API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Table information from RTE
 */
export interface TableInfo {
  name: string;
  schema: string;
  row_count: number;
  table_type: string;
}

export interface TablesResponse {
  tables: TableInfo[];
  total: number;
}

/**
 * Get database tables for a tenant
 */
export async function getDatabaseTables(tenantName: string): Promise<TablesResponse> {
  const baseUrl = getRteBaseUrl();
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${baseUrl}/api/telemetry/tables?tenant_name=${encodeURIComponent(tenantName)}`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RTE API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Column information from RTE
 */
export interface ColumnInfo {
  name: string;
  data_type: string;
  is_nullable: boolean;
  default_value: string | null;
  is_primary_key: boolean;
  ordinal_position: number;
}

export interface ColumnsResponse {
  columns: ColumnInfo[];
  table_name: string;
  total: number;
}

/**
 * Get table columns for a specific table
 */
export async function getTableColumns(tenantName: string, tableName: string): Promise<ColumnsResponse> {
  const baseUrl = getRteBaseUrl();
  const headers = await getAuthHeaders();
  
  const params = new URLSearchParams({
    tenant_name: tenantName,
    table_name: tableName,
  });
  
  const response = await fetch(`${baseUrl}/api/telemetry/columns?${params.toString()}`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RTE API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Table rows response from RTE
 */
export interface RowsResponse {
  rows: Record<string, unknown>[];
  columns: string[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  table_name: string;
}

export interface TableRowsParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Get table rows with pagination and sorting
 */
export async function getTableRows(
  tenantName: string, 
  tableName: string, 
  params: TableRowsParams = {}
): Promise<RowsResponse> {
  const baseUrl = getRteBaseUrl();
  const headers = await getAuthHeaders();
  
  const queryParams = new URLSearchParams({
    tenant_name: tenantName,
    table_name: tableName,
  });
  
  if (params.page) queryParams.set('page', String(params.page));
  if (params.per_page) queryParams.set('per_page', String(params.per_page));
  if (params.sort_by) queryParams.set('sort_by', params.sort_by);
  if (params.sort_order) queryParams.set('sort_order', params.sort_order);
  
  const response = await fetch(`${baseUrl}/api/telemetry/rows?${queryParams.toString()}`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RTE API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Update a row in a table
 */
export interface UpdateRowParams {
  tenant_name: string;
  table_name: string;
  primary_key: Record<string, unknown>;
  updates: Record<string, unknown>;
  secret: string;
  force?: boolean;
}

export async function updateTableRow(params: UpdateRowParams): Promise<{ success: boolean; message: string }> {
  const baseUrl = getRteBaseUrl();
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${baseUrl}/api/telemetry/row`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RTE API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Delete a row from a table
 */
export interface DeleteRowParams {
  tenant_name: string;
  table_name: string;
  primary_key: Record<string, unknown>;
  secret: string;
  force?: boolean;
}

export async function deleteTableRow(params: DeleteRowParams): Promise<{ success: boolean; message: string }> {
  const baseUrl = getRteBaseUrl();
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${baseUrl}/api/telemetry/row`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RTE API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Tenant details with statistics
 */
export interface TenantDetails {
  id: number;
  name: string;
  domain: string;
  database: string;
  connected: boolean;
  active_sessions: number;
  stats: {
    total_users: number;
    active_users: number;
    total_tasks: number;
    total_workspaces: number;
    total_categories: number;
    total_teams: number;
  };
  recent_errors: number;
  sessions: RteSession[];
}

/**
 * Get detailed tenant information including stats
 */
export async function getTenantDetails(tenantName: string): Promise<TenantDetails> {
  const baseUrl = getRteBaseUrl();
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${baseUrl}/api/telemetry/tenants/${encodeURIComponent(tenantName)}`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RTE API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Get RTE base URL (exported for WebSocket connections)
 */
export { getRteBaseUrl };
