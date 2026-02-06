import { useMemo, useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { ColDef } from "ag-grid-community";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStopwatch, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/animated/Tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  SettingsLayout,
  SettingsGrid,
  SettingsDialog,
  useSettingsState,
  createActionsCellRenderer,
  SelectField,
  CheckboxField,
  TextField
} from "../../components";
import { AppDispatch, RootState } from "@/store/store";
import { genericActions } from "@/store/genericSlices";
import { useLanguage } from "@/providers/LanguageProvider";

type SlaRow = {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  enabled: boolean;
  response_time: number | null; // minutes
  resolution_time: number | null; // minutes
  sla_policy_id?: number | null;
};

type SlaAlertRow = {
  id: number;
  sla_id: number;
  time: number; // minutes
  type: 'response' | 'resolution';
  notify_to: 'RESPONSIBLE' | 'CREATED_BY' | 'MANAGER' | 'TEAM';
};

type SlaPolicyRow = {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  trigger_type: 'on_create' | 'on_status_change' | 'on_field_value';
  trigger_status_id?: number | null;
  trigger_field_id?: number | null;
  trigger_operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | null;
  trigger_value_text?: string | null;
  trigger_value_number?: number | null;
  trigger_value_boolean?: boolean | null;
  grace_seconds: number; // simple seconds for now
};

// React cell renderer: small centered color swatch
function ColorCellRenderer(params: any) {
  const value = (params?.value as string | null) || null;
  if (!value) return <>-</>;
  return (
    <div title={value} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, border: '1px solid #e5e7eb', background: value }} />
    </div>
  );
}

// React cell renderer: name with description below (muted)
function NameWithDescriptionRenderer(params: any) {
  const name = String(params?.value ?? '');
  const description = params?.data?.description as string | null | undefined;
  return (
    <div className="flex flex-col py-1">
      <div className="font-medium">{name}</div>
      {description ? (
        <div className="text-xs text-muted-foreground truncate">{description}</div>
      ) : null}
    </div>
  );
}

