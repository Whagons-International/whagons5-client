import * as React from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Loader2 } from 'lucide-react';

interface SpellSuggestionTooltipProps {
  suggestion: string | null;
  isLoading: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

const PADDING = 8; // px from viewport edges

export function SpellSuggestionTooltip({
  suggestion,
  isLoading,
  onAccept,
  onDismiss,
  anchorRef,
}: SpellSuggestionTooltipProps) {
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const onAcceptRef = React.useRef(onAccept);
  const onDismissRef = React.useRef(onDismiss);
  onAcceptRef.current = onAccept;
  onDismissRef.current = onDismiss;

  // Position: try below anchor, clamp to viewport, flip above if needed
  React.useEffect(() => {
    if (!suggestion || !anchorRef.current) {
      setPos(null);
      return;
    }

    const update = () => {
      const el = anchorRef.current;
      const tooltip = tooltipRef.current;
      if (!el) return;

      const anchor = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Width: match anchor but cap at 480, and keep within viewport
      const desiredWidth = Math.min(anchor.width, 480);
      // Left: align with anchor left, but clamp so it doesn't overflow right or left
      let left = anchor.left;
      if (left + desiredWidth > vw - PADDING) {
        left = vw - PADDING - desiredWidth;
      }
      if (left < PADDING) {
        left = PADDING;
      }

      // Height: estimate or measure
      const tooltipHeight = tooltip ? tooltip.getBoundingClientRect().height : 80;

      // Try below first
      let top = anchor.bottom + 4;
      if (top + tooltipHeight > vh - PADDING) {
        // Not enough room below — place above
        top = anchor.top - tooltipHeight - 4;
      }
      // Clamp top so it doesn't go above viewport
      if (top < PADDING) {
        top = PADDING;
      }

      setPos({ top, left, width: desiredWidth });
    };

    update();
    // Re-measure after first paint so we have real tooltip height
    requestAnimationFrame(update);

    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [suggestion, anchorRef]);

  // Single capture-phase listener: hit-test via coordinates
  React.useEffect(() => {
    if (!suggestion) return;

    const handleMouseDown = (e: MouseEvent) => {
      const tooltip = tooltipRef.current;
      if (!tooltip) {
        onDismissRef.current();
        return;
      }

      const rect = tooltip.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (inside) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onAcceptRef.current();
      } else {
        onDismissRef.current();
      }
    };

    const id = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleMouseDown, true);
    });

    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [suggestion]);

  if (!suggestion || !pos) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      role="tooltip"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 2147483647,
        pointerEvents: 'auto',
      }}
      className="animate-in fade-in slide-in-from-top-1 duration-150"
    >
      <div className="cursor-pointer rounded-lg border border-primary/25 bg-popover shadow-lg px-3 py-2.5 transition-colors hover:bg-accent group">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
          <span className="text-[11px] font-medium text-primary leading-none">
            Suggestion
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto leading-none opacity-0 group-hover:opacity-100 transition-opacity">
            click to accept
          </span>
        </div>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
          {suggestion}
        </p>
      </div>
    </div>,
    document.body,
  );
}

export function SpellLoadingIndicator({
  isLoading,
  anchorRef,
}: {
  isLoading: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const [pos, setPos] = React.useState<{ top: number; right: number } | null>(null);

  React.useEffect(() => {
    if (!isLoading || !anchorRef.current) {
      setPos(null);
      return;
    }
    const el = anchorRef.current;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.top + 8, right: window.innerWidth - rect.right + 8 });
  }, [isLoading, anchorRef]);

  if (!isLoading || !pos) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: pos.top,
        right: pos.right,
        zIndex: 2147483647,
        pointerEvents: 'none',
      }}
    >
      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
    </div>,
    document.body,
  );
}
