import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGear,
  faGlobe,
  faEnvelope,
  faBell,
  faTag,
  faFlag,
  faUserPlus,
  faSquarePlus,
  faArrowRightArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { ACTION_TYPE_OPTIONS } from "../constants";
import type { WorkflowNodeData } from "../types";

const ACTION_ICONS: Record<string, any> = {
  change_status: faArrowRightArrowLeft,
  assign_user: faUserPlus,
  create_task: faSquarePlus,
  set_priority: faFlag,
  add_tag: faTag,
  notify_team: faBell,
  send_email: faEnvelope,
  webhook: faGlobe,
};

function ActionNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as WorkflowNodeData;
  const actionType = d.config?.action_type as string | undefined;
  const actionLabel =
    ACTION_TYPE_OPTIONS.find((o) => o.value === actionType)?.label ??
    d.label ??
    "Action";
  const icon = ACTION_ICONS[actionType ?? ""] ?? faGear;

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
        ${selected ? "ring-2 ring-blue-400" : ""}
        ${statusColor || "border-blue-500/60"}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20">
          <FontAwesomeIcon icon={icon} className="text-blue-500 text-xs" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
          Action
        </span>
      </div>
      <div className="text-sm font-medium truncate">{actionLabel}</div>
      {d.runMessage && (
        <div className="text-[10px] text-muted-foreground mt-1 truncate">{d.runMessage}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
