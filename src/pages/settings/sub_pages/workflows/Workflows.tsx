import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiagramProject } from "@fortawesome/free-solid-svg-icons";
import { SettingsLayout } from "../../components";
import { SettingsGrid } from "../../components/SettingsGrid";
import type { ColDef } from "ag-grid-community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { genericActions } from "@/store/genericSlices";
import type { AppDispatch, RootState } from "@/store/store";
import type { Workflow } from "@/store/types";
import { api } from "@/store/api/internalApi";
import { useLanguage } from "@/providers/LanguageProvider";

import { WorkflowBuilder } from "./WorkflowBuilder";
import { TRIGGER_EVENT_OPTIONS, WORKFLOW_TEMPLATES } from "./constants";
import type {
  WorkflowFlowNode,
  WorkflowFlowEdge,
  ApiWorkflow,
  ApiWorkflowRun,
  ApiWorkflowRunLog,
} from "./types";
import {
  apiNodesToFlow,
  apiEdgesToFlow,
  flowNodesToApi,
  flowEdgesToApi,
  newNodeId,
} from "./types";

// ─── Default trigger node for new workflows ──────────────────────

function createDefaultNodes(): WorkflowFlowNode[] {
  const id = newNodeId("trigger");
  return [
    {
      id,
      type: "trigger",
      position: { x: 300, y: 80 },
      data: {
        label: "Trigger",
        nodeType: "trigger",
        config: { event: TRIGGER_EVENT_OPTIONS[0].value },
      },
    },
  ];
}

// ─── Component ───────────────────────────────────────────────────

