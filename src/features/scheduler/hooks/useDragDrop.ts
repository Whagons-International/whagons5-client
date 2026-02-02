import { useRef, useCallback, useEffect } from "react";
import type { ScaleTime } from "d3-scale";
import type { SchedulerEvent } from "../types/scheduler";

export interface DragOperation {
  type: "move" | "resize-start" | "resize-end";
  event: SchedulerEvent;
  /** Pointer X at drag start (client coords) */
  startPointerX: number;
  /** Pointer Y at drag start (client coords) */
  startPointerY: number;
  /** Original pixel left of the bar relative to the timeline origin */
  originalLeft: number;
  /** Original pixel width of the bar */
  originalWidth: number;
  /** The original row index (resourceIndex) */
  originalRowIndex: number;
  /** Original start date */
  originalStartDate: Date;
  /** Original end date */
  originalEndDate: Date;
  /** Duration in ms (preserved during move) */
  durationMs: number;
}

export interface DragCallbacks {
  onEventMove?: (event: SchedulerEvent, newStart: Date, newEnd: Date, newResourceIndex: number) => void;
  onEventResize?: (event: SchedulerEvent, newStart: Date, newEnd: Date) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

interface DragVisuals {
  /** Current pixel left of the ghost bar */
  left: number;
  /** Current pixel width of the ghost bar */
  width: number;
  /** Current row index */
  rowIndex: number;
  /** Whether currently dragging */
  active: boolean;
  /** The event being dragged */
  eventId: number | null;
}

/**
 * Pointer-event based drag & drop for the scheduler.
 * Operates entirely in pixel space during drag; only converts to dates on drop.
 */
export function useDragDrop(
  scale: ScaleTime<number, number>,
  rowHeight: number,
  snapInterval: number,
  callbacks: DragCallbacks
) {
  const opRef = useRef<DragOperation | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Store the ghost element ref so we can update it during drag
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const snapToInterval = useCallback(
    (date: Date): Date => {
      const t = date.getTime();
      return new Date(Math.round(t / snapInterval) * snapInterval);
    },
    [snapInterval]
  );

  // ---- pointer handlers ----

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const op = opRef.current;
      if (!op) return;

      const dx = e.clientX - op.startPointerX;
      const dy = e.clientY - op.startPointerY;
      const ghost = ghostRef.current;
      if (!ghost) return;

      if (op.type === "move") {
        // Compute new row from vertical delta
        const newRowIndex = Math.max(0, op.originalRowIndex + Math.round(dy / rowHeight));
        const newLeft = op.originalLeft + dx;

        ghost.style.left = `${newLeft}px`;
        ghost.style.top = `${newRowIndex * rowHeight}px`;
        ghost.style.width = `${op.originalWidth}px`;
      } else if (op.type === "resize-start") {
        // Resize from left edge
        const newLeft = op.originalLeft + dx;
        const newWidth = Math.max(20, op.originalWidth - dx);
        ghost.style.left = `${newLeft}px`;
        ghost.style.width = `${newWidth}px`;
      } else if (op.type === "resize-end") {
        // Resize from right edge
        const newWidth = Math.max(20, op.originalWidth + dx);
        ghost.style.width = `${newWidth}px`;
      }
    },
    [rowHeight]
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      const op = opRef.current;
      if (!op) return;

      const dx = e.clientX - op.startPointerX;
      const dy = e.clientY - op.startPointerY;

      // Clean up ghost
      if (ghostRef.current) {
        ghostRef.current.remove();
        ghostRef.current = null;
      }

      // Remove global listeners
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      opRef.current = null;

      if (op.type === "move") {
        // Only fire if actually moved
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
          callbacksRef.current.onDragEnd?.();
          return;
        }

        const newLeft = op.originalLeft + dx;
        const newStartRaw = scale.invert(newLeft);
        const newStart = snapToInterval(newStartRaw);
        const newEnd = new Date(newStart.getTime() + op.durationMs);
        const newRowIndex = Math.max(0, op.originalRowIndex + Math.round(dy / rowHeight));

        callbacksRef.current.onEventMove?.(op.event, newStart, newEnd, newRowIndex);
      } else if (op.type === "resize-start") {
        if (Math.abs(dx) < 3) {
          callbacksRef.current.onDragEnd?.();
          return;
        }
        const newLeft = op.originalLeft + dx;
        const newStartRaw = scale.invert(newLeft);
        let newStart = snapToInterval(newStartRaw);
        // Ensure minimum duration
        if (newStart.getTime() >= op.originalEndDate.getTime()) {
          newStart = new Date(op.originalEndDate.getTime() - snapInterval);
        }
        callbacksRef.current.onEventResize?.(op.event, newStart, op.originalEndDate);
      } else if (op.type === "resize-end") {
        if (Math.abs(dx) < 3) {
          callbacksRef.current.onDragEnd?.();
          return;
        }
        const newRight = op.originalLeft + op.originalWidth + dx;
        const newEndRaw = scale.invert(newRight);
        let newEnd = snapToInterval(newEndRaw);
        // Ensure minimum duration
        if (newEnd.getTime() <= op.originalStartDate.getTime()) {
          newEnd = new Date(op.originalStartDate.getTime() + snapInterval);
        }
        callbacksRef.current.onEventResize?.(op.event, op.originalStartDate, newEnd);
      }

      callbacksRef.current.onDragEnd?.();
    },
    [scale, rowHeight, snapToInterval, snapInterval, onPointerMove]
  );

  /**
   * Call this from onPointerDown on an event bar or resize handle.
   * `containerEl` is the timeline container (position:relative parent) used to
   * compute the pixel offset of the ghost.
   */
  const startDrag = useCallback(
    (
      e: React.PointerEvent,
      event: SchedulerEvent,
      action: "move" | "resize-start" | "resize-end",
      containerEl: HTMLElement,
      resourceIndex: number
    ) => {
      e.preventDefault();
      // Capture pointer on the target for reliable tracking
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

      const eventLeft = Math.round(scale(event.startDate));
      const eventRight = Math.round(scale(event.endDate));
      const eventWidth = eventRight - eventLeft;

      opRef.current = {
        type: action,
        event,
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        originalLeft: eventLeft,
        originalWidth: eventWidth,
        originalRowIndex: resourceIndex,
        originalStartDate: event.startDate,
        originalEndDate: event.endDate,
        durationMs: event.endDate.getTime() - event.startDate.getTime(),
      };

      // Create ghost overlay div
      const ghost = document.createElement("div");
      ghost.className = "scheduler-drag-ghost";
      ghost.style.position = "absolute";
      ghost.style.left = `${eventLeft}px`;
      ghost.style.top = `${resourceIndex * rowHeight}px`;
      ghost.style.width = `${eventWidth}px`;
      ghost.style.height = `${rowHeight}px`;
      ghost.style.pointerEvents = "none";
      ghost.style.zIndex = "100";
      ghost.style.opacity = "0.7";
      ghost.style.background = event.color || "#6366f1";
      ghost.style.borderRadius = "8px";
      ghost.style.border = "2px dashed rgba(255,255,255,0.6)";
      ghost.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)";
      ghost.style.transition = "none";

      containerEl.appendChild(ghost);
      ghostRef.current = ghost;

      callbacksRef.current.onDragStart?.();

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [scale, rowHeight, onPointerMove, onPointerUp]
  );

  // Cancel on ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && opRef.current) {
        opRef.current = null;
        if (ghostRef.current) {
          ghostRef.current.remove();
          ghostRef.current = null;
        }
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        callbacksRef.current.onDragEnd?.();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onPointerMove, onPointerUp]);

  return { startDrag };
}
