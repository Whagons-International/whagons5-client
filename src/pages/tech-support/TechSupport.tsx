/**
 * Tech Support Page
 * 
 * Admin-only dashboard for monitoring and debugging across all tenants.
 * Features:
 * - Real-time WebSocket session monitoring
 * - Error telemetry viewer
 * - Direct database query tool
 * - Tenants overview
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  GridReadyEvent, 
  IServerSideDatasource, 
  IServerSideGetRowsParams,
  ModuleRegistry,
  AllCommunityModule
} from 'ag-grid-community';
import { ServerSideRowModelModule } from 'ag-grid-enterprise';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);
import { 
  Bug, RefreshCw, Search, X, Users, Database, Building2, 
  Activity, Wifi, WifiOff, AlertCircle, CheckCircle2, 
  Trash2, Save, ShieldAlert, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useLanguage } from '@/providers/LanguageProvider';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { 
  queryErrorTelemetry, 
  TelemetryError,
  getActiveSessions,
  getTenants,
  getRteHealth,
  RteSession,
  RteTenant,
  RteHealth
} from '@/api/rteApi';
import { Logger } from '@/utils/logger';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// Category badge colors
const categoryColors: Record<string, string> = {
  ui: 'bg-blue-500',
  api: 'bg-green-500',
  auth: 'bg-yellow-500',
  cache: 'bg-purple-500',
  rtl: 'bg-pink-500',
  redux: 'bg-orange-500',
  default: 'bg-gray-500',
};

// Sessions Tab Component
function SessionsTab() {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<RteSession[]>([]);
  const [byTenant, setByTenant] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await getActiveSessions();
      setSessions(data.sessions || []);
      setByTenant(data.by_tenant || {});
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch sessions';
      Logger.error('ui', 'TechSupport sessions fetch error:', err);
      setError(errorMsg);
      // Stop auto-refresh on auth errors to avoid spamming
      if (errorMsg.includes('401') || errorMsg.includes('Authentication') || errorMsg.includes('Forbidden')) {
        setAutoRefresh(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSessions, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [fetchSessions, autoRefresh]);

  const filteredSessions = useMemo(() => {
    if (filterTenant === 'all') return sessions;
    return sessions.filter(s => s.tenant_name === filterTenant);
  }, [sessions, filterTenant]);

  const tenantOptions = useMemo(() => {
    return Object.keys(byTenant).sort();
  }, [byTenant]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={filterTenant} onValueChange={setFilterTenant}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by tenant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants ({sessions.length})</SelectItem>
              {tenantOptions.map(tenant => (
                <SelectItem key={tenant} value={tenant}>
                  {tenant} ({byTenant[tenant]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant={autoRefresh ? "default" : "outline"} 
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={fetchSessions}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(byTenant).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Filtered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {autoRefresh ? (
                <>
                  <Wifi className="h-5 w-5 text-green-500" />
                  <span className="text-green-500 font-medium">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">Paused</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium">Session ID</th>
                  <th className="text-left p-3 font-medium">Tenant</th>
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-left p-3 font-medium">Last Ping</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <tr key={session.session_id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{session.session_id.substring(0, 8)}...</td>
                    <td className="p-3">
                      <Badge variant="outline">{session.tenant_name}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span>{session.user_email || 'N/A'}</span>
                        <span className="text-xs text-muted-foreground">ID: {session.user_id}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {dayjs(session.last_ping).fromNow()}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-green-600 dark:text-green-400">Connected</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No active sessions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Tenants Tab Component
function TenantsTab() {
  const { t } = useLanguage();
  const [tenants, setTenants] = useState<RteTenant[]>([]);
  const [stats, setStats] = useState({ total: 0, connected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    try {
      const data = await getTenants();
      setTenants(data.tenants);
      setStats({ total: data.total, connected: data.connected });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            {stats.connected}/{stats.total} connected
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTenants}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tenants.map((tenant) => (
          <Card key={tenant.id} className={!tenant.connected ? 'opacity-60' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {tenant.name}
                </CardTitle>
                {tenant.connected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <CardDescription className="font-mono text-xs">{tenant.domain}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Database:</span>
                <span className="font-mono text-xs">{tenant.database}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Active Sessions:</span>
                <Badge variant={tenant.active_sessions > 0 ? "default" : "secondary"}>
                  {tenant.active_sessions}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Tech support secret hash (SHA-256 of the actual password)
// This allows client-side validation without exposing the password in the build
const TECH_SUPPORT_SECRET_HASH = '43d51e5573a85271143877ed7a1101661393075ed297c5157d1870adc19b72a1';

// Hash a string using SHA-256
async function hashSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify the secret against the stored hash
async function verifySecret(secret: string): Promise<boolean> {
  const hash = await hashSecret(secret);
  return hash === TECH_SUPPORT_SECRET_HASH;
}

// Row Edit Modal Component
interface RowEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: Record<string, unknown> | null;
  columns: { name: string; data_type: string; is_primary_key: boolean }[];
  tableName: string;
  tenantName: string;
  onSave: () => void;
}

function RowEditModal({ isOpen, onClose, row, columns, tableName, tenantName, onSave }: RowEditModalProps) {
  const [editedRow, setEditedRow] = useState<Record<string, unknown>>({});
  const [secret, setSecret] = useState('');
  const [forceMode, setForceMode] = useState(false);
  const [showForceWarning, setShowForceWarning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize edited row when row changes
  useEffect(() => {
    if (row) {
      setEditedRow({ ...row });
    }
    setError(null);
    setSecret('');
    setForceMode(false);
    setShowForceWarning(false);
    setShowDeleteConfirm(false);
  }, [row]);

  // Handle force mode toggle
  const handleForceToggle = (checked: boolean) => {
    console.log('[RowEditModal] Force toggle:', checked);
    if (checked) {
      setShowForceWarning(true);
    } else {
      setForceMode(false);
      setShowForceWarning(false);
    }
  };

  // Get primary key columns and values
  const primaryKeyColumns = columns.filter(c => c.is_primary_key);
  const getPrimaryKey = () => {
    const pk: Record<string, unknown> = {};
    primaryKeyColumns.forEach(col => {
      pk[col.name] = row?.[col.name];
    });
    // If no explicit PK, try 'id' column
    if (Object.keys(pk).length === 0 && row?.id !== undefined) {
      pk['id'] = row.id;
    }
    return pk;
  };

  const handleSave = async () => {
    if (!secret) {
      setError('Tech support secret is required');
      return;
    }

    // Verify secret client-side first
    const isValidSecret = await verifySecret(secret);
    if (!isValidSecret) {
      setError('Invalid tech support secret');
      return;
    }

    const primaryKey = getPrimaryKey();
    if (Object.keys(primaryKey).length === 0) {
      setError('Cannot identify row - no primary key found');
      return;
    }

    // Get changed fields only
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(editedRow)) {
      if (JSON.stringify(value) !== JSON.stringify(row?.[key])) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      setError('No changes to save');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { updateTableRow } = await import('@/api/rteApi');
      await updateTableRow({
        tenant_name: tenantName,
        table_name: tableName,
        primary_key: primaryKey,
        updates,
        secret,
        force: forceMode,
      });
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update row');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    console.log('[RowEditModal] handleDelete called, secret:', secret ? 'provided' : 'empty');
    
    if (!secret) {
      setError('Tech support secret is required - scroll up to enter it');
      setShowDeleteConfirm(false);
      return;
    }

    // Verify secret client-side first
    const isValidSecret = await verifySecret(secret);
    if (!isValidSecret) {
      setError('Invalid tech support secret');
      setShowDeleteConfirm(false);
      return;
    }

    const primaryKey = getPrimaryKey();
    console.log('[RowEditModal] Primary key:', primaryKey);
    
    if (Object.keys(primaryKey).length === 0) {
      setError('Cannot identify row - no primary key found');
      setShowDeleteConfirm(false);
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const { deleteTableRow } = await import('@/api/rteApi');
      console.log('[RowEditModal] Calling deleteTableRow:', { tenantName, tableName, primaryKey, force: forceMode });
      await deleteTableRow({
        tenant_name: tenantName,
        table_name: tableName,
        primary_key: primaryKey,
        secret,
        force: forceMode,
      });
      console.log('[RowEditModal] Delete successful');
      onSave();
      onClose();
    } catch (err) {
      console.error('[RowEditModal] Delete failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete row');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    // Try to parse as JSON for objects/arrays, otherwise keep as string
    let parsedValue: unknown = value;
    if (value === 'null') {
      parsedValue = null;
    } else if (value === 'true') {
      parsedValue = true;
    } else if (value === 'false') {
      parsedValue = false;
    } else if (!isNaN(Number(value)) && value.trim() !== '') {
      // Check if original was a number
      const originalType = typeof row?.[fieldName];
      if (originalType === 'number' || (row?.[fieldName] === null && /^\d+$/.test(value))) {
        parsedValue = Number(value);
      }
    }
    
    setEditedRow(prev => ({ ...prev, [fieldName]: parsedValue }));
  };

  if (!row) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Edit Row - {tableName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-4 w-4" />
            Warning: Direct database modifications can corrupt data and break application integrity.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 pr-2" style={{ maxHeight: '50vh' }}>
          <div className="space-y-4">
            {/* Row Fields */}
            {columns.map(col => (
              <div key={col.name} className="space-y-1">
                <Label className="flex items-center gap-2 text-sm">
                  {col.name}
                  {col.is_primary_key && (
                    <Badge variant="outline" className="text-xs">PK</Badge>
                  )}
                  <span className="text-muted-foreground text-xs">({col.data_type})</span>
                </Label>
                {col.data_type.includes('text') || col.data_type.includes('json') ? (
                  <Textarea
                    value={editedRow[col.name] === null ? 'null' : 
                           typeof editedRow[col.name] === 'object' ? JSON.stringify(editedRow[col.name], null, 2) :
                           String(editedRow[col.name] ?? '')}
                    onChange={(e) => handleFieldChange(col.name, e.target.value)}
                    className="font-mono text-sm"
                    rows={col.data_type.includes('json') ? 4 : 2}
                    disabled={col.is_primary_key}
                  />
                ) : (
                  <Input
                    value={editedRow[col.name] === null ? 'null' : String(editedRow[col.name] ?? '')}
                    onChange={(e) => handleFieldChange(col.name, e.target.value)}
                    className="font-mono text-sm"
                    disabled={col.is_primary_key}
                  />
                )}
              </div>
            ))}

            {/* Secret Input */}
            <div className="space-y-1 pt-4 border-t">
              <Label className="flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4" />
                Tech Support Secret
              </Label>
              <Input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Enter secret to authorize changes"
              />
            </div>

            {/* Force Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="force-mode"
                checked={forceMode}
                onCheckedChange={handleForceToggle}
              />
              <Label htmlFor="force-mode" className="text-sm">
                Force mode (bypass foreign key constraints)
              </Label>
            </div>

          </div>
        </div>

        {/* Error display - always visible outside scroll area */}
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg flex items-center gap-2 text-sm mx-1">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          {/* Delete confirmation row */}
          {showDeleteConfirm && (
            <div className="w-full p-3 bg-destructive/10 rounded-lg flex items-center justify-between">
              <span className="text-sm text-destructive font-medium">Are you sure you want to delete this row?</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={saving || deleting}
                >
                  No, Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={saving || deleting}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </Button>
              </div>
            </div>
          )}
          
          {/* Action buttons row */}
          {!showDeleteConfirm && (
            <div className="w-full flex justify-between">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Row
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={saving || deleting}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || deleting}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Force Mode Warning - Separate Dialog on top */}
      <Dialog open={showForceWarning} onOpenChange={(open) => {
        if (!open) {
          setShowForceWarning(false);
          setForceMode(false);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-6 w-6" />
              DANGER: Force Mode
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Force mode bypasses <strong>ALL</strong> foreign key constraints and database triggers. This can:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-2 bg-destructive/10 p-4 rounded-lg">
              <li>Create orphaned records that break data integrity</li>
              <li>Corrupt dependency graphs and relationships</li>
              <li>Cause cascading failures in the application</li>
              <li>Make data unrecoverable without manual database intervention</li>
            </ul>
            <p className="text-sm font-medium">
              Only proceed if you fully understand the consequences.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowForceWarning(false);
                setForceMode(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowForceWarning(false);
                setForceMode(true);
              }}
            >
              I'm a goddamn engineer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

// Database Browser Tab Component (pgAdmin-like)
function DatabaseTab() {
  const gridRef = useRef<AgGridReact>(null);
  const [tenants, setTenants] = useState<RteTenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [tables, setTables] = useState<{ name: string; row_count: number }[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableFilter, setTableFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // AG Grid state
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
  const [columnMeta, setColumnMeta] = useState<{ name: string; data_type: string; is_primary_key: boolean }[]>([]);
  const [rowData, setRowData] = useState<Record<string, unknown>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  
  // Row edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);

  // Load tenants on mount
  useEffect(() => {
    getTenants().then(data => {
      const connected = data.tenants.filter(t => t.connected);
      setTenants(connected);
      if (connected.length > 0 && !selectedTenant) {
        setSelectedTenant(connected[0].name);
      }
    }).catch(err => {
      Logger.error('ui', 'Failed to load tenants:', err);
    });
  }, []);

  // Load tables when tenant changes
  useEffect(() => {
    if (!selectedTenant) return;
    
    setTablesLoading(true);
    setTables([]);
    setSelectedTable('');
    setRowData([]);
    setColumnDefs([]);
    
    import('@/api/rteApi').then(({ getDatabaseTables }) => {
      getDatabaseTables(selectedTenant)
        .then(data => {
          setTables(data.tables.map(t => ({ name: t.name, row_count: t.row_count })));
          setError(null);
        })
        .catch(err => {
          Logger.error('ui', 'Failed to load tables:', err);
          setError(err instanceof Error ? err.message : 'Failed to load tables');
        })
        .finally(() => setTablesLoading(false));
    });
  }, [selectedTenant]);

  // Load table data when table is selected
  const loadTableData = useCallback(async (tableName: string, page: number = 1) => {
    if (!selectedTenant || !tableName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { getTableColumns, getTableRows } = await import('@/api/rteApi');
      
      // Load columns first (for AG Grid column definitions)
      const columnsData = await getTableColumns(selectedTenant, tableName);
      
      // Create AG Grid column definitions from table columns
      const cols: ColDef[] = columnsData.columns.map(col => {
        // Determine width based on data type
        let width = 150; // default
        const dataType = col.data_type.toLowerCase();
        
        if (dataType.includes('text') || dataType.includes('varchar') || dataType.includes('json')) {
          width = 250;
        } else if (dataType.includes('timestamp') || dataType.includes('date')) {
          width = 180;
        } else if (dataType.includes('uuid')) {
          width = 280;
        } else if (dataType.includes('int') || dataType.includes('numeric') || dataType.includes('decimal')) {
          width = 100;
        } else if (dataType.includes('bool')) {
          width = 80;
        }
        
        return {
          field: col.name,
          headerName: col.name,
          sortable: true,
          resizable: true,
          filter: true,
          minWidth: 80,
          width,
          cellRenderer: (params: { value: unknown }) => {
            if (params.value === null) {
              return <span className="text-muted-foreground italic">NULL</span>;
            }
            if (typeof params.value === 'object') {
              return <span className="font-mono text-xs">{JSON.stringify(params.value)}</span>;
            }
            return String(params.value);
          },
          headerTooltip: `${col.data_type}${col.is_primary_key ? ' (PK)' : ''}${col.is_nullable ? '' : ' NOT NULL'}`,
        };
      });
      
      setColumnDefs(cols);
      
      // Store column metadata for edit modal
      setColumnMeta(columnsData.columns.map(col => ({
        name: col.name,
        data_type: col.data_type,
        is_primary_key: col.is_primary_key,
      })));
      
      // Load rows with pagination
      const rowsData = await getTableRows(selectedTenant, tableName, {
        page,
        per_page: pageSize,
      });
      
      console.log('[DatabaseTab] Loaded data:', {
        tableName,
        columns: cols.length,
        rows: rowsData.rows?.length,
        total: rowsData.total,
        sampleRow: rowsData.rows?.[0],
      });
      
      setRowData(rowsData.rows || []);
      setTotalRows(rowsData.total);
      setCurrentPage(page);
      setSelectedTable(tableName);
    } catch (err) {
      Logger.error('ui', 'Failed to load table data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load table data');
    } finally {
      setLoading(false);
    }
  }, [selectedTenant, pageSize]);

  // Filter tables
  const filteredTables = useMemo(() => {
    if (!tableFilter) return tables;
    const lower = tableFilter.toLowerCase();
    return tables.filter(t => t.name.toLowerCase().includes(lower));
  }, [tables, tableFilter]);

  // Pagination
  const totalPages = Math.ceil(totalRows / pageSize);
  
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadTableData(selectedTable, newPage);
    }
  };

  // Default column settings
  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    suppressHeaderMenuButton: false,
    minWidth: 80,
    wrapHeaderText: true,
    autoHeaderHeight: true,
  }), []);

  return (
    <div className="flex h-[calc(100vh-280px)] gap-4">
      {/* Left Sidebar - Table List */}
      <div className="w-64 flex flex-col border rounded-lg bg-card">
        {/* Tenant Selector */}
        <div className="p-3 border-b">
          <Select value={selectedTenant} onValueChange={setSelectedTenant}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map(tenant => (
                <SelectItem key={tenant.name} value={tenant.name}>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    {tenant.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Table Filter */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter tables..."
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {tableFilter && (
              <button
                onClick={() => setTableFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        
        {/* Table List */}
        <ScrollArea className="flex-1">
          {tablesLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {tables.length === 0 ? 'No tables found' : 'No matching tables'}
            </div>
          ) : (
            <div className="p-2">
              {filteredTables.map(table => (
                <button
                  key={table.name}
                  onClick={() => loadTableData(table.name)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between group ${
                    selectedTable === table.name
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="truncate font-mono text-xs">{table.name}</span>
                  <span className={`text-xs ${
                    selectedTable === table.name ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {table.row_count.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Table Count */}
        <div className="p-3 border-t text-xs text-muted-foreground text-center">
          {filteredTables.length} / {tables.length} tables
        </div>
      </div>
      
      {/* Main Content - Data Grid */}
      <div className="flex-1 flex flex-col border rounded-lg bg-card overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            {selectedTable ? (
              <>
                <Badge variant="outline" className="font-mono">
                  {selectedTable}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {totalRows.toLocaleString()} rows
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                Select a table to view data
              </span>
            )}
          </div>
          
          {selectedTable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTableData(selectedTable, currentPage)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        
        {/* Grid Container */}
        <div style={{ height: '500px', width: '100%' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !selectedTable ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <Database className="h-12 w-12" />
              <span>Select a table from the sidebar</span>
            </div>
          ) : (
            <div className="ag-theme-quartz" style={{ height: 500, width: '100%' }}>
              <AgGridReact
                ref={gridRef}
                columnDefs={columnDefs}
                rowData={rowData}
                defaultColDef={defaultColDef}
                animateRows={true}
                suppressCellFocus={true}
                enableCellTextSelection={true}
                ensureDomOrder={true}
                onRowClicked={(event) => {
                  if (event.data) {
                    setSelectedRow(event.data);
                    setEditModalOpen(true);
                  }
                }}
                onGridReady={() => {
                  console.log('[DatabaseTab] Grid ready, rows:', rowData.length, 'cols:', columnDefs.length);
                }}
              />
            </div>
          )}
        </div>
        
        {/* Pagination Footer */}
        {selectedTable && totalRows > pageSize && (
          <div className="p-3 border-t flex items-center justify-between bg-muted/30">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalRows)} of {totalRows.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1 || loading}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                Prev
              </Button>
              <span className="text-sm px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || loading}
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Row Edit Modal */}
      <RowEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedRow(null);
        }}
        row={selectedRow}
        columns={columnMeta}
        tableName={selectedTable}
        tenantName={selectedTenant}
        onSave={() => {
          // Reload current page after save
          loadTableData(selectedTable, currentPage);
        }}
      />
    </div>
  );
}

// Errors Tab Component (existing AG Grid implementation)
function ErrorsTab() {
  const { t } = useLanguage();
  const gridRef = useRef<AgGridReact>(null);
  
  const [searchText, setSearchText] = useState('');
  const [selectedError, setSelectedError] = useState<TelemetryError | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Column definitions for AG Grid
  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: 'received_at',
      headerName: 'Time',
      width: 140,
      sortable: true,
      valueFormatter: (params) => {
        if (!params.value) return '';
        return dayjs(params.value).fromNow();
      },
    },
    {
      field: 'tenant_name',
      headerName: 'Tenant',
      width: 120,
      sortable: true,
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 100,
      sortable: true,
      cellRenderer: (params: { value: string }) => {
        const color = categoryColors[params.value] || categoryColors.default;
        return (
          <Badge className={`${color} text-white text-xs`}>
            {params.value}
          </Badge>
        );
      },
    },
    {
      field: 'message',
      headerName: 'Message',
      flex: 1,
      minWidth: 300,
      sortable: true,
      cellClass: 'font-mono text-xs',
    },
    {
      field: 'user_email',
      headerName: 'User',
      width: 180,
      sortable: true,
    },
    {
      field: 'app_version',
      headerName: 'Version',
      width: 180,
      sortable: true,
      cellRenderer: (params: { value: string; data: TelemetryError }) => (
        <span className="font-mono text-xs">
          {params.value}
          {params.data.commit_hash && (
            <span className="text-muted-foreground ml-1">
              ({params.data.commit_hash})
            </span>
          )}
        </span>
      ),
    },
    {
      field: 'id',
      headerName: '',
      width: 80,
      sortable: false,
      cellRenderer: (params: { data: TelemetryError }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedError(params.data)}
          className="h-7 px-2"
        >
          View
        </Button>
      ),
    },
  ], []);

  // Default column settings
  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    suppressHeaderMenuButton: true,
  }), []);

  // Server-side data source
  const createDatasource = useCallback((): IServerSideDatasource => {
    return {
      getRows: async (params: IServerSideGetRowsParams) => {
        try {
          const startRow = params.request.startRow || 0;
          const endRow = params.request.endRow || 100;
          const pageSize = endRow - startRow;
          const page = Math.floor(startRow / pageSize) + 1;

          // Get sort model
          const sortModel = params.request.sortModel || [];
          const sortBy = sortModel.length > 0 ? sortModel[0].colId : 'received_at';
          const sortOrder = sortModel.length > 0 ? sortModel[0].sort : 'desc';

          const result = await queryErrorTelemetry({
            page,
            per_page: pageSize,
            search: searchText || undefined,
            sort_by: sortBy,
            sort_order: sortOrder as 'asc' | 'desc',
          });

          console.log('[ErrorsTab] Fetched errors:', { 
            total: result.total, 
            dataLength: result.data?.length,
            firstError: result.data?.[0]
          });

          params.success({
            rowData: result.data || [],
            rowCount: result.total || 0,
          });
        } catch (error) {
          console.error('[ErrorsTab] Failed to fetch errors:', error);
          Logger.error('ui', 'TechSupport: Failed to fetch errors', error);
          params.fail();
        }
      },
    };
  }, [searchText]);

  // Handle grid ready
  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.setGridOption('serverSideDatasource', createDatasource());
  }, [createDatasource]);

  // Refresh grid
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    gridRef.current?.api?.refreshServerSide({ purge: true });
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  // Handle search
  const handleSearch = useCallback(() => {
    gridRef.current?.api?.refreshServerSide({ purge: true });
  }, []);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchText('');
    setTimeout(() => {
      gridRef.current?.api?.refreshServerSide({ purge: true });
    }, 0);
  }, []);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search errors..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 pr-10"
          />
          {searchText && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={handleSearch}>Search</Button>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Grid */}
      <div className="flex-1 ag-theme-quartz" style={{ height: '500px' }}>
        <AgGridReact
          ref={gridRef}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowModelType="serverSide"
          serverSideInitialRowCount={1}
          pagination={true}
          paginationPageSize={50}
          cacheBlockSize={50}
          onGridReady={onGridReady}
          getRowId={(params) => params.data.id}
          suppressCellFocus={true}
          animateRows={true}
        />
      </div>

      {/* Error Detail Dialog */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-destructive" />
              Error Details
            </DialogTitle>
          </DialogHeader>
          {selectedError && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 pr-4">
                {/* Basic Info */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">ID:</span>
                        <span className="ml-2 font-mono">{selectedError.id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tenant:</span>
                        <span className="ml-2">{selectedError.tenant_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Category:</span>
                        <Badge className={`ml-2 ${categoryColors[selectedError.category] || categoryColors.default} text-white`}>
                          {selectedError.category}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Time:</span>
                        <span className="ml-2">{dayjs(selectedError.received_at).format('YYYY-MM-DD HH:mm:ss')}</span>
                        <span className="ml-2 text-muted-foreground">({dayjs(selectedError.received_at).fromNow()})</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* User Info */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">User Information</CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <span className="ml-2">{selectedError.user_email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">User ID:</span>
                        <span className="ml-2">{selectedError.user_id || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">User Agent:</span>
                        <span className="ml-2 text-xs font-mono break-all">{selectedError.user_agent}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Version Info */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Version Information</CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Version:</span>
                        <span className="ml-2 font-mono">{selectedError.app_version}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Commit:</span>
                        <span className="ml-2 font-mono">{selectedError.commit_hash}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Build Time:</span>
                        <span className="ml-2 font-mono text-xs">{selectedError.build_time}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Error Message */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Error Message</CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    <pre className="bg-muted p-3 rounded-md text-sm font-mono whitespace-pre-wrap break-all">
                      {selectedError.message}
                    </pre>
                  </CardContent>
                </Card>

                {/* Stack Trace */}
                {selectedError.stack && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Stack Trace</CardTitle>
                    </CardHeader>
                    <CardContent className="py-3">
                      <pre className="bg-muted p-3 rounded-md text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto">
                        {selectedError.stack}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* URL */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Page URL</CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    <code className="text-sm font-mono break-all">{selectedError.url}</code>
                  </CardContent>
                </Card>

                {/* Redux State */}
                {selectedError.redux_state && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Redux State Snapshot</CardTitle>
                      <CardDescription>Counts and loading states at the time of error</CardDescription>
                    </CardHeader>
                    <CardContent className="py-3">
                      <pre className="bg-muted p-3 rounded-md text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(selectedError.redux_state, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Main TechSupport Component
export default function TechSupport() {
  const { t } = useLanguage();
  const { isSuperAdmin, isLoading } = useSuperAdmin();
  const [health, setHealth] = useState<RteHealth | null>(null);

  useEffect(() => {
    getRteHealth().then(setHealth).catch(console.error);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Show access denied if not super admin
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Bug className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 gap-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-destructive/10 rounded-lg">
            <Bug className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tech Support Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Monitor and debug across all tenants
            </p>
          </div>
        </div>
        
        {health && (
          <div className="flex items-center gap-4">
            <Badge variant={health.status === 'healthy' ? 'default' : 'destructive'}>
              RTE: {health.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {health.data.tenant_databases} DBs connected
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sessions" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Errors
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="tenants" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Tenants
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="flex-1 mt-6">
          <SessionsTab />
        </TabsContent>

        <TabsContent value="errors" className="flex-1 mt-6 min-h-0">
          <ErrorsTab />
        </TabsContent>

        <TabsContent value="database" className="flex-1 mt-6">
          <DatabaseTab />
        </TabsContent>

        <TabsContent value="tenants" className="flex-1 mt-6">
          <TenantsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
