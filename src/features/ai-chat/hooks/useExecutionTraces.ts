import { useState, useCallback, useRef } from 'react';
import { ExecutionTrace, ToolCallTraces, isExecutionTrace } from '../models/traces';
import { Message } from '../models';

import { Logger } from '@/utils/logger';
// Get environment variables
const VITE_API_URL = (import.meta as any).env?.VITE_API_URL || '';
const VITE_CHAT_URL = (import.meta as any).env?.VITE_CHAT_URL || '';
const HOST = VITE_CHAT_URL || VITE_API_URL || window.location.origin;

/**
 * Hook for managing execution trace state
 * 
 * Traces are ephemeral - they're for real-time UI visualization only
 * and are NOT stored in chat history or sent back to the model.
 */
export function useExecutionTraces() {
  // Map of tool_call_id -> traces for that tool call
  const [traces, setTraces] = useState<Map<string, ToolCallTraces>>(new Map());
  
  // Track active tool calls
  const activeTraceIds = useRef<Set<string>>(new Set());
  
  // Ref to access current traces without adding to dependency arrays
  const tracesRef = useRef<Map<string, ToolCallTraces>>(traces);
  tracesRef.current = traces;

  /**
   * Process an incoming trace event
   */
  const handleTrace = useCallback((data: any) => {
    if (!isExecutionTrace(data)) {
      return false; // Not a trace event
    }

    const trace = data as ExecutionTrace;
    
    setTraces(prev => {
      const newMap = new Map(prev);
      const toolCallId = trace.tool_call_id;
      
      // Get or create the tool call traces
      let toolCallTraces = newMap.get(toolCallId);
      if (!toolCallTraces) {
        toolCallTraces = {
          tool_call_id: toolCallId,
          traces: [],
          isActive: true,
          startTime: trace.timestamp,
        };
      }

      // Add the new trace
      const newTraces = [...toolCallTraces.traces, trace];
      
      // Update active status based on trace status
      let isActive = toolCallTraces.isActive;
      if (trace.status === 'start') {
        activeTraceIds.current.add(trace.trace_id);
        isActive = true;
      } else if (trace.status === 'end' || trace.status === 'error') {
        activeTraceIds.current.delete(trace.trace_id);
        // Only mark as inactive if no other traces are active for this tool call
        const hasActiveTraces = newTraces.some(
          t => t.status === 'start' && !newTraces.some(
            t2 => (t2.status === 'end' || t2.status === 'error') && t2.trace_id === t.trace_id
          )
        );
        isActive = hasActiveTraces;
      }

      // Update end time if this is an end/error trace
      let endTime = toolCallTraces.endTime;
      if ((trace.status === 'end' || trace.status === 'error') && !isActive) {
        endTime = trace.timestamp;
      }

      newMap.set(toolCallId, {
        ...toolCallTraces,
        traces: newTraces,
        isActive,
        endTime,
      });

      return newMap;
    });

    return true; // Successfully handled as a trace event
  }, []);

  /**
   * Clear all traces (call when starting a new interaction)
   */
  const clearTraces = useCallback(() => {
    setTraces(new Map());
    activeTraceIds.current.clear();
  }, []);

  /**
   * Clear traces for a specific tool call
   */
  const clearToolCallTraces = useCallback((toolCallId: string) => {
    setTraces(prev => {
      const newMap = new Map(prev);
      newMap.delete(toolCallId);
      return newMap;
    });
  }, []);

  /**
   * Check if there are any active traces
   */
  const hasActiveTraces = useCallback(() => {
    for (const [, toolCallTraces] of traces) {
      if (toolCallTraces.isActive) return true;
    }
    return false;
  }, [traces]);

  /**
   * Get traces for a specific tool call
   */
  const getToolCallTraces = useCallback((toolCallId: string) => {
    return traces.get(toolCallId);
  }, [traces]);

  /**
   * Load traces from the API for a conversation (used when loading existing chats)
   * Also synthesizes traces from tool_call/tool_result messages for regular tools
   */
  const loadTracesFromAPI = useCallback(async (conversationId: string, messages?: Message[]) => {
    // Start with existing traces to preserve real-time traces that arrived via WebSocket
    // Use ref to avoid adding traces to dependency array (would cause infinite loops)
    const newTraceMap = new Map<string, ToolCallTraces>(tracesRef.current);

    // First, try to load persisted traces from API (TypeScript executor internal traces)
    try {
      const base = HOST.includes("://") ? HOST : `${window.location.protocol}//${HOST}`;
      const response = await fetch(`${base}/api/v1/traces/${conversationId}`);
      if (response.ok) {
        const apiTraces: Array<{
          trace_id: string;
          parent_id?: string;
          tool_call_id: string;
          tool: string;
          operation: string;
          status: string;
          label: string;
          details?: Record<string, any>;
          timestamp: number;
          duration_ms?: number;
        }> = await response.json();

        if (Array.isArray(apiTraces) && apiTraces.length > 0) {
          for (const apiTrace of apiTraces) {
            const trace: ExecutionTrace = {
              type: 'execution_trace',
              trace_id: apiTrace.trace_id,
              parent_id: apiTrace.parent_id,
              tool_call_id: apiTrace.tool_call_id,
              tool: apiTrace.tool,
              operation: apiTrace.operation,
              status: apiTrace.status as 'start' | 'progress' | 'end' | 'error',
              label: apiTrace.label,
              details: apiTrace.details,
              timestamp: apiTrace.timestamp,
              duration_ms: apiTrace.duration_ms,
            };

            const toolCallId = trace.tool_call_id;
            let toolCallTraces = newTraceMap.get(toolCallId);

            if (!toolCallTraces) {
              toolCallTraces = {
                tool_call_id: toolCallId,
                traces: [],
                isActive: false,
                startTime: trace.timestamp,
              };
            }

            toolCallTraces.traces.push(trace);

            if (trace.status === 'end' || trace.status === 'error') {
              toolCallTraces.endTime = trace.timestamp;
            }

            newTraceMap.set(toolCallId, toolCallTraces);
          }
          Logger.info('assistant', `[Traces] Loaded ${apiTraces.length} persisted traces`);
        }
      }
    } catch (error) {
      Logger.error('assistant', 'Error loading traces from API:', error);
    }

    // Second, synthesize traces from tool_call/tool_result messages for regular tools
    // This ensures all tools show up in the timeline, even if they weren't persisted
    if (messages && messages.length > 0) {
      const toolCalls = new Map<string, { name: string; args: any; index: number }>();
      const toolResults = new Map<string, { content: any; index: number }>();

      // Collect tool calls and results
      messages.forEach((msg, index) => {
        if (msg.role === 'tool_call' && typeof msg.content === 'object' && msg.content !== null) {
          const content = msg.content as any;
          if (content.tool_call_id) {
            toolCalls.set(content.tool_call_id, {
              name: content.name || 'Unknown',
              args: content.args || {},
              index,
            });
          }
        } else if (msg.role === 'tool_result' && typeof msg.content === 'object' && msg.content !== null) {
          const content = msg.content as any;
          if (content.tool_call_id) {
            toolResults.set(content.tool_call_id, {
              content: content.content,
              index,
            });
          }
        }
      });

      // Create synthetic traces for tool calls that don't have persisted traces
      for (const [toolCallId, toolCall] of toolCalls) {
        // Skip if we already have traces for this tool call from the API
        if (newTraceMap.has(toolCallId)) {
          continue;
        }

        const result = toolResults.get(toolCallId);
        const hasResult = !!result;
        // Check if the result contains an error
        const isError = !hasResult || (
          result?.content && 
          typeof result.content === 'object' && 
          'error' in result.content
        ) || (
          result?.content && 
          typeof result.content === 'string' && 
          result.content.includes('"error"')
        );
        
        const timestamp = Date.now() - (messages.length - toolCall.index) * 1000; // Approximate timestamp
        const traceId = `synthetic_${toolCallId}`; // Same trace_id for start and end so they pair correctly

        // Create start trace
        const startTrace: ExecutionTrace = {
          type: 'execution_trace',
          trace_id: traceId,
          tool_call_id: toolCallId,
          tool: getToolCategory(toolCall.name),
          operation: toolCall.name,
          status: 'start',
          label: getToolStartLabel(toolCall.name, toolCall.args),
          timestamp,
        };

        // Create end trace - error if no result or result contains error
        const endTrace: ExecutionTrace = {
          type: 'execution_trace',
          trace_id: traceId, // Same trace_id as start trace
          tool_call_id: toolCallId,
          tool: getToolCategory(toolCall.name),
          operation: toolCall.name,
          status: isError ? 'error' : 'end',
          label: isError ? getToolStartLabel(toolCall.name, toolCall.args) : getToolEndLabel(toolCall.name, toolCall.args),
          timestamp: timestamp + 100, // Slight offset for ordering
        };

        newTraceMap.set(toolCallId, {
          tool_call_id: toolCallId,
          traces: [startTrace, endTrace],
          isActive: false,
          startTime: timestamp,
          endTime: timestamp + 100,
        });
      }

      Logger.info('assistant', `[Traces] Total traces after synthesis: ${newTraceMap.size} tool calls`);
    }

    setTraces(newTraceMap);
  }, []);

  return {
    traces,
    handleTrace,
    clearTraces,
    clearToolCallTraces,
    hasActiveTraces,
    getToolCallTraces,
    loadTracesFromAPI,
  };
}