function Slas() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useLanguage();
  const ta = useCallback((key: string, fallback: string) => t(`settings.slas.${key}`, fallback), [t]);
  const [activeTab, setActiveTab] = useState<'slas' | 'alerts' | 'policies' | 'help'>('slas');
  const [selectedSlaId, setSelectedSlaId] = useState<number | ''>('');
  const [createPolicyTriggerType, setCreatePolicyTriggerType] = useState<'on_create' | 'on_status_change' | 'on_field_value'>('on_create');
  const [editPolicyTriggerType, setEditPolicyTriggerType] = useState<'on_create' | 'on_status_change' | 'on_field_value'>('on_create');
  const [createPolicyStatusId, setCreatePolicyStatusId] = useState<string>("");
  const [editPolicyStatusId, setEditPolicyStatusId] = useState<string>("");
  const [createPolicyOperator, setCreatePolicyOperator] = useState<string>("eq");
  const [editPolicyOperator, setEditPolicyOperator] = useState<string>("eq");

  const {
    items,
    filteredItems,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    handleSearch,
    createItem,
    updateItem,
    deleteItem,
    isSubmitting,
    formError,
    setFormError,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isDeleteDialogOpen,
    editingItem,
    deletingItem,
    handleEdit,
    handleDelete,
    handleCloseDeleteDialog
  } = useSettingsState<SlaRow>({
    entityName: "slas",
    searchFields: ["name", "description"] as (keyof SlaRow)[]
  });

  const {
    items: alerts,
    filteredItems: filteredAlerts,
    loading: alertsLoading,
    error: alertsError,
    searchQuery: alertsSearch,
    setSearchQuery: setAlertsSearch,
    handleSearch: handleAlertsSearch,
    createItem: createAlert,
    updateItem: updateAlert,
    deleteItem: deleteAlert,
    isSubmitting: alertsSubmitting,
    formError: alertsFormError,
    setFormError: setAlertsFormError,
    isCreateDialogOpen: isCreateAlertOpen,
    setIsCreateDialogOpen: setIsCreateAlertOpen,
    isEditDialogOpen: isEditAlertOpen,
    setIsEditDialogOpen: setIsEditAlertOpen,
    isDeleteDialogOpen: isDeleteAlertOpen,
    editingItem: editingAlert,
    deletingItem: deletingAlert,
    handleEdit: handleEditAlert,
    handleDelete: handleDeleteAlert,
    handleCloseDeleteDialog: closeDeleteAlertDialog
  } = useSettingsState<SlaAlertRow>({
    entityName: "slaAlerts",
    searchFields: ["type", "notify_to"] as (keyof SlaAlertRow)[]
  });

  // Policies state
  const {
    items: policies,
    filteredItems: filteredPolicies,
    loading: policiesLoading,
    error: policiesError,
    searchQuery: policiesSearch,
    setSearchQuery: setPoliciesSearch,
    handleSearch: handlePoliciesSearch,
    createItem: createPolicy,
    updateItem: updatePolicy,
    deleteItem: deletePolicy,
    isSubmitting: policiesSubmitting,
    formError: policiesFormError,
    setFormError: setPoliciesFormError,
    isCreateDialogOpen: isCreatePolicyOpen,
    setIsCreateDialogOpen: setIsCreatePolicyOpen,
    isEditDialogOpen: isEditPolicyOpen,
    setIsEditDialogOpen: setIsEditPolicyOpen,
    isDeleteDialogOpen: isDeletePolicyOpen,
    editingItem: editingPolicy,
    deletingItem: deletingPolicy,
    handleEdit: handleEditPolicy,
    handleDelete: handleDeletePolicy,
    handleCloseDeleteDialog: closeDeletePolicyDialog
  } = useSettingsState<SlaPolicyRow>({
    entityName: "slaPolicies",
    searchFields: ["name", "trigger_type"] as (keyof SlaPolicyRow)[]
  });

  const { value: statuses = [] } = useSelector((s: RootState) => (s as any).statuses || { value: [] });
  const { value: categories = [] } = useSelector((s: RootState) => (s as any).categories || { value: [] });

  // Sync trigger type state with dialog open/editing
  useEffect(() => {
    if (isCreatePolicyOpen) {
      setCreatePolicyTriggerType('on_create');
      setCreatePolicyStatusId("");
    }
  }, [isCreatePolicyOpen]);

  useEffect(() => {
    if (editingPolicy) {
      setEditPolicyTriggerType((editingPolicy as any).trigger_type as any);
      setEditPolicyStatusId(String((editingPolicy as any).trigger_status_id ?? ''));
      setEditPolicyOperator((editingPolicy as any).trigger_operator || 'eq');
    }
  }, [editingPolicy]);

  // Remove the loading useEffects, rely on pre-loaded state.

  const columns = useMemo<ColDef[]>(() => [
    {
      field: "name",
      headerName: ta("grid.columns.name", "Name"),
      flex: 2,
      minWidth: 240,
      cellRenderer: (params: any) => {
        const isDisabled = params?.data?.enabled === false;
        const content = NameWithDescriptionRenderer(params);
        return (
          <div style={{ textDecoration: isDisabled ? 'line-through' : 'none' }}>
            {content}
          </div>
        );
      },
      wrapText: true,
      autoHeight: true,
      cellStyle: { whiteSpace: 'normal' },
      headerClass: 'whitespace-nowrap'
    },
    {
      field: "color",
      headerName: ta("grid.columns.color", "Color"),
      flex: 1,
      minWidth: 80,
      cellRenderer: ColorCellRenderer,
      headerClass: 'whitespace-nowrap'
    },
    {
      field: "response_time",
      headerName: ta("grid.columns.response", "Response (min)"),
      width: 170,
      valueFormatter: (p) => (p.value == null ? "-" : String(p.value)),
      headerClass: 'whitespace-nowrap'
    },
    {
      field: "resolution_time",
      headerName: ta("grid.columns.resolution", "Resolution (min)"),
      width: 190,
      valueFormatter: (p) => (p.value == null ? "-" : String(p.value)),
      headerClass: 'whitespace-nowrap'
    },
    {
      field: "sla_policy_id",
      headerName: ta("grid.columns.policy", "Policy"),
      width: 180,
      valueFormatter: (p) => {
        const id = p.value ? Number(p.value) : null;
        if (!id) return '-';
        const pol = (policies as any[]).find((x: any) => Number(x.id) === id);
        return pol?.name ?? `#${id}`;
      },
      headerClass: 'whitespace-nowrap'
    },
    { field: "enabled", headerName: ta("grid.columns.enabled", "Enabled"), flex: 1, minWidth: 120, headerClass: 'whitespace-nowrap', cellRenderer: (p: any) => (
      <Badge 
        variant={p.value ? "default" : "secondary"}
        className={p.value ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-gray-100 text-gray-800 hover:bg-gray-100"}
      >
        {p.value ? ta("grid.values.enabled", "Enabled") : ta("grid.values.disabled", "Disabled")}
      </Badge>
    ) }
  ], [handleEdit, handleDelete, policies, ta]);

  const policyColumns = useMemo<ColDef[]>(() => [
    { field: "name", headerName: ta("grid.columns.name", "Name"), flex: 2, minWidth: 200, cellRenderer: NameWithDescriptionRenderer },
    { field: "trigger_type", headerName: ta("grid.columns.trigger", "Trigger"), width: 140 },
    { field: "trigger_operator", headerName: ta("grid.columns.operator", "Operator"), width: 120, valueFormatter: (p: any) => p.value || 'eq' },
    { field: "grace_seconds", headerName: ta("grid.columns.grace", "Grace (sec)"), width: 140 },
    { field: "active", headerName: ta("grid.columns.enabled", "Enabled"), width: 120, cellRenderer: (p: any) => (
      <Badge 
        variant={p.value ? "default" : "secondary"}
        className={p.value ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-gray-100 text-gray-800 hover:bg-gray-100"}
      >
        {p.value ? ta("grid.values.enabled", "Enabled") : ta("grid.values.disabled", "Disabled")}
      </Badge>
    ) },
    {
      field: 'actions', headerName: ta("grid.columns.actions", "Actions"), width: 140,
      cellRenderer: createActionsCellRenderer({ onEdit: handleEditPolicy, onDelete: handleDeletePolicy }),
      sortable: false, filter: false, resizable: false, pinned: 'right'
    }
  ], [handleEditPolicy, handleDeletePolicy, ta]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const name = String(form.get("name") || "").trim();
    const description = String(form.get("description") || "").trim();
    const color = String(form.get("color") || "").trim();
    const enabled = form.get("enabled") === "on";
    const response = form.get("response_time");
    const resolution = form.get("resolution_time");
    if (!name) { setFormError(ta("validation.nameRequired", "Name is required")); return; }
    const responseNum = Number(response);
    const resolutionNum = Number(resolution);
    if (!response || isNaN(responseNum) || responseNum < 1) { setFormError(ta("validation.responseTimeRequired", "Response time must be at least 1 minute")); return; }
    if (!resolution || isNaN(resolutionNum) || resolutionNum < 1) { setFormError(ta("validation.resolutionTimeRequired", "Resolution time must be at least 1 minute")); return; }
    const payload: Omit<SlaRow, 'id'> = {
      name,
      description,
      color,
      enabled,
      response_time: responseNum,
      resolution_time: resolutionNum,
      sla_policy_id: form.get('sla_policy_id') ? Number(form.get('sla_policy_id')) : null
    } as any;
    await createItem(payload as any);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const form = new FormData(e.target as HTMLFormElement);
    const updates: Partial<SlaRow> = {
      name: String(form.get("name") || editingItem.name).trim(),
      description: form.get("description") !== null ? String(form.get("description") || '').trim() : editingItem.description,
      color: form.get("color") !== null ? String(form.get("color") || '').trim() : editingItem.color,
      enabled: form.get("enabled") === "on",
      response_time: form.get("response_time") ? Math.max(1, Number(form.get("response_time"))) : editingItem.response_time,
      resolution_time: form.get("resolution_time") ? Math.max(1, Number(form.get("resolution_time"))) : editingItem.resolution_time,
      sla_policy_id: form.get('sla_policy_id') ? Number(form.get('sla_policy_id')) : null
    };
    await updateItem(editingItem.id, updates as any);
  };

  // Default select first SLA on initial load
  useEffect(() => {
    if (selectedSlaId === '' && items.length) {
      setSelectedSlaId(items[0].id);
    }
  }, [items, selectedSlaId]);

  const alertColumns = useMemo<ColDef[]>(() => [
    { field: 'time', headerName: ta("grid.columns.time", "Time (min)"), width: 130 },
    { field: 'type', headerName: ta("grid.columns.type", "Type"), width: 130 },
    { field: 'notify_to', headerName: ta("grid.columns.notifyTo", "Notify To"), width: 160 },
    {
      field: 'actions', headerName: ta("grid.columns.actions", "Actions"), width: 140,
      cellRenderer: createActionsCellRenderer({ onEdit: handleEditAlert, onDelete: handleDeleteAlert }),
      sortable: false, filter: false, resizable: false, pinned: 'right'
    }
  ], [handleEditAlert, handleDeleteAlert, ta]);

  const visibleAlerts = useMemo(() => {
    const base = filteredAlerts;
    if (!selectedSlaId) return [] as SlaAlertRow[];
    return base.filter((a) => Number(a.sla_id) === Number(selectedSlaId));
  }, [filteredAlerts, selectedSlaId]);

  // Policy handlers
  const handleCreatePolicySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const name = String(form.get('name') || '').trim();
    const trigger_type = String(form.get('trigger_type') || 'on_create') as SlaPolicyRow['trigger_type'];
    const active = form.get('active') === 'on';
    const grace_seconds = Number(form.get('grace_seconds') || 0);
    if (!name) { setPoliciesFormError('Name is required'); return; }
    const payload: Omit<SlaPolicyRow, 'id'> = {
      name,
      description: String(form.get('description') || '').trim() || null,
      active,
      trigger_type,
      trigger_status_id: form.get('trigger_status_id') ? Number(form.get('trigger_status_id')) : null,
      trigger_field_id: form.get('trigger_field_id') ? Number(form.get('trigger_field_id')) : null,
      trigger_operator: (createPolicyTriggerType === 'on_field_value' ? createPolicyOperator : 'eq') as SlaPolicyRow['trigger_operator'],
      trigger_value_text: String(form.get('trigger_value_text') || '').trim() || null,
      trigger_value_number: form.get('trigger_value_number') ? Number(form.get('trigger_value_number')) : null,
      trigger_value_boolean: form.get('trigger_value_boolean') === 'true' ? true : (form.get('trigger_value_boolean') === 'false' ? false : null),
      grace_seconds: Math.max(0, grace_seconds),
    } as any;
    await createPolicy(payload as any);
  };

  const handleEditPolicySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    const form = new FormData(e.target as HTMLFormElement);
    const updates: Partial<SlaPolicyRow> = {
      name: String(form.get('name') || editingPolicy.name).trim(),
      description: String(form.get('description') ?? (editingPolicy.description || '')).trim(),
      active: form.get('active') ? (form.get('active') === 'on') : editingPolicy.active,
      trigger_type: (form.get('trigger_type') as any) || editingPolicy.trigger_type,
      trigger_status_id: form.get('trigger_status_id') ? Number(form.get('trigger_status_id')) : editingPolicy.trigger_status_id,
      trigger_field_id: form.get('trigger_field_id') ? Number(form.get('trigger_field_id')) : editingPolicy.trigger_field_id,
      trigger_operator: (editPolicyTriggerType === 'on_field_value' ? editPolicyOperator : 'eq') as SlaPolicyRow['trigger_operator'],
      trigger_value_text: String(form.get('trigger_value_text') ?? (editingPolicy.trigger_value_text || '')).trim(),
      trigger_value_number: form.get('trigger_value_number') ? Number(form.get('trigger_value_number')) : editingPolicy.trigger_value_number,
      trigger_value_boolean: form.get('trigger_value_boolean') ? (String(form.get('trigger_value_boolean')) === 'true') : editingPolicy.trigger_value_boolean ?? null,
      grace_seconds: form.get('grace_seconds') ? Math.max(0, Number(form.get('grace_seconds'))) : editingPolicy.grace_seconds,
    };
    await updatePolicy((editingPolicy as any).id, updates as any);
  };

  const handleCreateAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlaId) { setAlertsFormError(ta("validation.selectSlaFirst", "Select an SLA first")); return; }
    const form = new FormData(e.target as HTMLFormElement);
    const timeVal = Number(form.get('time'));
    const typeVal = String(form.get('type') || 'response');
    const notifyVal = String(form.get('notify_to') || 'RESPONSIBLE');
    if (!timeVal || timeVal < 1) { setAlertsFormError(ta("validation.timeRequired", "Time must be at least 1")); return; }
    await createAlert({ sla_id: Number(selectedSlaId), time: timeVal, type: typeVal as any, notify_to: notifyVal as any } as any);
  };

  const handleEditAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlert) return;
    const form = new FormData(e.target as HTMLFormElement);
    const updates: Partial<SlaAlertRow> = {
      time: form.get('time') ? Math.max(1, Number(form.get('time'))) : (editingAlert as any).time,
      type: (form.get('type') as any) || (editingAlert as any).type,
      notify_to: (form.get('notify_to') as any) || (editingAlert as any).notify_to
    };
    await updateAlert((editingAlert as any).id, updates as any);
  };

  return (
    <SettingsLayout
      title={ta("title", "SLAs")}
      description={ta("description", "Define and manage service level agreements")}
      icon={faStopwatch}
      iconColor="#14b8a6"
      backPath="/settings"
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as any)}
        className="h-full flex-1 min-h-0 flex flex-col"
      >
        <TabsList>
          <TabsTrigger value="slas">{ta("tabs.slas", "SLAs")}</TabsTrigger>
          <TabsTrigger value="alerts">{ta("tabs.alerts", "Alerts")}</TabsTrigger>
          <TabsTrigger value="policies">{ta("tabs.policies", "Policies")}</TabsTrigger>
          <TabsTrigger value="help">{ta("tabs.help", "Help")}</TabsTrigger>
        </TabsList>

        <TabsContent value="slas" className="flex-1 min-h-0 flex flex-col space-y-4">
          <div className="mt-1" />
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">{ta("manageDefinitions", "Manage SLA definitions")}</div>
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              {ta("addSla", "Add SLA")}
            </Button>
          </div>
          <SettingsGrid
            rowData={filteredItems}
            columnDefs={columns}
            noRowsMessage={ta("grid.noRows", "No SLAs found")}
            className="flex-1 min-h-0"
            height="100%"
            rowHeight={44}
            zebraRows
            onRowDoubleClicked={handleEdit as any}
          />
        </TabsContent>

        <TabsContent value="alerts" className="flex-1 min-h-0 flex flex-col space-y-4">
          <div className="mt-1" />
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm">SLA:</div>
            <select
              className="border rounded-md px-2 py-2 bg-white text-black dark:bg-neutral-800 dark:text-white"
              value={selectedSlaId}
              onChange={(e) => setSelectedSlaId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">{ta("selectSla", "Select SLA…")}</option>
              {items.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="ml-auto" />
            <Button size="sm" onClick={() => setIsCreateAlertOpen(true)} disabled={!selectedSlaId}>
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              {ta("addAlert", "Add Alert")}
            </Button>
          </div>
          <SettingsGrid
            rowData={visibleAlerts}
            columnDefs={alertColumns}
            noRowsMessage={selectedSlaId ? ta("grid.noAlerts", "No alerts for this SLA") : ta("selectSlaFirst", "Select an SLA to view alerts")}
            className="flex-1 min-h-0"
            height="100%"
            onRowDoubleClicked={handleEditAlert as any}
          />
        </TabsContent>

        <TabsContent value="policies" className="flex-1 min-h-0 flex flex-col space-y-4">
          <div className="mt-1" />
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">{ta("managePolicies", "Manage SLA policies (triggers and timing)")}</div>
            <Button size="sm" onClick={() => setIsCreatePolicyOpen(true)}>
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              {ta("addPolicy", "Add Policy")}
            </Button>
          </div>
          <SettingsGrid
            rowData={filteredPolicies}
            columnDefs={policyColumns}
            noRowsMessage={ta("grid.noPolicies", "No SLA policies found")}
            className="flex-1 min-h-0"
            height="100%"
            rowHeight={44}
            zebraRows
            onRowDoubleClicked={handleEditPolicy as any}
          />
        </TabsContent>

        <TabsContent value="help" className="flex-1 min-h-0 flex flex-col overflow-y-auto">
          <div className="p-6 space-y-8 max-w-4xl">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">{ta("help.title", "Understanding SLAs")}</h2>
              <p className="text-lg text-muted-foreground">
                {ta("help.description", "A quick guide to configuring Service Level Agreements and Alerts in Whagons.")}
              </p>
            </div>

            {/* What is an SLA */}
            <div className="rounded-lg border bg-card p-6 space-y-3">
              <h3 className="text-xl font-semibold">{ta("help.whatIsSla", "What is an SLA?")}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {ta("help.whatIsSlaDescription", "An SLA (Service Level Agreement) defines the expected response and resolution times for tasks or tickets. SLAs help teams meet customer expectations by tracking time-bound commitments and triggering alerts before breaches occur.")}
              </p>
            </div>

            {/* Core Fields */}
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <h3 className="text-xl font-semibold">{ta("help.coreFields", "Core fields")}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="font-medium text-sm">Name</div>
                  <div className="text-sm text-muted-foreground">The display name of the SLA</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-sm">Description</div>
                  <div className="text-sm text-muted-foreground">Optional context for when to use this SLA</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-sm">Color</div>
                  <div className="text-sm text-muted-foreground">A visual identifier used in the UI</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-sm">Enabled</div>
                  <div className="text-sm text-muted-foreground">Toggle to activate/deactivate the SLA without deleting it</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-sm">Response (minutes)</div>
                  <div className="text-sm text-muted-foreground">Target time to acknowledge or first respond</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-sm">Resolution (minutes)</div>
                  <div className="text-sm text-muted-foreground">Target time to fully resolve the issue</div>
                </div>
              </div>
            </div>

            {/* Alerts */}
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <h3 className="text-xl font-semibold">{ta("help.alerts", "Alerts")}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {ta("help.alertsDescription", "Alerts notify responsible people before an SLA is breached. Each alert is associated with a specific SLA.")}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <div className="font-medium text-sm">Time (minutes)</div>
                  <div className="text-sm text-muted-foreground">When to trigger the alert relative to the SLA target</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-sm">Type</div>
                  <div className="text-sm text-muted-foreground">Choose <code className="text-xs bg-muted px-1 py-0.5 rounded">response</code> or <code className="text-xs bg-muted px-1 py-0.5 rounded">resolution</code></div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-sm">Notify To</div>
                  <div className="text-sm text-muted-foreground">Recipient group: RESPONSIBLE, CREATED_BY, MANAGER, or TEAM</div>
                </div>
              </div>
            </div>

            {/* Best Practices */}
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <h3 className="text-xl font-semibold">{ta("help.bestPractices", "Best practices")}</h3>
              <ul className="space-y-2 list-none">
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-muted-foreground">{ta("help.bestPractices1", "Start with realistic targets; refine using historical data.")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-muted-foreground">{ta("help.bestPractices2", "Create multiple alerts (e.g., 50%, 80%, 100%) to escalate urgency.")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-muted-foreground">{ta("help.bestPractices3", "Use colors consistently to differentiate SLA tiers (e.g., Bronze/Silver/Gold).")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-muted-foreground">{ta("help.bestPractices4", "Disable instead of deleting SLAs you may reuse later.")}</span>
                </li>
              </ul>
            </div>

            {/* Example Configurations */}
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <h3 className="text-xl font-semibold">{ta("help.exampleConfigurations", "Example configurations")}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border bg-muted/50 p-4 space-y-2">
                  <div className="font-semibold">{ta("help.exampleStandard", "Standard Support")}</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>{ta("help.exampleStandardResponse", "Response: 60 min")}</li>
                    <li>{ta("help.exampleStandardResolution", "Resolution: 480 min")}</li>
                    <li>{ta("help.exampleStandardAlerts", "Alerts: 30 min (response), 240 min (resolution)")}</li>
                  </ul>
                </div>
                <div className="rounded-md border bg-muted/50 p-4 space-y-2">
                  <div className="font-semibold">{ta("help.examplePremium", "Premium")}</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>{ta("help.examplePremiumResponse", "Response: 15 min")}</li>
                    <li>{ta("help.examplePremiumResolution", "Resolution: 120 min")}</li>
                    <li>{ta("help.examplePremiumAlerts", "Alerts: 8 min (response), 60/90/110 min (resolution)")}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* How SLAs Work */}
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <h3 className="text-xl font-semibold">{ta("help.howItWorks", "How SLAs work in Whagons")}</h3>
              <ul className="space-y-2 list-none">
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-muted-foreground">{ta("help.howItWorks1", "SLAs and Alerts are cached locally (IndexedDB) for instant loading and offline use.")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-muted-foreground">{ta("help.howItWorks2", "Changes sync automatically via real-time updates; all clients see updates immediately.")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-muted-foreground">{ta("help.howItWorks3", "Optimistic updates keep the UI responsive; errors roll back safely.")}</span>
                </li>
              </ul>
            </div>

            {/* FAQ */}
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <h3 className="text-xl font-semibold">{ta("help.faq", "FAQ")}</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="font-medium">{ta("help.faqChangeTargets", "What happens if I change targets?")}</div>
                  <div className="text-sm text-muted-foreground">{ta("help.faqChangeTargetsAnswer", "Existing tasks use the updated SLA immediately for future checks.")}</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">{ta("help.faqDisabledSlas", "Do disabled SLAs keep alerts?")}</div>
                  <div className="text-sm text-muted-foreground">{ta("help.faqDisabledSlasAnswer", "Yes, alerts remain but won't trigger until re-enabled.")}</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">{ta("help.faqWhoReceives", "Who receives alerts?")}</div>
                  <div className="text-sm text-muted-foreground">{ta("help.faqWhoReceivesAnswer", "Based on the notify_to option for each alert.")}</div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <SettingsDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        type="create"
        title={ta("dialogs.create.title", "Add SLA")}
        onSubmit={handleCreateSubmit}
        isSubmitting={isSubmitting}
        error={formError}
      >
        <div className="grid gap-4">
          <TextField
            id="name"
            label={ta("dialogs.fields.name", "Name")}
            name="name"
            required
          />
          <TextField
            id="description"
            label={ta("dialogs.fields.description", "Description")}
            name="description"
          />
          <TextField
            id="color"
            label={ta("dialogs.fields.color", "Color")}
            name="color"
            type="color"
          />
          <CheckboxField
            id="enabled"
            label={ta("dialogs.fields.enabled", "Enabled")}
            name="enabled"
          />
          <TextField
            id="response_time"
            label={ta("dialogs.fields.responseTime", "Response (min)")}
            name="response_time"
            type="number"
            required
            placeholder={ta("dialogs.fields.placeholder.responseTime", "e.g. 30")}
          />
          <TextField
            id="resolution_time"
            label={ta("dialogs.fields.resolutionTime", "Resolution (min)")}
            name="resolution_time"
            type="number"
            required
            placeholder={ta("dialogs.fields.placeholder.resolutionTime", "e.g. 240")}
          />
        </div>
      </SettingsDialog>

      <SettingsDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        type="edit"
        title={ta("dialogs.edit.title", "Edit SLA")}
        onSubmit={handleEditSubmit}
        isSubmitting={isSubmitting}
        error={formError}
        submitDisabled={!editingItem}
        footerActions={
          editingItem ? (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => {
                setIsEditDialogOpen(false);
                handleDelete(editingItem);
              }}
              disabled={isSubmitting}
              title={ta("dialogs.delete.title", "Delete SLA")}
              aria-label={ta("dialogs.delete.title", "Delete SLA")}
            >
              <FontAwesomeIcon icon={faTrash} />
            </Button>
          ) : null
        }
      >
        {editingItem && (
          <div className="grid gap-4">
            <TextField
              id="edit-name"
              label={ta("dialogs.fields.name", "Name")}
              name="name"
              defaultValue={editingItem.name}
              required
            />
            <TextField
              id="edit-description"
              label={ta("dialogs.fields.description", "Description")}
              name="description"
              defaultValue={editingItem.description ?? ''}
            />
            <TextField
              id="edit-color"
              label={ta("dialogs.fields.color", "Color")}
              name="color"
              type="color"
              defaultValue={editingItem.color ?? '#000000'}
            />
            <CheckboxField
              id="edit-enabled"
              label={ta("dialogs.fields.enabled", "Enabled")}
              name="enabled"
              defaultChecked={!!editingItem.enabled}
            />
            <TextField
              id="edit-response_time"
              label={ta("dialogs.fields.responseTime", "Response (min)")}
              name="response_time"
              type="number"
              defaultValue={editingItem.response_time ?? ''}
            />
            <TextField
              id="edit-resolution_time"
              label={ta("dialogs.fields.resolutionTime", "Resolution (min)")}
              name="resolution_time"
              type="number"
              defaultValue={editingItem.resolution_time ?? ''}
            />
            <SelectField
              id="edit-sla_policy_id"
              label={ta("dialogs.fields.policy", "Policy")}
              name="sla_policy_id"
              defaultValue={editingItem.sla_policy_id ? String(editingItem.sla_policy_id) : undefined}
              placeholder={ta("dialogs.fields.none", "None")}
              options={policies.map(p => ({ value: p.id, label: p.name }))}
            />
          </div>
        )}
      </SettingsDialog>

      <SettingsDialog
        open={isDeleteDialogOpen}
        onOpenChange={handleCloseDeleteDialog}
        type="delete"
        title={ta("dialogs.delete.title", "Delete SLA")}
        entityName="SLA"
        entityData={deletingItem as any}
        onConfirm={() => deletingItem ? deleteItem(deletingItem.id) : undefined}
      />

      {/* Alerts: Create */}
      <SettingsDialog
        open={isCreateAlertOpen}
        onOpenChange={setIsCreateAlertOpen}
        type="create"
        title={ta("dialogs.createAlert.title", "Add SLA Alert")}
        onSubmit={handleCreateAlertSubmit}
        isSubmitting={alertsSubmitting}
        error={alertsFormError}
        submitDisabled={!selectedSlaId}
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time" className="text-right">{ta("dialogs.fields.time", "Time (min)")} *</Label>
            <input id="time" name="time" type="number" min="1" required className="col-span-3 px-3 py-2 border border-input bg-background rounded-md text-sm" placeholder={ta("dialogs.fields.placeholder.time", "e.g. 30")} />
          </div>
          <SelectField
            id="type"
            label={ta("dialogs.fields.type", "Type")}
            name="type"
            defaultValue="response"
            options={[
              { value: 'response', label: ta("dialogs.types.response", "response") },
              { value: 'resolution', label: ta("dialogs.types.resolution", "resolution") }
            ]}
            required
          />
          <SelectField
            id="notify_to"
            label={ta("dialogs.fields.notifyTo", "Notify To")}
            name="notify_to"
            defaultValue="RESPONSIBLE"
            options={[
              { value: 'RESPONSIBLE', label: ta("dialogs.notifyTo.responsible", "RESPONSIBLE") },
              { value: 'CREATED_BY', label: ta("dialogs.notifyTo.createdBy", "CREATED_BY") },
              { value: 'MANAGER', label: ta("dialogs.notifyTo.manager", "MANAGER") },
              { value: 'TEAM', label: ta("dialogs.notifyTo.team", "TEAM") }
            ]}
            required
          />
        </div>
      </SettingsDialog>

      {/* Alerts: Edit */}
      <SettingsDialog
        open={isEditAlertOpen}
        onOpenChange={setIsEditAlertOpen}
        type="edit"
        title={ta("dialogs.editAlert.title", "Edit SLA Alert")}
        onSubmit={handleEditAlertSubmit}
        isSubmitting={alertsSubmitting}
        error={alertsFormError}
        submitDisabled={!editingAlert}
        footerActions={
          editingAlert ? (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => {
                setIsEditAlertOpen(false);
                handleDeleteAlert(editingAlert);
              }}
              disabled={alertsSubmitting}
              title={ta("dialogs.deleteAlert.title", "Delete SLA Alert")}
              aria-label={ta("dialogs.deleteAlert.title", "Delete SLA Alert")}
            >
              <FontAwesomeIcon icon={faTrash} />
            </Button>
          ) : null
        }
      >
        {editingAlert && (
          <div className="grid gap-4">
            <TextField
              id="edit-time"
              label={ta("dialogs.fields.time", "Time (min)")}
              name="time"
              type="number"
              defaultValue={(editingAlert as any).time}
              required
            />
            <SelectField
              id="edit-type"
              label={ta("dialogs.fields.type", "Type")}
              name="type"
              defaultValue={(editingAlert as any).type}
              options={[
                { value: 'response', label: ta("dialogs.types.response", "response") },
                { value: 'resolution', label: ta("dialogs.types.resolution", "resolution") }
              ]}
              required
            />
            <SelectField
              id="edit-notify_to"
              label={ta("dialogs.fields.notifyTo", "Notify To")}
              name="notify_to"
              defaultValue={(editingAlert as any).notify_to}
              options={[
                { value: 'RESPONSIBLE', label: ta("dialogs.notifyTo.responsible", "RESPONSIBLE") },
                { value: 'CREATED_BY', label: ta("dialogs.notifyTo.createdBy", "CREATED_BY") },
                { value: 'MANAGER', label: ta("dialogs.notifyTo.manager", "MANAGER") },
                { value: 'TEAM', label: ta("dialogs.notifyTo.team", "TEAM") }
              ]}
              required
            />
          </div>
        )}
      </SettingsDialog>

      {/* Alerts: Delete */}
      <SettingsDialog
        open={isDeleteAlertOpen}
        onOpenChange={closeDeleteAlertDialog}
        type="delete"
        title={ta("dialogs.deleteAlert.title", "Delete SLA Alert")}
        entityName="SLA Alert"
        entityData={deletingAlert as any}
        onConfirm={() => deletingAlert ? deleteAlert((deletingAlert as any).id) : undefined}
      />

      {/* Policies: Create */}
      <SettingsDialog
        open={isCreatePolicyOpen}
        onOpenChange={setIsCreatePolicyOpen}
        type="create"
        title={ta("dialogs.createPolicy.title", "Add SLA Policy")}
        onSubmit={handleCreatePolicySubmit}
        isSubmitting={policiesSubmitting}
        error={policiesFormError}
      >
        <div className="grid gap-4">
          <TextField
            id="pol-name"
            label={ta("dialogs.fields.name", "Name")}
            name="name"
            required
          />
          <TextField
            id="pol-description"
            label={ta("dialogs.fields.description", "Description")}
            name="description"
          />
          <CheckboxField
            id="pol-active"
            label={ta("dialogs.fields.active", "Active")}
            name="active"
          />
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{ta("dialogs.fields.trigger", "Trigger")}</Label>
            <div className="col-span-3">
              <Select value={createPolicyTriggerType} onValueChange={(v) => setCreatePolicyTriggerType(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder={ta("dialogs.fields.selectTrigger", "Select trigger")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_create">{ta("dialogs.triggers.onCreate", "on_create")}</SelectItem>
                  <SelectItem value="on_status_change">{ta("dialogs.triggers.onStatusChange", "on_status_change")}</SelectItem>
                  <SelectItem value="on_field_value">{ta("dialogs.triggers.onFieldValue", "on_field_value")}</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="trigger_type" value={createPolicyTriggerType} />
            </div>
          </div>
          {createPolicyTriggerType === 'on_status_change' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{ta("dialogs.fields.triggerStatus", "Status (if status change)")}</Label>
              <div className="col-span-3">
                <Select value={createPolicyStatusId || undefined} onValueChange={(v) => setCreatePolicyStatusId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={ta("dialogs.fields.selectStatus", "Select status")} />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="trigger_status_id" value={createPolicyStatusId} />
              </div>
            </div>
          )}
          {createPolicyTriggerType === 'on_field_value' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pol-trigger_field_id" className="text-right">{ta("dialogs.fields.triggerField", "Field (if field value)")}</Label>
                <input id="pol-trigger_field_id" name="trigger_field_id" type="number" className="col-span-3 px-3 py-2 border rounded-md" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{ta("dialogs.fields.operator", "Operator")}</Label>
                <div className="col-span-3">
                  <Select value={createPolicyOperator} onValueChange={(v) => setCreatePolicyOperator(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={ta("dialogs.fields.selectOperator", "Select operator")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eq">{ta("dialogs.operators.eq", "Equals (eq)")}</SelectItem>
                      <SelectItem value="neq">{ta("dialogs.operators.neq", "Not equals (neq)")}</SelectItem>
                      <SelectItem value="gt">{ta("dialogs.operators.gt", "Greater than (gt)")}</SelectItem>
                      <SelectItem value="gte">{ta("dialogs.operators.gte", "Greater or equal (gte)")}</SelectItem>
                      <SelectItem value="lt">{ta("dialogs.operators.lt", "Less than (lt)")}</SelectItem>
                      <SelectItem value="lte">{ta("dialogs.operators.lte", "Less or equal (lte)")}</SelectItem>
                      <SelectItem value="contains">{ta("dialogs.operators.contains", "Contains")}</SelectItem>
                      <SelectItem value="in">{ta("dialogs.operators.in", "In list (comma-separated)")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pol-trigger_value_text" className="text-right">{ta("dialogs.fields.valueText", "Value (text)")}</Label>
                <input id="pol-trigger_value_text" name="trigger_value_text" className="col-span-3 px-3 py-2 border rounded-md" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pol-trigger_value_number" className="text-right">{ta("dialogs.fields.valueNumber", "Value (number)")}</Label>
                <input id="pol-trigger_value_number" name="trigger_value_number" type="number" className="col-span-3 px-3 py-2 border rounded-md" />
              </div>
              <SelectField
                id="pol-trigger_value_boolean"
                label={ta("dialogs.fields.valueBoolean", "Value (boolean)")}
                name="trigger_value_boolean"
                placeholder="-"
                options={[
                  { value: 'true', label: 'true' },
                  { value: 'false', label: 'false' }
                ]}
              />
            </>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pol-grace_seconds" className="text-right">{ta("dialogs.fields.graceSeconds", "Grace (sec)")}</Label>
            <input id="pol-grace_seconds" name="grace_seconds" type="number" min="0" className="col-span-3 px-3 py-2 border rounded-md" />
          </div>
        </div>
      </SettingsDialog>

      {/* Policies: Edit */}
      <SettingsDialog
        open={isEditPolicyOpen}
        onOpenChange={setIsEditPolicyOpen}
        type="edit"
        title={ta("dialogs.editPolicy.title", "Edit SLA Policy")}
        onSubmit={handleEditPolicySubmit}
        isSubmitting={policiesSubmitting}
        error={policiesFormError}
        submitDisabled={!editingPolicy}
        footerActions={
          editingPolicy ? (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => {
                setIsEditPolicyOpen(false);
                handleDeletePolicy(editingPolicy);
              }}
              disabled={policiesSubmitting}
              title={ta("dialogs.deletePolicy.title", "Delete SLA Policy")}
              aria-label={ta("dialogs.deletePolicy.title", "Delete SLA Policy")}
            >
              <FontAwesomeIcon icon={faTrash} />
            </Button>
          ) : null
        }
      >
        {editingPolicy && (
          <div className="grid gap-4">
            <TextField
              id="pol-edit-name"
              label={ta("dialogs.fields.name", "Name")}
              name="name"
              defaultValue={(editingPolicy as any).name}
              required
            />
            <TextField
              id="pol-edit-description"
              label={ta("dialogs.fields.description", "Description")}
              name="description"
              defaultValue={(editingPolicy as any).description ?? ''}
            />
            <CheckboxField
              id="pol-edit-active"
              label={ta("dialogs.fields.active", "Active")}
              name="active"
              defaultChecked={!!(editingPolicy as any).active}
            />
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{ta("dialogs.fields.trigger", "Trigger")}</Label>
              <div className="col-span-3">
                <Select value={editPolicyTriggerType} onValueChange={(v) => setEditPolicyTriggerType(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder={ta("dialogs.fields.selectTrigger", "Select trigger")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_create">{ta("dialogs.triggers.onCreate", "on_create")}</SelectItem>
                    <SelectItem value="on_status_change">{ta("dialogs.triggers.onStatusChange", "on_status_change")}</SelectItem>
                    <SelectItem value="on_field_value">{ta("dialogs.triggers.onFieldValue", "on_field_value")}</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="trigger_type" value={editPolicyTriggerType} />
              </div>
            </div>
            {editPolicyTriggerType === 'on_status_change' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{ta("dialogs.fields.triggerStatus", "Status (if status change)")}</Label>
                <div className="col-span-3">
                  <Select value={editPolicyStatusId || undefined} onValueChange={(v) => setEditPolicyStatusId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={ta("dialogs.fields.selectStatus", "Select status")} />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="trigger_status_id" value={editPolicyStatusId} />
                </div>
              </div>
            )}
            {editPolicyTriggerType === 'on_field_value' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pol-edit-trigger_field_id" className="text-right">{ta("dialogs.fields.triggerField", "Field (if field value)")}</Label>
                  <input id="pol-edit-trigger_field_id" name="trigger_field_id" type="number" defaultValue={(editingPolicy as any).trigger_field_id ?? ''} className="col-span-3 px-3 py-2 border rounded-md" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">{ta("dialogs.fields.operator", "Operator")}</Label>
                  <div className="col-span-3">
                    <Select value={editPolicyOperator} onValueChange={(v) => setEditPolicyOperator(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={ta("dialogs.fields.selectOperator", "Select operator")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eq">{ta("dialogs.operators.eq", "Equals (eq)")}</SelectItem>
                        <SelectItem value="neq">{ta("dialogs.operators.neq", "Not equals (neq)")}</SelectItem>
                        <SelectItem value="gt">{ta("dialogs.operators.gt", "Greater than (gt)")}</SelectItem>
                        <SelectItem value="gte">{ta("dialogs.operators.gte", "Greater or equal (gte)")}</SelectItem>
                        <SelectItem value="lt">{ta("dialogs.operators.lt", "Less than (lt)")}</SelectItem>
                        <SelectItem value="lte">{ta("dialogs.operators.lte", "Less or equal (lte)")}</SelectItem>
                        <SelectItem value="contains">{ta("dialogs.operators.contains", "Contains")}</SelectItem>
                        <SelectItem value="in">{ta("dialogs.operators.in", "In list (comma-separated)")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pol-edit-trigger_value_text" className="text-right">{ta("dialogs.fields.valueText", "Value (text)")}</Label>
                  <input id="pol-edit-trigger_value_text" name="trigger_value_text" defaultValue={(editingPolicy as any).trigger_value_text ?? ''} className="col-span-3 px-3 py-2 border rounded-md" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pol-edit-trigger_value_number" className="text-right">{ta("dialogs.fields.valueNumber", "Value (number)")}</Label>
                  <input id="pol-edit-trigger_value_number" name="trigger_value_number" type="number" defaultValue={(editingPolicy as any).trigger_value_number ?? ''} className="col-span-3 px-3 py-2 border rounded-md" />
                </div>
                <SelectField
                  id="pol-edit-trigger_value_boolean"
                  label={ta("dialogs.fields.valueBoolean", "Value (boolean)")}
                  name="trigger_value_boolean"
                  defaultValue={(editingPolicy as any).trigger_value_boolean != null ? String((editingPolicy as any).trigger_value_boolean) : undefined}
                  placeholder="-"
                  options={[
                    { value: 'true', label: 'true' },
                    { value: 'false', label: 'false' }
                  ]}
                />
              </>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pol-edit-grace_seconds" className="text-right">{ta("dialogs.fields.graceSeconds", "Grace (sec)")}</Label>
              <input id="pol-edit-grace_seconds" name="grace_seconds" type="number" min="0" defaultValue={(editingPolicy as any).grace_seconds} className="col-span-3 px-3 py-2 border rounded-md" />
            </div>
          </div>
        )}
      </SettingsDialog>

      {/* Policies: Delete */}
      <SettingsDialog
        open={isDeletePolicyOpen}
        onOpenChange={closeDeletePolicyDialog}
        type="delete"
        title={ta("dialogs.deletePolicy.title", "Delete SLA Policy")}
        entityName="SLA Policy"
        entityData={deletingPolicy as any}
        onConfirm={() => deletingPolicy ? deletePolicy((deletingPolicy as any).id) : undefined}
      />
    </SettingsLayout>
  );
}

export default Slas;
