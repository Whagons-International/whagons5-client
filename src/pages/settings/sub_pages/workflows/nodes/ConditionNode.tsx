import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCodeBranch } from "@fortawesome/free-solid-svg-icons";
import type { WorkflowNodeData } from "../types";

function ConditionNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as WorkflowNodeData;
  const expression = d.config?.field
    ? `${d.config.field} ${d.config.operator ?? "="} ${d.config.value ?? ""}`
    : d.config?.expression ?? d.label ?? "Condition";

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
        ${selected ? "ring-2 ring-yellow-400" : ""}
        ${statusColor || "border-yellow-500/60"}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-yellow-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-500/20">
          <FontAwesomeIcon icon={faCodeBranch} className="text-yellow-500 text-xs" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">
          Condition
        </span>
      </div>
      <div className="text-sm font-medium truncate">{expression}</div>
      {d.runMessage && (
        <div className="text-[10px] text-muted-foreground mt-1 truncate">{d.runMessage}</div>
      )}
      {/* Two output handles: true (left) and false (right) */}
      <div className="flex justify-between mt-2 text-[9px] text-muted-foreground px-1">
        <span>True</span>
        <span>False</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!bg-green-500 !w-3 !h-3"
        style={{ left: "30%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!bg-red-400 !w-3 !h-3"
        style={{ left: "70%" }}
      />
    </div>
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
