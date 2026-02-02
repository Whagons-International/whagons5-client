import { useMemo, useRef, useCallback, useState, useEffect, memo } from "react";
import type { ScaleTime } from "d3-scale";
import type { ViewPreset, SchedulerEvent, SchedulerResource } from "../types/scheduler";
import EventBar from "./EventBar";
import EventTooltip from "./EventTooltip";
import { useDragDrop } from "../hooks/useDragDrop";

interface TimelineCanvasProps {
  scale: ScaleTime<number, number>;
  width: number;
  height: number;
  preset: ViewPreset;
  startDate: Date;
  endDate: Date;
  resources: SchedulerResource[];
  events: SchedulerEvent[];
  rowHeight?: number;
  selectedCell?: { row: number; col: number } | null;
  onEventDoubleClick?: (event: SchedulerEvent) => void;
  onEventMove?: (event: SchedulerEvent, newStartDate: Date, newEndDate: Date, newResourceIndex: number) => void;
  onEventResize?: (event: SchedulerEvent, newStartDate: Date, newEndDate: Date) => void;
  onEmptySpaceClick?: (date: Date, resourceIndex: number, colIndex: number) => void;
}

function getTickInterval(preset: ViewPreset): number {
  switch (preset) {
    case "hourAndDay": return 3600000;
    case "dayAndWeek": return 86400000;
    case "weekAndMonth": return 604800000;
    case "monthAndYear": return 2592000000;
    default: return 3600000;
  }
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function TimelineCanvasComponent({
  scale,
  width,
  height,
  preset,
  startDate,
  endDate,
  resources,
  events,
  rowHeight = 60,
  selectedCell,
  onEventDoubleClick,
  onEventMove,
  onEventResize,
  onEmptySpaceClick,
}: TimelineCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    event: SchedulerEvent | null;
    x: number;
    y: number;
    visible: boolean;
  }>({ event: null, x: 0, y: 0, visible: false });

  // ---- Ticks ----
  const tickInterval = useMemo(() => getTickInterval(preset), [preset]);
  const ticks = useMemo(() => {
    const result: Date[] = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      result.push(new Date(current));
      current = new Date(current.getTime() + tickInterval);
    }
    return result;
  }, [startDate, endDate, tickInterval]);

  // ---- Events per resource ----
  const eventsByResource = useMemo(() => {
    const map = new Map<number, SchedulerEvent[]>();
    resources.forEach((r) => map.set(r.id, []));
    events.forEach((ev) => {
      const list = map.get(ev.resourceId);
      if (list) list.push(ev);
    });
    return map;
  }, [events, resources]);

  // ---- Drag & drop ----
  const callbackRefs = useRef({ onEventMove, onEventResize });
  callbackRefs.current = { onEventMove, onEventResize };

  const { startDrag } = useDragDrop(scale, rowHeight, 15 * 60 * 1000, {
    onEventMove: (ev, start, end, newRowIdx) => {
      callbackRefs.current.onEventMove?.(ev, start, end, newRowIdx);
    },
    onEventResize: (ev, start, end) => {
      callbackRefs.current.onEventResize?.(ev, start, end);
    },
    onDragStart: () => {
      setIsDragging(true);
      setTooltip((prev) => ({ ...prev, visible: false }));
    },
    onDragEnd: () => setIsDragging(false),
  });

  const handleEventPointerDown = useCallback(
    (e: React.PointerEvent, event: SchedulerEvent, _action: "move") => {
      if (!containerRef.current) return;
      const resourceIndex = resources.findIndex((r) => r.id === event.resourceId);
      if (resourceIndex < 0) return;
      startDrag(e, event, "move", containerRef.current, resourceIndex);
    },
    [resources, startDrag]
  );

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, event: SchedulerEvent, handle: "start" | "end") => {
      if (!containerRef.current) return;
      const resourceIndex = resources.findIndex((r) => r.id === event.resourceId);
      if (resourceIndex < 0) return;
      startDrag(e, event, handle === "start" ? "resize-start" : "resize-end", containerRef.current, resourceIndex);
    },
    [resources, startDrag]
  );

  // ---- Current time indicator ----
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const nowInRange = now.getTime() >= startDate.getTime() && now.getTime() <= endDate.getTime();
  const nowX = nowInRange ? scale(now) : -1;

  // Total visual rows — always fill the viewport
  const totalRows = Math.max(resources.length, Math.ceil(height / rowHeight));
  const contentHeight = totalRows * rowHeight;

  return (
    <>
      <div
        ref={containerRef}
        className="relative bg-background"
        style={{
          width,
          minWidth: width,
          height: contentHeight,
          minHeight: contentHeight,
        }}
      >
        {/* Grid and events layer */}
        <div className="absolute inset-0">
          {/* ---- Grid background ---- */}
          {/* Zebra rows — fill entire viewport */}
          {Array.from({ length: totalRows }, (_, i) =>
            i % 2 === 1 ? (
              <div
                key={`zebra-${i}`}
                className="absolute left-0 right-0"
                style={{
                  top: i * rowHeight,
                  height: rowHeight,
                  background: "var(--scheduler-zebra-stripe)",
                }}
              />
            ) : null
          )}

          {/* Weekend / today column backgrounds */}
          {(preset === "hourAndDay" || preset === "dayAndWeek") &&
            ticks.map((tick, i) => {
              if (i >= ticks.length - 1) return null;
              const x1 = scale(tick);
              const x2 = scale(ticks[i + 1]);
              const w = x2 - x1;
              const weekend = isWeekend(tick);
              const today = isToday(tick);
              if (!weekend && !today) return null;

              return (
                <div
                  key={`col-bg-${i}`}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: x1,
                    width: w,
                    background: today
                      ? "var(--scheduler-today-bg)"
                      : weekend
                        ? "var(--scheduler-weekend-bg)"
                        : undefined,
                  }}
                />
              );
            })}

          {/* Vertical grid lines */}
          {ticks.map((tick, i) => (
            <div
              key={`vline-${i}`}
              className="absolute top-0 bottom-0"
              style={{
                left: scale(tick),
                width: 1,
                background: "var(--scheduler-grid-line)",
              }}
            />
          ))}

          {/* Horizontal grid lines — fill entire viewport */}
          {Array.from({ length: totalRows + 1 }, (_, i) => (
            <div
              key={`hline-${i}`}
              className="absolute left-0 right-0"
              style={{
                top: i * rowHeight,
                height: 1,
                background: "var(--scheduler-grid-line)",
              }}
            />
          ))}

          {/* ---- Hover / click cells ---- */}
          {resources.map((_, rowIndex) =>
            ticks.slice(0, -1).map((tick, colIndex) => {
              const x1 = scale(tick);
              const x2 = scale(ticks[colIndex + 1]);
              const cellWidth = x2 - x1;
              if (cellWidth < 2) return null;
              const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;

              return (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={`absolute rounded-md transition-colors duration-150 ${
                    isSelected
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "hover:bg-blue-500/5 hover:ring-1 hover:ring-blue-500/25 hover:ring-dashed"
                  }`}
                  style={{
                    left: x1 + 2,
                    top: rowIndex * rowHeight + 2,
                    width: cellWidth - 4,
                    height: rowHeight - 4,
                    cursor: "default",
                    zIndex: 0,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTooltip((prev) => ({ ...prev, visible: false }));
                    onEmptySpaceClick?.(tick, rowIndex, colIndex);
                  }}
                />
              );
            })
          )}

          {/* ---- Current time indicator (line only — badge is in TimeHeader) ---- */}
          {nowInRange && (
            <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: 0, right: 0, zIndex: 0 }}>
              {/* Glow band */}
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: nowX - 6,
                  width: 12,
                  background: "var(--destructive)",
                  opacity: 0.03,
                }}
              />
              {/* Main line */}
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: nowX - 1,
                  width: 2,
                  background: "var(--destructive)",
                  opacity: 0.45,
                }}
              />
            </div>
          )}

          {/* ---- Event bars ---- */}
          {resources.map((resource, rowIndex) => {
            const resourceEvents = eventsByResource.get(resource.id) || [];
            return resourceEvents.map((event) => {
              const evLeft = Math.round(scale(event.startDate));
              const evRight = Math.round(scale(event.endDate));
              const evWidth = evRight - evLeft;

              // Skip events fully outside visible range
              if (evRight < 0 || evLeft > width) return null;

              return (
                <div
                  key={event.id}
                  className="absolute"
                  style={{
                    left: 0,
                    top: rowIndex * rowHeight,
                    width: width,
                    height: rowHeight,
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{ pointerEvents: "auto" }}
                    onPointerEnter={(e) => {
                      if (!isDragging) setTooltip({ event, x: e.clientX, y: e.clientY, visible: true });
                    }}
                    onPointerMove={(e) => {
                      if (!isDragging) setTooltip((prev) => (prev.visible ? { ...prev, x: e.clientX, y: e.clientY } : prev));
                    }}
                    onPointerLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}
                  >
                    <EventBar
                      event={event}
                      left={evLeft}
                      width={evWidth}
                      rowHeight={rowHeight}
                      onDoubleClick={onEventDoubleClick}
                      onPointerDown={handleEventPointerDown}
                      onResizePointerDown={handleResizePointerDown}
                    />
                  </div>
                </div>
              );
            });
          })}
        </div>
      </div>

      <EventTooltip
        event={tooltip.event}
        x={tooltip.x}
        y={tooltip.y}
        visible={tooltip.visible}
        isDragging={isDragging}
        pinned={false}
      />
    </>
  );
}

export default memo(TimelineCanvasComponent, (prev, next) => {
  if (prev.events !== next.events) return false;
  if (prev.resources !== next.resources) return false;
  if (prev.scale !== next.scale) return false;
  if (prev.width !== next.width) return false;
  if (prev.height !== next.height) return false;
  if (prev.rowHeight !== next.rowHeight) return false;
  if (prev.startDate?.getTime() !== next.startDate?.getTime()) return false;
  if (prev.endDate?.getTime() !== next.endDate?.getTime()) return false;
  if (prev.preset !== next.preset) return false;
  if (prev.selectedCell?.row !== next.selectedCell?.row) return false;
  if (prev.selectedCell?.col !== next.selectedCell?.col) return false;
  return true;
});
