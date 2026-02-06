import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ExecutionTrace, ToolCallTraces } from '../models/traces';
import { useTheme } from '@/providers/ThemeProvider';
import { LoadingWidget } from './LoadingWidget';

const MAX_VISIBLE_ITEMS = 5;

// Rotating status words for active traces
const STATUS_WORDS = ['pondering', 'thinking', 'calculating', 'processing'];
const STATUS_ROTATION_MS = 2000; // Rotate every 2 seconds

/**
 * Hook to cycle through status words at a fixed interval
 */
function useRotatingStatus(isActive: boolean): string {
  const [index, setIndex] = useState(0);
  
  useEffect(() => {
    if (!isActive) {
      setIndex(0);
      return;
    }
    
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % STATUS_WORDS.length);
    }, STATUS_ROTATION_MS);
    
    return () => clearInterval(interval);
  }, [isActive]);
  
  return STATUS_WORDS[index];
}

interface ExecutionTraceTimelineProps {
  traces: Map<string, ToolCallTraces>;
  isExpanded?: boolean;
}

/**
 * ExecutionTraceTimeline - Real-time visualization of tool execution traces
 * 
 * Features:
 * - Shows max 5 items, with oldest fading out at top
 * - Shimmer effect on active (running) trace text
 * - Smooth slide-up animation as new traces arrive
 * - Collapsible when done
 */
