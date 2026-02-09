import type { Node, Edge } from "@xyflow/react";

// ─── Node types used in the workflow builder ───────────────────────

export type WorkflowNodeType = "trigger" | "condition" | "action" | "branch" | "delay";

// ─── Node data carried inside React Flow nodes ────────────────────

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: WorkflowNodeType;
  config: Record<string, any>;
  /** Optional run status overlay during test runs */
  runStatus?: "pending" | "running" | "completed" | "failed" | "skipped" | "waiting";
  runMessage?: string;
}

export type WorkflowFlowNode = Node<WorkflowNodeData>;
export type WorkflowFlowEdge = Edge;

// ─── API payload shapes ───────────────────────────────────────────

export interface ApiWorkflowNode {
  id?: number;
  node_key: string;
  type: WorkflowNodeType;
  label: string;
  config: Record<string, any>;
  position: { x: number; y: number };
  metadata?: Record<string, any> | null;
}

export interface ApiWorkflowEdge {
  id?: number;
  source_node_key: string;
  target_node_key: string;
  label?: string;
  metadata?: Record<string, any> | null;
}

export interface ApiWorkflowVersion {
  id: number;
  workflow_id: number;
  version_number: number;
  status: string;
  change_notes?: string | null;
  metadata?: Record<string, any> | null;
  nodes?: ApiWorkflowNode[];
  edges?: ApiWorkflowEdge[];
  created_at: string;
  updated_at: string;
}

export interface ApiWorkflow {
  id: number;
  name: string;
  description?: string | null;
  workspace_id?: number | null;
  is_active: boolean;
  current_version_id?: number | null;
  activated_at?: string | null;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
  current_version?: ApiWorkflowVersion | null;
  versions?: ApiWorkflowVersion[];
  runs?: ApiWorkflowRun[];
}

export interface ApiWorkflowRunLog {
  id: number;
  node_key?: string | null;
  action_type?: string | null;
  status: string;
  message?: string | null;
  payload?: Record<string, any> | null;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface ApiWorkflowRun {
  id: number;
  workflow_id: number;
  trigger_source: string;
  status: string;
  trigger_payload?: Record<string, any> | null;
  started_at?: string | null;
  finished_at?: string | null;
  error_message?: string | null;
  logs?: ApiWorkflowRunLog[];
}

// ─── Conversion helpers ───────────────────────────────────────────

let _counter = 0;
export const newNodeId = (prefix = "node") => `${prefix}_${Date.now()}_${_counter++}`;

export function apiNodesToFlow(apiNodes: ApiWorkflowNode[]): WorkflowFlowNode[] {
  return apiNodes.map((n) => ({
    id: n.node_key,
    type: n.type === "branch" ? "branch" : n.type,
    position: { x: n.position?.x ?? 0, y: n.position?.y ?? 0 },
    data: {
      label: n.label,
      nodeType: n.type,
      config: n.config ?? {},
    },
  }));
}

export function apiEdgesToFlow(apiEdges: ApiWorkflowEdge[]): WorkflowFlowEdge[] {
  return apiEdges.map((e, i) => ({
    id: `e-${e.source_node_key}-${e.target_node_key}-${i}`,
    source: e.source_node_key,
    target: e.target_node_key,
    label: e.label || undefined,
    type: "smoothstep",
    animated: true,
  }));
}

export function flowNodesToApi(nodes: WorkflowFlowNode[]): ApiWorkflowNode[] {
  return nodes.map((n) => ({
    node_key: n.id,
    type: (n.data?.nodeType ?? n.type ?? "action") as WorkflowNodeType,
    label: n.data?.label ?? "Node",
    config: n.data?.config ?? {},
    position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
  }));
}

export function flowEdgesToApi(edges: WorkflowFlowEdge[]): ApiWorkflowEdge[] {
  return edges.map((e) => ({
    source_node_key: e.source,
    target_node_key: e.target,
    label: typeof e.label === "string" ? e.label : undefined,
  }));
}
