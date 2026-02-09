import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import type { WorkflowNodeData } from "../types";

function WebhookNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as WorkflowNodeData;
  const url = d.config?.url ?? "";
  const method = d.config?.method ?? "POST";
  const displayUrl = url.length > 30 ? url.slice(0, 30) + "..." : url || "No URL set";

  const statusColor =
    d.runStatus === "completed"
      ? "ring-green-500 border-green-500"
      : d.runStatus === "failed"
        ? "ring-red-500 border-red-500"
        : d.runStatus === "running"
          ? "ring-blue-400 border-blue-400 animate-pulse"
          : "";

  return (
    <div
      className={`rounded-lg border-2 bg-card shadow-md px-4 py-3 min-w-[200px] transition-all
        ${selected ? "ring-2 ring-purple-400" : ""}
        ${statusColor || "border-purple-500/60"}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/20">
          <FontAwesomeIcon icon={faGlobe} className="text-purple-500 text-xs" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">
          Webhook
        </span>
        <span className="ml-auto text-[10px] font-mono bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded">
          {method}
        </span>
      </div>
      <div className="text-xs text-muted-foreground font-mono truncate">{displayUrl}</div>
      {d.runMessage && (
        <div className="text-[10px] text-muted-foreground mt-1 truncate">{d.runMessage}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3" />
    </div>
  );
}

export const WebhookNode = memo(WebhookNodeComponent);
