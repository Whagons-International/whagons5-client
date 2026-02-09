import { useCallback, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type OnConnect,
  type NodeTypes,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { TriggerNode } from "./nodes/TriggerNode";
import { ActionNode } from "./nodes/ActionNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { BranchNode } from "./nodes/BranchNode";
import { DelayNode } from "./nodes/DelayNode";
import { WebhookNode } from "./nodes/WebhookNode";
import { WorkflowNodePalette } from "./WorkflowNodePalette";
import { WorkflowConfigPanel } from "./WorkflowConfigPanel";
import type { WorkflowFlowNode, WorkflowFlowEdge, WorkflowNodeType, WorkflowNodeData, ApiWorkflowRunLog } from "./types";
import { newNodeId } from "./types";
import { TRIGGER_EVENT_OPTIONS, ACTION_TYPE_OPTIONS } from "./constants";

// ─── Custom node type registry ─────────────────────────────────────

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  branch: BranchNode,
  delay: DelayNode,
  webhook: WebhookNode,
};

// ─── Props ──────────────────────────────────────────────────────────

interface WorkflowBuilderProps {
  initialNodes: WorkflowFlowNode[];
  initialEdges: WorkflowFlowEdge[];
  onNodesChange: (nodes: WorkflowFlowNode[]) => void;
  onEdgesChange: (edges: WorkflowFlowEdge[]) => void;
  onDirty: () => void;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  runLogs?: ApiWorkflowRunLog[];
}

export function WorkflowBuilder({
  initialNodes,
  initialEdges,
  onNodesChange: onNodesExternal,
  onEdgesChange: onEdgesExternal,
  onDirty,
  selectedNodeId,
  onSelectNode,
  runLogs,
}: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Sync external state whenever nodes or edges change
  const handleNodesChange: typeof onNodesChangeInternal = useCallback(
    (changes) => {
      onNodesChangeInternal(changes);
      onDirty();
      // We use a microtask to read current state after React processes the change
      queueMicrotask(() => {
        setNodes((current) => {
          onNodesExternal(current as WorkflowFlowNode[]);
          return current;
        });
      });
    },
    [onNodesChangeInternal, onNodesExternal, onDirty, setNodes]
  );

  const handleEdgesChange: typeof onEdgesChangeInternal = useCallback(
    (changes) => {
      onEdgesChangeInternal(changes);
      onDirty();
      queueMicrotask(() => {
        setEdges((current) => {
          onEdgesExternal(current as WorkflowFlowEdge[]);
          return current;
        });
      });
    },
    [onEdgesChangeInternal, onEdgesExternal, onDirty, setEdges]
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge(
          { ...connection, type: "smoothstep", animated: true },
          eds
        );
        onEdgesExternal(newEdges as WorkflowFlowEdge[]);
        onDirty();
        return newEdges;
      });
    },
    [setEdges, onEdgesExternal, onDirty]
  );

  // ─── Add node from palette ──────────────────────────────────────

  const handleAddNode = useCallback(
    (type: WorkflowNodeType) => {
      const id = newNodeId(type);
      const defaultLabel = type === "trigger"
        ? "Trigger"
        : type === "condition"
          ? "Condition"
          : type === "branch"
            ? "Branch"
            : type === "delay"
              ? "Delay"
              : "Action";

      const defaultConfig: Record<string, any> =
        type === "trigger" ? { event: TRIGGER_EVENT_OPTIONS[0].value } :
        type === "action" ? { action_type: ACTION_TYPE_OPTIONS[0].value } :
        type === "delay" ? { duration_minutes: 5 } :
        {};

      const newNode: WorkflowFlowNode = {
        id,
        type,
        position: { x: 250 + Math.random() * 100, y: 150 + Math.random() * 100 },
        data: {
          label: defaultLabel,
          nodeType: type,
          config: defaultConfig,
        },
      };

      setNodes((nds) => {
        const updated = [...nds, newNode];
        onNodesExternal(updated as WorkflowFlowNode[]);
        onDirty();
        return updated;
      });
      onSelectNode(id);
    },
    [setNodes, onNodesExternal, onDirty, onSelectNode]
  );

  // ─── Config panel handlers ──────────────────────────────────────

  const handleConfigChange = useCallback(
    (nodeId: string, config: Record<string, any>) => {
      setNodes((nds) => {
        const updated = nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config } as WorkflowNodeData }
            : n
        );
        onNodesExternal(updated as WorkflowFlowNode[]);
        onDirty();
        return updated;
      });
    },
    [setNodes, onNodesExternal, onDirty]
  );

  const handleLabelChange = useCallback(
    (nodeId: string, label: string) => {
      setNodes((nds) => {
        const updated = nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, label } as WorkflowNodeData }
            : n
        );
        onNodesExternal(updated as WorkflowFlowNode[]);
        onDirty();
        return updated;
      });
    },
    [setNodes, onNodesExternal, onDirty]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const updated = nds.filter((n) => n.id !== nodeId);
        onNodesExternal(updated as WorkflowFlowNode[]);
        return updated;
      });
      setEdges((eds) => {
        const updated = eds.filter((e) => e.source !== nodeId && e.target !== nodeId);
        onEdgesExternal(updated as WorkflowFlowEdge[]);
        return updated;
      });
      onSelectNode(null);
      onDirty();
    },
    [setNodes, setEdges, onNodesExternal, onEdgesExternal, onSelectNode, onDirty]
  );

  // ─── Apply run logs as visual overlay ───────────────────────────

  const nodesWithRunStatus = useMemo(() => {
    if (!runLogs || runLogs.length === 0) return nodes;

    return nodes.map((n) => {
      const log = runLogs.find((l) => l.node_key === n.id);
      if (!log) return n;
      return {
        ...n,
        data: {
          ...n.data,
          runStatus: log.status as any,
          runMessage: log.message ?? undefined,
        },
      };
    });
  }, [nodes, runLogs]);

  const selectedNode = useMemo(
    () => (nodes as WorkflowFlowNode[]).find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  return (
    <div className="flex gap-4 h-full">
      {/* Canvas */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Palette */}
        <WorkflowNodePalette onAddNode={handleAddNode} />

        {/* React Flow Canvas */}
        <div
          ref={reactFlowWrapper}
          className="flex-1 rounded-lg border bg-muted/30 overflow-hidden"
          style={{ minHeight: 500 }}
        >
          <ReactFlow
            nodes={nodesWithRunStatus}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => onSelectNode(node.id)}
            onPaneClick={() => onSelectNode(null)}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            deleteKeyCode={["Backspace", "Delete"]}
            className="bg-muted/20"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="opacity-30" />
            <Controls showInteractive={false} position="bottom-right" />
            <MiniMap
              pannable
              zoomable
              position="bottom-left"
              className="!bg-card/80 !border-border !backdrop-blur-sm"
              nodeStrokeWidth={2}
              style={{ width: 140, height: 90 }}
            />
          </ReactFlow>
        </div>
      </div>

      {/* Config Panel (right sidebar) */}
      {selectedNode && (
        <div className="w-80 shrink-0 rounded-lg border bg-card p-4 overflow-y-auto max-h-[calc(100%-0px)]">
          <WorkflowConfigPanel
            node={selectedNode}
            onChange={handleConfigChange}
            onLabelChange={handleLabelChange}
            onDelete={handleDeleteNode}
          />
        </div>
      )}
    </div>
  );
}
