import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";
import type { WorkflowNodeData } from "../types";

function DelayNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as WorkflowNodeData;
  const minutes = d.config?.duration_minutes ?? 5;

  const statusColor =
    d.runStatus === "completed"
      ? "ring-green-500 border-green-500"
      : d.runStatus === "failed"
        ? "ring-red-500 border-red-500"
        : d.runStatus === "waiting"
          ? "ring-amber-400 border-amber-400 animate-pulse"
          : d.runStatus === "running"
            ? "ring-blue-400 border-blue-400 animate-pulse"
            : "";

  return (
    <div
      className={`rounded-lg border-2 bg-card shadow-md px-4 py-3 min-w-[160px] transition-all
        ${selected ? "ring-2 ring-gray-400" : ""}
        ${statusColor || "border-gray-400/60"}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-400/20">
          <FontAwesomeIcon icon={faClock} className="text-gray-500 text-xs" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Delay
        </span>
      </div>
      <div className="text-sm font-medium">
        {minutes >= 60
          ? `${Math.floor(minutes / 60)}h ${minutes % 60 > 0 ? `${minutes % 60}m` : ""}`
          : `${minutes} min`}
      </div>
      {d.runMessage && (
        <div className="text-[10px] text-muted-foreground mt-1 truncate">{d.runMessage}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-3 !h-3" />
    </div>
  );
}

export const DelayNode = memo(DelayNodeComponent);
