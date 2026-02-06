/**
 * Execution Trace Types
 * 
 * These types represent real-time execution traces from the backend.
 * Traces are for UI visualization only and are NOT part of chat history.
 */

export type TraceStatus = 'start' | 'progress' | 'end' | 'error';

export interface ExecutionTrace {
  type: 'execution_trace';
  trace_id: string;
  parent_id?: string;
  tool_call_id: string;  // Links to the tool call this trace belongs to
  tool: string;          // e.g., 'web', 'tavily', 'math', 'graph', 'skills'
  operation: string;     // e.g., 'get', 'search', 'calculate'
  status: TraceStatus;
  label: string;         // Human-readable description
  details?: Record<string, any>;
  timestamp: number;
  duration_ms?: number;  // Set on 'end' status
}

/**
 * Aggregated trace state for a tool call
 * Groups all traces belonging to a single tool_call_id
 */
export interface ToolCallTraces {
  tool_call_id: string;
  tool_name?: string;
  traces: ExecutionTrace[];
  isActive: boolean;     // True if any trace is still in 'start' or 'progress' status
  startTime?: number;
  endTime?: number;
}

/**
 * Check if a WebSocket message is an execution trace
 */
export function isExecutionTrace(data: any): data is ExecutionTrace {
  return data && data.type === 'execution_trace' && typeof data.trace_id === 'string';
}

/**
 * Get a user-friendly icon for a tool
 */
export function getToolIcon(tool: string): string {
  const icons: Record<string, string> = {
    web: 'globe',
    tavily: 'search',
    math: 'calculator',
    graph: 'share-2',
    skills: 'file-text',
  };
  return icons[tool] || 'tool';
}

/**
 * Get a color class for a trace status
 */
export function getStatusColor(status: TraceStatus): string {
  switch (status) {
    case 'start':
      return 'text-blue-500';
    case 'progress':
      return 'text-yellow-500';
    case 'end':
      return 'text-green-500';
    case 'error':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}
