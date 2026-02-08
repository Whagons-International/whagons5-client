import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCodeBranch } from "@fortawesome/free-solid-svg-icons";
import type { WorkflowNodeData } from "../types";

function BranchNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as WorkflowNodeData;
  const branches: Array<{ label: string }> = d.config?.branches ?? [];
  const branchLabels = branches.length > 0 ? branches.map((b) => b.label) : ["default"];

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
        ${selected ? "ring-2 ring-orange-400" : ""}
        ${statusColor || "border-orange-500/60"}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/20">
          <FontAwesomeIcon icon={faCodeBranch} className="text-orange-500 text-xs" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500">
          Branch
        </span>
      </div>
      <div className="text-sm font-medium truncate">{d.label ?? "Branch"}</div>
      {d.runMessage && (
        <div className="text-[10px] text-muted-foreground mt-1 truncate">{d.runMessage}</div>
      )}
      <div className="flex justify-around mt-2 text-[9px] text-muted-foreground px-1">
        {branchLabels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      {branchLabels.map((label, i) => {
        const pct = ((i + 1) / (branchLabels.length + 1)) * 100;
        return (
          <Handle
            key={label}
            type="source"
            position={Position.Bottom}
            id={label}
            className="!bg-orange-500 !w-3 !h-3"
            style={{ left: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}

export const BranchNode = memo(BranchNodeComponent);
