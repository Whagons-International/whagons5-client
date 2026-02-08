import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faCodeBranch,
  faGear,
  faClock,
  faSitemap,
} from "@fortawesome/free-solid-svg-icons";
import { NODE_PALETTE } from "./constants";
import type { WorkflowNodeType } from "./types";

const ICONS: Record<string, any> = {
  trigger: faBolt,
  condition: faCodeBranch,
  branch: faSitemap,
  action: faGear,
  delay: faClock,
};

const COLORS: Record<string, string> = {
  trigger: "text-green-500 bg-green-500/10 border-green-500/30",
  condition: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
  branch: "text-orange-500 bg-orange-500/10 border-orange-500/30",
  action: "text-blue-500 bg-blue-500/10 border-blue-500/30",
  delay: "text-gray-500 bg-gray-500/10 border-gray-500/30",
};

interface Props {
  onAddNode: (type: WorkflowNodeType) => void;
}

export function WorkflowNodePalette({ onAddNode }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {NODE_PALETTE.map((item) => (
        <button
          key={item.type}
          onClick={() => onAddNode(item.type as WorkflowNodeType)}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:scale-105 hover:shadow-md active:scale-[0.98] ${COLORS[item.type] ?? ""}`}
        >
          <FontAwesomeIcon icon={ICONS[item.type] ?? faGear} className="text-xs" />
          {item.label}
        </button>
      ))}
    </div>
  );
}