function ExecutionTraceTimeline({ traces, isExpanded: initialExpanded }: ExecutionTraceTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded ?? true);
  
  // Track which operation IDs we've seen to detect new ones
  const seenOperationIds = useRef<Set<string>>(new Set());
  const [newOperationIds, setNewOperationIds] = useState<Set<string>>(new Set());
  
  // For slide animation: show MAX+1 items, animate slide, then trim
  const [isSliding, setIsSliding] = useState(false);
  const [showExtraItem, setShowExtraItem] = useState(false);
  const [noTransition, setNoTransition] = useState(false);

  // Determine if any trace is still active
  const hasActiveTraces = useMemo(() => {
    for (const [, toolCallTraces] of traces) {
      if (toolCallTraces.isActive) return true;
    }
    return false;
  }, [traces]);

  // Get rotating status word for header (cycles every 2s, independent of trace frequency)
  const statusWord = useRotatingStatus(hasActiveTraces);

  // Auto-expand when active, keep user's choice when done
  useEffect(() => {
    if (hasActiveTraces) {
      setIsExpanded(true);
    }
  }, [hasActiveTraces]);

  // Build a flat list of "operations" - each start trace paired with its end/error
  // Deduplicates operations with the same label
  // Shows both successful and failed operations (errors shown with "Tried..." label)
  const operations = useMemo(() => {
    const ops: OperationDisplay[] = [];
    const seenLabels = new Set<string>();
    
    traces.forEach((toolCallTraces, toolCallId) => {
      const traceList = [...toolCallTraces.traces].sort((a, b) => a.timestamp - b.timestamp);
      
      // Map trace_id to its start trace
      const startTraces = new Map<string, ExecutionTrace>();
      
      for (const trace of traceList) {
        if (trace.status === 'start') {
          startTraces.set(trace.trace_id, trace);
        } else if (trace.status === 'end') {
          const startTrace = startTraces.get(trace.trace_id);
          if (startTrace) {
            const dedupeKey = `${trace.tool}:${trace.label}`;
            if (seenLabels.has(dedupeKey)) {
              startTraces.delete(trace.trace_id);
              continue;
            }
            seenLabels.add(dedupeKey);
            
            ops.push({
              id: trace.trace_id,
              toolCallId,
              tool: startTrace.tool || trace.tool,
              operation: startTrace.operation || trace.operation,
              startLabel: startTrace.label,
              endLabel: trace.label,
              status: 'end',
              duration_ms: trace.duration_ms,
              timestamp: startTrace.timestamp,
            });
            startTraces.delete(trace.trace_id);
          }
        } else if (trace.status === 'error') {
          // Show error traces with "Tried..." label
          const startTrace = startTraces.get(trace.trace_id);
          if (startTrace) {
            const dedupeKey = `${trace.tool}:${startTrace.label}:error`;
            if (seenLabels.has(dedupeKey)) {
              startTraces.delete(trace.trace_id);
              continue;
            }
            seenLabels.add(dedupeKey);
            
            ops.push({
              id: trace.trace_id,
              toolCallId,
              tool: startTrace.tool || trace.tool,
              operation: startTrace.operation || trace.operation,
              startLabel: startTrace.label,
              endLabel: trace.label,
              status: 'error',
              duration_ms: trace.duration_ms,
              timestamp: startTrace.timestamp,
            });
          }
          startTraces.delete(trace.trace_id);
        }
      }
      
      // Remaining start traces are still active (no end or error received yet)
      startTraces.forEach((startTrace) => {
        const dedupeKey = `${startTrace.tool}:${startTrace.label}`;
        if (seenLabels.has(dedupeKey)) {
          return;
        }
        seenLabels.add(dedupeKey);
        
        ops.push({
          id: startTrace.trace_id,
          toolCallId,
          tool: startTrace.tool,
          operation: startTrace.operation,
          startLabel: startTrace.label,
          endLabel: null,
          status: 'active',
          duration_ms: undefined,
          timestamp: startTrace.timestamp,
        });
      });
    });
    
    // Sort by timestamp
    return ops.sort((a, b) => a.timestamp - b.timestamp);
  }, [traces]);

  // Track previous operation count to detect when items need to slide
  const prevOperationCount = useRef(0);

  // Track new operations for animation
  useEffect(() => {
    const currentIds = new Set(operations.map(op => op.id));
    const newIds = new Set<string>();
    
    for (const id of currentIds) {
      if (!seenOperationIds.current.has(id)) {
        newIds.add(id);
        seenOperationIds.current.add(id);
      }
    }
    
    // Check if we need to slide (was at or over max, and adding new items)
    const wasAtMax = prevOperationCount.current >= MAX_VISIBLE_ITEMS;
    const isAddingNew = newIds.size > 0;
    
    if (wasAtMax && isAddingNew) {
      // Step 1: Show extra item (MAX+1 visible) and start sliding immediately
      setShowExtraItem(true);
      setIsSliding(true);
      setNoTransition(false);
      
      // Step 2: After slide animation completes (300ms), remove extra item
      // But first disable transition so removing item doesn't cause snap-back animation
      const finishTimer = setTimeout(() => {
        // Disable transition, reset slide state, remove extra item - all at once
        setNoTransition(true);
        setIsSliding(false);
        setShowExtraItem(false);
        
        // Re-enable transition after a frame so next animation works
        requestAnimationFrame(() => {
          setNoTransition(false);
        });
      }, 300);
      
      prevOperationCount.current = operations.length;
      
      if (newIds.size > 0) {
        setNewOperationIds(newIds);
        const newTimer = setTimeout(() => {
          setNewOperationIds(new Set());
        }, 500);
        return () => {
          clearTimeout(finishTimer);
          clearTimeout(newTimer);
        };
      }
      return () => {
        clearTimeout(finishTimer);
      };
    }
    
    prevOperationCount.current = operations.length;
    
    if (newIds.size > 0) {
      setNewOperationIds(newIds);
      const timer = setTimeout(() => {
        setNewOperationIds(new Set());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [operations]);

  if (operations.length === 0) {
    return null;
  }

  // Get visible operations
  // When sliding, show MAX+1 items so we can animate the top one out
  const itemsToShow = showExtraItem ? MAX_VISIBLE_ITEMS + 1 : MAX_VISIBLE_ITEMS;
  const visibleOps = operations.slice(-itemsToShow);
  const hiddenCount = Math.max(0, operations.length - itemsToShow);

  // Count for header
  const completedCount = operations.filter(op => op.status === 'end').length;
  const activeCount = operations.filter(op => op.status === 'active').length;
  const errorCount = operations.filter(op => op.status === 'error').length;
  const totalCount = completedCount + activeCount + errorCount;

  return (
    <div className="w-full my-2 pl-2">
      {/* Collapsed header - simple arrow toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={isExpanded}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="font-medium text-muted-foreground flex items-center gap-1.5">
          {hasActiveTraces ? (
            <>
              {/* Smooth loading animation + rotating status word (fixed 2s interval) */}
              <span className="relative w-6 h-5 flex items-center justify-center">
                <LoadingWidget 
                  size={30}
                  strokeWidthRatio={8}
                  color="currentColor"
                  cycleDuration={0.9}
                />
              </span>
              <span className="transition-opacity duration-300">{statusWord}...</span>
            </>
          ) : (
            <>
              <span>
                {totalCount > 0 ? (
                  `${totalCount} operation${totalCount !== 1 ? 's' : ''}`
                ) : 'No operations'}
              </span>
              {errorCount > 0 && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              )}
            </>
          )}
        </span>
      </button>

      {/* Expanded timeline with animations */}
      {isExpanded && (
        <div className="mt-2 ml-7.5 relative overflow-hidden">
          {/* Fade gradient at top when there are hidden items */}
          {hiddenCount > 0 && (
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
          )}
          
          {/* Timeline container with connecting line */}
          <div className="relative pl-5">
            <style>{`
              .slide-container {
                transition: transform 0.3s ease-out;
              }
              .slide-container.sliding {
                transform: translateY(-36px);
              }
              .slide-container.no-transition {
                transition: none;
              }
            `}</style>
            <div className={`space-y-0 slide-container ${isSliding ? 'sliding' : ''} ${noTransition ? 'no-transition' : ''}`}>
              {visibleOps.map((op, index) => {
                // The first item fades out when we're sliding (it's the one being pushed out)
                const isFadingOut = index === 0 && isSliding;
                const isFirstAndFading = index === 0 && (operations.length > MAX_VISIBLE_ITEMS || showExtraItem);
                // Shimmer only the LAST item if it's active (the currently running one)
                const isLastAndActive = index === visibleOps.length - 1 && op.status === 'active';
                const isNew = newOperationIds.has(op.id);
                const isLast = index === visibleOps.length - 1;
                // Check if next item is new (so this item should animate line down to it)
                const nextOp = visibleOps[index + 1];
                const hasNewNextItem = nextOp && newOperationIds.has(nextOp.id);
                
                return (
                  <OperationItem 
                    key={op.id} 
                    operation={op} 
                    isShimmering={isLastAndActive}
                    isSlidingOut={isFadingOut}
                    isFading={isFirstAndFading}
                    isNew={isNew}
                    hasActiveTraces={hasActiveTraces}
                    isLast={isLast}
                    hasNewNextItem={hasNewNextItem}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface OperationDisplay {
  id: string;
  toolCallId: string;
  tool: string;
  operation: string;
  startLabel: string;
  endLabel: string | null;
  status: 'active' | 'end' | 'error';
  duration_ms?: number;
  timestamp: number;
}

interface OperationItemProps {
  operation: OperationDisplay;
  isShimmering?: boolean;
  isFading?: boolean;
  isNew?: boolean;
  hasActiveTraces?: boolean;
  isSlidingOut?: boolean;
  isLast?: boolean;
  hasNewNextItem?: boolean;
}

/**
 * Convert a label to "Tried..." format for errors
 * "Running X" -> "Tried to run X"
 * "Searching: query" -> "Tried to search: query"
 * "GET /users" -> "Tried: GET /users"
 */
function toTriedLabel(label: string): string {
  // Common patterns to convert
  const patterns: [RegExp, string][] = [
    [/^Running:?\s*/i, 'Tried to run: '],
    [/^Ran:?\s*/i, 'Tried to run: '],
    [/^Searching:?\s*/i, 'Tried to search: '],
    [/^Searched:?\s*/i, 'Tried to search: '],
    [/^Generating:?\s*/i, 'Tried to generate: '],
    [/^Generated:?\s*/i, 'Tried to generate: '],
    [/^Creating:?\s*/i, 'Tried to create: '],
    [/^Created:?\s*/i, 'Tried to create: '],
    [/^Listing:?\s*/i, 'Tried to list: '],
    [/^Listed:?\s*/i, 'Tried to list: '],
    [/^Reading:?\s*/i, 'Tried to read: '],
    [/^Read:?\s*/i, 'Tried to read: '],
    [/^Fetching:?\s*/i, 'Tried to fetch: '],
    [/^Fetched:?\s*/i, 'Tried to fetch: '],
    [/^(GET|POST|PUT|PATCH|DELETE)\s+/i, 'Tried: '],
  ];
  
  for (const [pattern, replacement] of patterns) {
    if (pattern.test(label)) {
      return label.replace(pattern, replacement);
    }
  }
  
  // Default: prepend "Tried: "
  return `Tried: ${label}`;
}

/**
 * Single operation in the timeline with animation support
 */
function OperationItem({ operation, isShimmering, isFading, isNew, hasActiveTraces, isSlidingOut, isLast, hasNewNextItem }: OperationItemProps) {
  const isActive = operation.status === 'active';
  const isError = operation.status === 'error';

  // Show start label while active, end label when done, "Tried..." for errors
  let displayLabel: string;
  if (isActive) {
    displayLabel = operation.startLabel;
  } else if (isError) {
    displayLabel = toTriedLabel(operation.startLabel);
  } else {
    displayLabel = operation.endLabel || operation.startLabel;
  }

  return (
    <div 
      className={`
        relative flex items-center gap-2 text-sm py-2 transition-opacity duration-300
        ${isSlidingOut ? 'opacity-0' : isFading ? 'opacity-40' : 'opacity-100'}
      `}
    >
      <style>{`
        @keyframes shimmer-sweep {
          0% { background-position: -150% 0; }
          100% { background-position: 150% 0; }
        }
        @keyframes dot-emerge {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes text-emerge {
          0% {
            opacity: 0;
            transform: translateX(-10px);
            clip-path: inset(0 100% 0 0);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
            clip-path: inset(0 0 0 0);
          }
        }
        .animate-dot-emerge {
          animation: dot-emerge 0.2s ease-out 0.25s forwards;
          transform: scale(0);
          opacity: 0;
        }
        .animate-text-emerge {
          animation: text-emerge 0.3s ease-out 0.35s forwards;
          opacity: 0;
        }
        @keyframes line-grow-down {
          0% {
            transform: scaleY(0);
          }
          100% {
            transform: scaleY(1);
          }
        }
        .animate-line-grow {
          animation: line-grow-down 0.25s ease-out forwards;
          transform-origin: top;
        }
      `}</style>
      
      {/* Line going DOWN to next item (only if not last) */}
      {!isLast && (
        <div 
          className={`absolute -left-5 ${
            hasActiveTraces ? 'bg-zinc-600 dark:bg-zinc-300' : 'bg-zinc-400 dark:bg-zinc-500'
          } ${hasNewNextItem ? 'animate-line-grow' : ''}`}
          style={{
            width: '2px',
            marginLeft: '4px', /* Center line (2px) under dot (10px): (10-2)/2 = 4px */
            top: '50%', /* Start at center of current row (where dot is) */
            height: '100%', /* Span full row height to reach next dot center */
          }}
        />
      )}
      
      {/* Timeline dot - orange for error, all same color based on whether ANY trace is active */}
      <div className="absolute -left-5 top-1/2 -translate-y-1/2">
        <span className={`block rounded-full w-2.5 h-2.5 ${
          isError ? 'bg-orange-500' : 
          hasActiveTraces ? 'bg-zinc-600 dark:bg-zinc-300' : 
          'bg-zinc-400 dark:bg-zinc-500'
        } ${isNew ? 'animate-dot-emerge' : ''}`} />
      </div>

      {/* Label with shimmer for active, muted for done, orange for errors */}
      {isShimmering ? (
        <ShimmerText 
          text={displayLabel} 
          isNew={isNew} 
        />
      ) : (
        <span 
          className={`
            flex-1 min-w-0 truncate
            ${isError ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}
            ${isNew ? 'animate-text-emerge' : ''}
          `}
        >
          {displayLabel}
        </span>
      )}

      {/* Duration */}
      {operation.duration_ms !== undefined && operation.duration_ms > 0 && (
        <span className={`text-xs text-muted-foreground/70 tabular-nums ${isNew ? 'animate-text-emerge' : ''}`}>
          {operation.duration_ms < 1000 
            ? `${operation.duration_ms}ms` 
            : `${(operation.duration_ms / 1000).toFixed(1)}s`}
        </span>
      )}
    </div>
  );
}

/**
 * Shimmer text component that handles dark/light mode
 */
function ShimmerText({ text, isNew }: { text: string; isNew?: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'starwars';
  
  // Dark mode: white shimmer on dark background
  // Light mode: dark shimmer on light background
  const baseColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const shimmerColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)';
  
  return (
    <span 
      className={`flex-1 min-w-0 truncate ${isNew ? 'animate-text-emerge' : ''}`}
      style={{
        color: baseColor,
        background: `linear-gradient(90deg, transparent 20%, ${shimmerColor} 50%, transparent 80%)`,
        backgroundSize: '150% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        animation: isNew 
          ? 'text-emerge 0.3s ease-out 0.35s forwards, shimmer-sweep 0.8s linear 0.65s infinite'
          : 'shimmer-sweep 0.8s linear infinite',
        opacity: isNew ? 0 : undefined,
      }}
    >
      {text}
    </span>
  );
}

// Memoize the component to prevent re-renders when traces Map reference changes but contents are same
export default React.memo(ExecutionTraceTimeline, (prevProps, nextProps) => {
  // Compare isExpanded
  if (prevProps.isExpanded !== nextProps.isExpanded) return false;
  
  // Compare traces Map contents
  if (prevProps.traces.size !== nextProps.traces.size) return false;
  
  for (const [key, value] of prevProps.traces) {
    const nextValue = nextProps.traces.get(key);
    if (!nextValue) return false;
    // Compare trace arrays by length and last trace (quick check)
    if (value.traces.length !== nextValue.traces.length) return false;
    if (value.isActive !== nextValue.isActive) return false;
  }
  
  return true; // Props are equal, skip re-render
});