function Workflows() {
  const { t } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const workflowsState = useSelector((s: RootState) => (s as any).workflows);
  const workflows: Workflow[] = workflowsState?.value ?? [];
  const workflowsLoading = workflowsState?.loading;
  const workflowsError = workflowsState?.error;

  // ─── Editor state ──────────────────────────────────────────────
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ApiWorkflow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // ─── Flow graph state ──────────────────────────────────────────
  const nodesRef = useRef<WorkflowFlowNode[]>(createDefaultNodes());
  const edgesRef = useRef<WorkflowFlowEdge[]>([]);
  const [flowKey, setFlowKey] = useState(0); // Force remount on workflow change

  // ─── Run history / test run overlay ────────────────────────────
  const [runHistory, setRunHistory] = useState<ApiWorkflowRun[]>([]);
  const [testRunLogs, setTestRunLogs] = useState<ApiWorkflowRunLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // ─── Grid columns ─────────────────────────────────────────────

  const workflowColumns = useMemo<ColDef[]>(
    () => [
      { headerName: t("settings.workflows.grid.columns.name"), field: "name", flex: 1, minWidth: 180, tooltipField: "name" },
      { headerName: t("settings.workflows.grid.columns.description"), field: "description", flex: 1.4, minWidth: 220, tooltipField: "description" },
      {
        headerName: t("settings.workflows.grid.columns.status"),
        valueGetter: (p) => (p.data?.is_active ? t("settings.workflows.grid.values.status.active") : t("settings.workflows.grid.values.status.draft")),
        width: 120,
        cellRenderer: (p: any) => {
          const isActive = p.value === t("settings.workflows.grid.values.status.active");
          return (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? "bg-green-500/15 text-green-600" : "bg-muted text-muted-foreground"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
              {p.value}
            </span>
          );
        },
      },
      {
        headerName: t("settings.workflows.grid.columns.updated"),
        valueGetter: (p) => {
          const d = p.data?.updated_at || p.data?.created_at;
          return d ? new Date(d).toLocaleDateString() : "-";
        },
        width: 140,
      },
    ],
    [t]
  );

  // ─── Load workflow into editor ─────────────────────────────────

  const openEditor = useCallback(async (workflow?: Workflow) => {
    setApiError(null);
    setStatusMessage(null);
    setTestRunLogs([]);
    setRunHistory([]);
    setShowHistory(false);
    setSelectedNodeId(null);

    if (workflow) {
      // Fetch full detail (with version nodes/edges and runs)
      try {
        const res = await api.get(`/workflows/${workflow.id}`);
        const full: ApiWorkflow = res.data?.data ?? res.data;
        setEditingWorkflow(full);
        setName(full.name);
        setDescription(full.description ?? "");

        const version = full.current_version;
        if (version?.nodes) {
          nodesRef.current = apiNodesToFlow(version.nodes);
        } else {
          nodesRef.current = createDefaultNodes();
        }
        edgesRef.current = version?.edges ? apiEdgesToFlow(version.edges) : [];

        if (full.runs) {
          setRunHistory(full.runs);
        }
      } catch {
        // Fall back to basic data from Redux
        setEditingWorkflow(workflow as unknown as ApiWorkflow);
        setName(workflow.name);
        setDescription(workflow.description ?? "");
        nodesRef.current = createDefaultNodes();
        edgesRef.current = [];
      }
    } else {
      setEditingWorkflow(null);
      setName(t("settings.workflows.defaults.untitled", "Untitled workflow"));
      setDescription("");
      nodesRef.current = createDefaultNodes();
      edgesRef.current = [];
    }

    setIsDirty(false);
    setFlowKey((k) => k + 1);
    setIsEditorOpen(true);
  }, [t]);

  // ─── Save ──────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setApiError(t("settings.workflows.messages.nameRequired"));
      return;
    }

    setIsSaving(true);
    setApiError(null);

    const payload = {
      name,
      description,
      metadata: { builder_version: 2 },
      nodes: flowNodesToApi(nodesRef.current).map((n) => ({
        ...n,
        position_x: n.position.x,
        position_y: n.position.y,
      })),
      edges: flowEdgesToApi(edgesRef.current),
    };

    try {
      if (editingWorkflow?.id) {
        await dispatch(genericActions.workflows.updateAsync({ id: editingWorkflow.id, updates: payload })).unwrap();
        setStatusMessage(t("settings.workflows.messages.updated"));
        // Re-open to reload version data
        const latest = workflows.find((w) => w.id === editingWorkflow.id);
        if (latest) await openEditor(latest);
      } else {
        const created = await dispatch(genericActions.workflows.addAsync(payload as any)).unwrap();
        setStatusMessage(t("settings.workflows.messages.created"));
        if (created) {
          await openEditor(created as Workflow);
        }
      }
      setIsDirty(false);
    } catch (e: any) {
      setApiError(e?.message ?? t("settings.workflows.messages.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }, [name, description, editingWorkflow, dispatch, workflows, openEditor, t]);

  // ─── Activate / Deactivate ─────────────────────────────────────

  const handleActivate = useCallback(async () => {
    if (!editingWorkflow?.id || !editingWorkflow.current_version_id) {
      setApiError(t("settings.workflows.messages.saveFirst"));
      return;
    }
    setIsActivating(true);
    setApiError(null);
    try {
      await api.post(`/workflows/${editingWorkflow.id}/activate`, {
        version_id: editingWorkflow.current_version_id,
      });
      setStatusMessage(t("settings.workflows.messages.activated"));
      setIsDirty(false);
      const latest = workflows.find((w) => w.id === editingWorkflow.id);
      if (latest) await openEditor(latest);
    } catch (e: any) {
      setApiError(e?.response?.data?.message ?? t("settings.workflows.messages.activateFailed"));
    } finally {
      setIsActivating(false);
    }
  }, [editingWorkflow, workflows, openEditor, t]);

  const handleDeactivate = useCallback(async () => {
    if (!editingWorkflow?.id) return;
    setIsActivating(true);
    setApiError(null);
    try {
      await api.post(`/workflows/${editingWorkflow.id}/deactivate`);
      setStatusMessage(t("settings.workflows.messages.deactivated"));
      const latest = workflows.find((w) => w.id === editingWorkflow.id);
      if (latest) await openEditor(latest);
    } catch (e: any) {
      setApiError(e?.response?.data?.message ?? t("settings.workflows.messages.deactivateFailed"));
    } finally {
      setIsActivating(false);
    }
  }, [editingWorkflow, workflows, openEditor, t]);

  // ─── Test Run ──────────────────────────────────────────────────

  const handleTestRun = useCallback(async () => {
    if (!editingWorkflow?.id) {
      setApiError(t("settings.workflows.messages.saveBeforeTest"));
      return;
    }
    setIsTesting(true);
    setApiError(null);
    setTestRunLogs([]);
    try {
      const res = await api.post(`/workflows/${editingWorkflow.id}/test`, {
        trigger_source: "manual",
        data: { preview: true },
      });
      const run: ApiWorkflowRun = res.data?.data ?? res.data;
      setStatusMessage(t("settings.workflows.messages.testRunRecorded", `Test run #${run.id} recorded (${run.status}).`)
        .replace("{id}", String(run.id))
        .replace("{status}", run.status));
      if (run.logs) {
        setTestRunLogs(run.logs);
      }
      // Refresh run history
      setRunHistory((prev) => [run, ...prev].slice(0, 10));
    } catch (e: any) {
      setApiError(e?.response?.data?.message ?? t("settings.workflows.messages.testRunFailed"));
    } finally {
      setIsTesting(false);
    }
  }, [editingWorkflow, t]);

  // ─── Delete ────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!editingWorkflow?.id) return;
    setIsDeleting(true);
    setApiError(null);
    try {
      await dispatch(genericActions.workflows.removeAsync(editingWorkflow.id)).unwrap();
      setStatusMessage(t("settings.workflows.messages.deleted"));
      setIsEditorOpen(false);
    } catch (e: any) {
      setApiError(e?.message ?? t("settings.workflows.messages.deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  }, [editingWorkflow, dispatch, t]);

  // ─── Template loading ──────────────────────────────────────────

  const handleLoadTemplate = useCallback(
    (templateId: string) => {
      const tpl = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
      if (!tpl) return;

      setEditingWorkflow(null);
      setName(tpl.name);
      setDescription(tpl.description);
      nodesRef.current = tpl.nodes as WorkflowFlowNode[];
      edgesRef.current = tpl.edges as WorkflowFlowEdge[];
      setIsDirty(true);
      setFlowKey((k) => k + 1);
      setShowTemplatePicker(false);
      setIsEditorOpen(true);
    },
    []
  );

  // ─── Render ────────────────────────────────────────────────────

  const fetchErrorMessage = workflowsError
    ? t("settings.workflows.error")
    : null;

  const workflowCount = workflows.length;
  const workflowCountText = t("settings.workflows.count", `${workflowCount} workflow${workflowCount === 1 ? "" : "s"}`)
    .replace("{count}", String(workflowCount))
    .replace("{plural}", workflowCount === 1 ? "" : "s");

  return (
    <SettingsLayout
      title={t("settings.workflows.title")}
      description={t("settings.workflows.description")}
      icon={faDiagramProject}
      iconColor="#06b6d4"
      backPath="/settings"
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTemplatePicker(true)}
          >
            {t("settings.workflows.header.fromTemplate")}
          </Button>
          <Button
            onClick={() => openEditor()}
            size="default"
            className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-[0.98]"
          >
            {t("settings.workflows.header.createWorkflow")}
          </Button>
        </div>
      }
    >
      <div className="flex h-full flex-col gap-4">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            {workflowCountText}
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder={t("settings.workflows.search.placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
          </div>
        </div>

        {fetchErrorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {fetchErrorMessage}
          </div>
        )}

        {/* Workflow list grid */}
        <div className="flex-1 min-h-0 rounded-lg border bg-card p-2">
          <SettingsGrid
            rowData={workflows}
            columnDefs={workflowColumns}
            rowSelection="single"
            quickFilterText={searchTerm}
            noRowsMessage={t("settings.workflows.grid.noRows")}
            onRowClicked={(row) => row?.id && openEditor(row as unknown as Workflow)}
            onRowDoubleClicked={(row) => row?.id && openEditor(row as unknown as Workflow)}
          />
        </div>
      </div>

      {/* ─── Editor Dialog ─────────────────────────────────────── */}
      <Dialog open={isEditorOpen} onOpenChange={(open) => setIsEditorOpen(open)}>
        <DialogContent className="!max-w-[98vw] !w-[98vw] !max-h-[94vh] !h-[94vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {editingWorkflow?.id ? t("settings.workflows.dialogs.edit.title") : t("settings.workflows.dialogs.create.title")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
            {/* Meta fields row */}
            <div className="flex flex-wrap items-end gap-4 shrink-0">
              <div className="flex-1 min-w-[200px] space-y-1">
                <Label className="text-xs">{t("settings.workflows.dialogs.fields.name")}</Label>
                <Input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                  placeholder={t("settings.workflows.dialogs.fields.namePlaceholder")}
                />
              </div>
              <div className="flex-1 min-w-[200px] space-y-1">
                <Label className="text-xs">{t("settings.workflows.dialogs.fields.description")}</Label>
                <Input
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setIsDirty(true); }}
                  placeholder={t("settings.workflows.dialogs.fields.descriptionPlaceholder")}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? t("settings.workflows.dialogs.buttons.saving") : editingWorkflow?.id ? t("settings.workflows.dialogs.buttons.save") : t("settings.workflows.dialogs.buttons.create")}
                </Button>
                {editingWorkflow?.id && (
                  editingWorkflow.is_active ? (
                    <Button variant="outline" onClick={handleDeactivate} disabled={isActivating}>
                      {isActivating ? t("settings.workflows.dialogs.buttons.activating") : t("settings.workflows.dialogs.buttons.deactivate")}
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={handleActivate} disabled={isActivating || !editingWorkflow.current_version_id}>
                      {isActivating ? t("settings.workflows.dialogs.buttons.activating") : t("settings.workflows.dialogs.buttons.activate")}
                    </Button>
                  )
                )}
                {editingWorkflow?.id && (
                  <Button variant="outline" onClick={handleTestRun} disabled={isTesting}>
                    {isTesting ? t("settings.workflows.dialogs.buttons.testing") : t("settings.workflows.dialogs.buttons.testRun")}
                  </Button>
                )}
                {editingWorkflow?.id && (
                  <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
                    {t("settings.workflows.dialogs.buttons.history")}
                  </Button>
                )}
                {editingWorkflow?.id && (
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? t("settings.workflows.dialogs.buttons.deleting") : t("settings.workflows.dialogs.buttons.delete")}
                  </Button>
                )}
              </div>
            </div>

            {/* Status messages */}
            {apiError && <div className="text-sm text-red-600 shrink-0">{apiError}</div>}
            {statusMessage && <div className="text-sm text-emerald-600 shrink-0">{statusMessage}</div>}
            {isDirty && (
              <div className="text-xs text-yellow-600 shrink-0">{t("settings.workflows.dialogs.status.unsavedChanges")}</div>
            )}

            {/* Builder canvas */}
            <div className="flex-1 min-h-0">
              <WorkflowBuilder
                key={flowKey}
                initialNodes={nodesRef.current}
                initialEdges={edgesRef.current}
                onNodesChange={(n) => { nodesRef.current = n; }}
                onEdgesChange={(e) => { edgesRef.current = e; }}
                onDirty={() => setIsDirty(true)}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                runLogs={testRunLogs}
              />
            </div>

            {/* Run history panel */}
            {showHistory && runHistory.length > 0 && (
              <div className="shrink-0 max-h-40 overflow-auto rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">{t("settings.workflows.history.recentRuns")}</div>
                {runHistory.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-xs cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      if (run.logs) setTestRunLogs(run.logs);
                    }}
                  >
                    <span className={`font-semibold capitalize ${run.status === "completed" ? "text-green-600" : run.status === "failed" ? "text-red-600" : "text-yellow-600"}`}>
                      {run.status}
                    </span>
                    <span className="text-muted-foreground">
                      {run.trigger_source}
                    </span>
                    <span className="text-muted-foreground">
                      {run.started_at ? new Date(run.started_at).toLocaleString() : t("settings.workflows.history.pending")}
                    </span>
                    {run.error_message && (
                      <span className="text-red-500 truncate max-w-[200px]">
                        {run.error_message}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* ─── Template Picker Dialog ─────────────────────────────── */}
      <Dialog open={showTemplatePicker} onOpenChange={setShowTemplatePicker}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("settings.workflows.template.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {WORKFLOW_TEMPLATES.map((tpl) => {
              const nodeCount = tpl.nodes.length;
              const nodeCountText = t("settings.workflows.template.nodeCount", `${nodeCount} node${nodeCount !== 1 ? "s" : ""}`)
                .replace("{count}", String(nodeCount))
                .replace("{plural}", nodeCount === 1 ? "" : "s");
              return (
                <button
                  key={tpl.id}
                  onClick={() => handleLoadTemplate(tpl.id)}
                  className="w-full text-left rounded-lg border p-4 hover:bg-muted/50 transition-colors space-y-1"
                >
                  <div className="font-medium">{tpl.name}</div>
                  <div className="text-sm text-muted-foreground">{tpl.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {nodeCountText}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}

export default Workflows;
