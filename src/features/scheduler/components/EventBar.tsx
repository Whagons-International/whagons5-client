import { memo, useRef, useCallback, useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { iconService } from "@/database/iconService";
import type { SchedulerEvent } from "../types/scheduler";

interface EventBarProps {
  event: SchedulerEvent;
  left: number;
  width: number;
  rowHeight: number;
  onDoubleClick?: (event: SchedulerEvent) => void;
  onPointerDown?: (e: React.PointerEvent, event: SchedulerEvent, action: "move") => void;
  onResizePointerDown?: (e: React.PointerEvent, event: SchedulerEvent, handle: "start" | "end") => void;
}

function EventBarComponent({
  event,
  left,
  width,
  rowHeight,
  onDoubleClick,
  onPointerDown,
  onResizePointerDown,
}: EventBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const padding = 3;
  const barHeight = rowHeight - padding * 2;
  const hasCustomColor = !!event.color;
  const minWidthForLabel = 50;
  const minWidthForIcon = 30;
  const minWidthForHandles = 40;

  // Parse the rgba color to extract the solid RGB for the left border accent
  const solidColor = hasCustomColor ? extractSolidFromRgba(event.color!) : undefined;

  // Resolve FA icon from class string (e.g. "fas fa-broom")
  const [faIcon, setFaIcon] = useState<IconDefinition | null>(null);
  useEffect(() => {
    if (!event.categoryIcon) {
      setFaIcon(null);
      return;
    }
    let cancelled = false;
    iconService.getIcon(event.categoryIcon).then((icon) => {
      if (!cancelled && icon) setFaIcon(icon as IconDefinition);
    });
    return () => { cancelled = true; };
  }, [event.categoryIcon]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).dataset.resizeHandle) return;
      e.stopPropagation();
      onPointerDown?.(e, event, "move");
    },
    [event, onPointerDown]
  );

  const handleLeftResize = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      onResizePointerDown?.(e, event, "start");
    },
    [event, onResizePointerDown]
  );

  const handleRightResize = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      onResizePointerDown?.(e, event, "end");
    },
    [event, onResizePointerDown]
  );

  return (
    <div
      ref={barRef}
      className={`scheduler-event-bar absolute group select-none ${!hasCustomColor ? "scheduler-event-bar-themed" : ""}`}
      style={{
        left,
        top: padding,
        width: Math.max(width, 12),
        height: barHeight,
        ...(hasCustomColor
          ? {
              background: event.color,
              border: `1px solid ${solidColor}20`,
              borderLeftWidth: 3,
              borderLeftColor: solidColor,
            }
          : {}),
        borderRadius: 6,
        cursor: "grab",
        zIndex: 1,
        overflow: "hidden",
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.(event);
      }}
    >
      {/* Icon + Label */}
      {width > minWidthForIcon && (
        <div
          className="absolute top-0 bottom-0 flex items-center gap-1.5 pointer-events-none"
          style={{ left: 8, right: 8 }}
        >
          {/* Category FA icon */}
          {faIcon && (
            <FontAwesomeIcon
              icon={faIcon}
              className="shrink-0 scheduler-event-icon"
              style={{ width: 15, height: 15 }}
            />
          )}
          {/* Recurrence icon fallback */}
          {!faIcon && event.isRecurring && (
            <svg className="shrink-0 scheduler-event-icon" width="12" height="12" viewBox="0 0 9 9" fill="currentColor" opacity={0.5}>
              <path d="M4.5 0C2.015 0 0 2.015 0 4.5S2.015 9 4.5 9c1.576 0 2.954-.815 3.75-2.047l-.797-.6C6.805 7.336 5.732 8 4.5 8 2.567 8 1 6.433 1 4.5S2.567 1 4.5 1c1.234 0 2.31.666 2.953 1.648l.797-.6C7.454.815 6.076 0 4.5 0zm3.5 4v2.5H5.5v1H9V4H8z" />
            </svg>
          )}
          {/* Label */}
          {width > minWidthForLabel && (
            <span className="scheduler-event-label text-[12px] font-semibold truncate">
              {event.name}
            </span>
          )}
        </div>
      )}

      {/* Left resize edge (invisible hit area) */}
      {width > minWidthForHandles && (
        <div
          data-resize-handle="start"
          className="absolute left-0 top-0 bottom-0"
          style={{ width: 6, cursor: "ew-resize", zIndex: 2 }}
          onPointerDown={handleLeftResize}
        />
      )}

      {/* Right resize edge (invisible hit area) */}
      {width > minWidthForHandles && (
        <div
          data-resize-handle="end"
          className="absolute right-0 top-0 bottom-0"
          style={{ width: 6, cursor: "ew-resize", zIndex: 2 }}
          onPointerDown={handleRightResize}
        />
      )}
    </div>
  );
}

// Extract solid rgb from "rgba(r, g, b, a)" string
function extractSolidFromRgba(color: string): string {
  const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (match) return `rgb(${match[1]}, ${match[2]}, ${match[3]})`;
  const hexMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  if (hexMatch) return `rgb(${parseInt(hexMatch[1], 16)}, ${parseInt(hexMatch[2], 16)}, ${parseInt(hexMatch[3], 16)})`;
  return color;
}

export default memo(EventBarComponent);
