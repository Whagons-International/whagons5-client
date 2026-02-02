"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import StatusInfoPopover from "./StatusInfoPopover";

type StatusMeta = { id: number; name: string; color?: string; icon?: string };

export function StatusBadge({
  statusId,
  statusMap,
  getStatusIcon,
  className,
  taskId,
}: {
  statusId?: number | null;
  statusMap: Record<number, StatusMeta>;
  getStatusIcon?: (iconName?: string) => any;
  className?: string;
  taskId?: number;
}) {
  const meta = statusId != null ? statusMap[Number(statusId)] : undefined;
  if (!meta) {
    return (
      <span className={"inline-flex items-center text-xs text-muted-foreground" + (className ? ` ${className}` : "")}>No status</span>
    );
  }
  
  // Soften true red colors for "pending" statuses - use a safer amber tone instead
  const nameLower = (meta.name || '').toLowerCase();
  // Support both English and Spanish status names
  const isPendingStatus = nameLower.includes('pending') || nameLower.includes('waiting') || nameLower.includes('todo') || nameLower.includes('pendiente') || nameLower.includes('espera');
  const PENDING_AMBER = 'var(--accent-warning, #F59E0B)';

  // Precise regex to match only true red hex hues: #e[0-9a-f]xxxx, #f[0-7]xxxx, #dcxxxx, #ddxxxx, and explicit #ff0000
  const isTrueRed = (value?: string | null): boolean => {
    if (!value) return false;
    const v = value.toLowerCase().trim();
    // Explicit red name
    if (v === 'red') return true;
    // Pure red #ff0000
    if (v === '#ff0000') return true;
    // True red ranges: #e[0-9a-f][0-9a-f]{4} and #f[0-7][0-9a-f]{4}
    if (/^#(?:e[0-9a-f]|f[0-7])[0-9a-f]{4}$/.test(v)) return true;
    // Specific red shades: #dc[0-9a-f]{4} and #dd[0-9a-f]{4}
    if (/^#d[cd][0-9a-f]{4}$/.test(v)) return true;
    return false;
  };

  const shouldUseAmber = isPendingStatus && isTrueRed(meta.color);
  const color = shouldUseAmber ? PENDING_AMBER : meta.color || "#6B7280";
  
  const icon = meta.icon && typeof getStatusIcon === "function" ? getStatusIcon(meta.icon) : null;

  // Check if status name is long enough to need two-line display
  // Only wrap if: has multiple words AND total length > 14 characters
  const words = (meta.name || '').trim().split(/\s+/);
  const needsWrap = words.length > 1 && (meta.name || '').length > 14;

  const inner = (
    <span
      className={`inline-flex items-center gap-2 rounded-[6px] px-3 py-1.5 font-medium border cursor-pointer ${needsWrap ? 'text-[10px]' : 'text-[12px]'} ${className || ""}`}
      style={{
        background: `color-mix(in oklab, ${color} 12%, #101014 88%)`,
        borderColor: 'oklch(from var(--color-border) l c h / 0.45)',
        color: '#F3F4F6'
      }}
      aria-label={`Status: ${meta.name}`}
    >
      {icon ? (
        <FontAwesomeIcon icon={icon} className="text-[10px] flex-shrink-0" style={{ color: '#F3F4F6' }} />
      ) : (
        <span className="inline-block h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      )}
      {needsWrap ? (
        <span className="leading-tight lowercase text-center whitespace-normal block">
          {words[0]}<br />{words.slice(1).join(' ')}
        </span>
      ) : (
        <span className="truncate max-w-[140px] lowercase whitespace-nowrap">{meta.name}</span>
      )}
    </span>
  );

  // If taskId is provided, show status info popover on hover
  if (taskId && statusId) {
    return (
      <StatusInfoPopover taskId={taskId} statusId={statusId}>
        {inner}
      </StatusInfoPopover>
    );
  }

  // Fallback to simple badge without popover
  return inner;
}

export default StatusBadge;


