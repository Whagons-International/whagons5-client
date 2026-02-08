import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { TRIGGER_EVENT_OPTIONS } from "../constants";
import type { WorkflowNodeData } from "../types";

function TriggerNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as WorkflowNodeData;
  const eventLabel =
    TRIGGER_EVENT_OPTIONS.find((o) => o.value === d.config?.event)?.label ??
    d.label ??
    "Trigger";

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
      className={`rounded-lg border-2 bg-card shadow-md px-4 py-3 min-w-[180px] transition-all
        ${selected ? "ring-2 ring-green-400" : ""}
        ${statusColor || "border-green-500/60"}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/20">
          <FontAwesomeIcon icon={faBolt} className="text-green-500 text-xs" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-green-500">
          Trigger
        </span>
      </div>
      <div className="text-sm font-medium truncate">{eventLabel}</div>
      {d.runMessage && (
        <div className="text-[10px] text-muted-foreground mt-1 truncate">{d.runMessage}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3" />
    </div>
  );
}

export const TriggerNode = memo(TriggerNodeComponent);