// Helper functions to generate labels (matching backend logic)

/**
 * Extract a meaningful description from TypeScript code
 * Looks for API calls like graph.get(), web.post(), tavily.search(), etc.
 */
function getCodeDescription(code: string | undefined, prefix: string): string {
  if (!code) return `${prefix} code`;
  
  // Look for common API patterns
  const patterns = [
    // Graph API calls
    { regex: /graph\.(get|post|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/i, format: (m: RegExpMatchArray) => `${m[1].toUpperCase()} ${m[2]}` },
    // Web/HTTP calls
    { regex: /web\.(get|post|patch|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/i, format: (m: RegExpMatchArray) => `${m[1].toUpperCase()} ${m[2].slice(0, 30)}${m[2].length > 30 ? '...' : ''}` },
    // Tavily search
    { regex: /tavily\.(search|quickSearch)\s*\(\s*['"`]([^'"`]+)['"`]/i, format: (m: RegExpMatchArray) => `Search: "${m[2].slice(0, 30)}${m[2].length > 30 ? '...' : ''}"` },
    // Skills operations
    { regex: /skills\.(list|read|create|edit|remove)\s*\(/i, format: (m: RegExpMatchArray) => `${m[1]} skills` },
    // Math operations
    { regex: /math\.(evaluate|simplify|derivative)\s*\(/i, format: (m: RegExpMatchArray) => `Math ${m[1]}` },
  ];
  
  for (const { regex, format } of patterns) {
    const match = code.match(regex);
    if (match) {
      return `${prefix}: ${format(match)}`;
    }
  }
  
  // Fallback: try to get first meaningful line
  const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('import'));
  if (lines.length > 0) {
    const firstLine = lines[0].trim().slice(0, 40);
    if (firstLine.length > 5) {
      return `${prefix}: ${firstLine}${lines[0].trim().length > 40 ? '...' : ''}`;
    }
  }
  
  return `${prefix} code`;
}

function getToolCategory(toolName: string): string {
  switch (toolName) {
    case 'Search':
    case 'Brave_Search':
      return 'search';
    case 'Execute_TypeScript':
      return 'code';
    case 'Generate_Image':
      return 'image';
    case 'List_Skill_Files':
    case 'Read_Skill_File':
    case 'Edit_Skill_File':
    case 'Create_Skill_File':
    case 'Delete_Skill_File':
      return 'skills';
    case 'Browser_Alert':
    case 'Browser_Prompt':
    case 'Browser_Navigate':
    case 'Sandbox_Run':
    case 'Confirm_With_User':
      return 'browser';
    case 'Create_Kpi':
    case 'Update_Kpi':
    case 'Delete_Kpi':
    case 'List_Kpi':
      return 'kpi';
    default:
      if (toolName.includes('Workflow')) {
        return 'workflow';
      }
      return 'tool';
  }
}

function getToolStartLabel(toolName: string, args: any): string {
  switch (toolName) {
    case 'Search':
    case 'Brave_Search':
      if (args?.query) {
        const query = args.query.length > 50 ? args.query.slice(0, 50) + '...' : args.query;
        return `Searching: "${query}"`;
      }
      return 'Searching the web';
    case 'Execute_TypeScript':
      return getCodeDescription(args?.code, 'Running');
    case 'Generate_Image':
      if (args?.prompt) {
        const prompt = args.prompt.length > 40 ? args.prompt.slice(0, 40) + '...' : args.prompt;
        return `Generating: "${prompt}"`;
      }
      return 'Generating image';
    case 'List_Skill_Files':
      return 'Listing skills';
    case 'Read_Skill_File':
      return args?.name ? `Reading skill: ${args.name}` : 'Reading skill';
    case 'Edit_Skill_File':
      return args?.name ? `Editing skill: ${args.name}` : 'Editing skill';
    case 'Browser_Navigate':
      return args?.path ? `Navigating to ${args.path}` : 'Navigating';
    case 'Browser_Alert':
      return 'Showing alert';
    case 'Browser_Prompt':
      return 'Prompting user';
    case 'Sandbox_Run':
      return 'Running in sandbox';
    case 'Confirm_With_User':
      return 'Waiting for confirmation';
    case 'Create_Kpi':
      if (args?.name) {
        const name = args.name.length > 40 ? args.name.slice(0, 40) + '...' : args.name;
        return `Creating KPI: "${name}"`;
      }
      return 'Creating KPI card';
    case 'Update_Kpi':
      if (args?.name) {
        const uName = args.name.length > 40 ? args.name.slice(0, 40) + '...' : args.name;
        return `Updating KPI: "${uName}"`;
      }
      return args?.id ? `Updating KPI #${args.id}` : 'Updating KPI card';
    case 'Delete_Kpi':
      return args?.id ? `Deleting KPI #${args.id}` : 'Deleting KPI card';
    case 'List_Kpi':
      return 'Listing KPI cards';
    default:
      return `Running ${toolName.replace(/_/g, ' ')}`;
  }
}

function getToolEndLabel(toolName: string, args?: any): string {
  switch (toolName) {
    case 'Search':
    case 'Brave_Search':
      if (args?.query) {
        const query = args.query.length > 50 ? args.query.slice(0, 50) + '...' : args.query;
        return `Searched: "${query}"`;
      }
      return 'Searched the web';
    case 'Execute_TypeScript':
      return getCodeDescription(args?.code, 'Ran');
    case 'Generate_Image':
      if (args?.prompt) {
        const prompt = args.prompt.length > 40 ? args.prompt.slice(0, 40) + '...' : args.prompt;
        return `Generated: "${prompt}"`;
      }
      return 'Generated image';
    case 'List_Skill_Files':
      return 'Listed skills';
    case 'Read_Skill_File':
      return args?.name ? `Read skill: ${args.name}` : 'Read skill';
    case 'Edit_Skill_File':
      return args?.name ? `Edited skill: ${args.name}` : 'Edited skill';
    case 'Browser_Navigate':
      return args?.path ? `Navigated to ${args.path}` : 'Navigated';
    case 'Browser_Alert':
      return 'Showed alert';
    case 'Browser_Prompt':
      return 'User responded';
    case 'Sandbox_Run':
      return 'Sandbox completed';
    case 'Confirm_With_User':
      return 'User responded';
    case 'Create_Kpi':
      if (args?.name) {
        const name = args.name.length > 40 ? args.name.slice(0, 40) + '...' : args.name;
        return `Created KPI: "${name}"`;
      }
      return 'Created KPI card';
    case 'Update_Kpi':
      if (args?.name) {
        const uName = args.name.length > 40 ? args.name.slice(0, 40) + '...' : args.name;
        return `Updated KPI: "${uName}"`;
      }
      return args?.id ? `Updated KPI #${args.id}` : 'Updated KPI card';
    case 'Delete_Kpi':
      return args?.id ? `Deleted KPI #${args.id}` : 'Deleted KPI card';
    case 'List_Kpi':
      return 'Listed KPI cards';
    default:
      return `Ran ${toolName.replace(/_/g, ' ')}`;
  }
}
