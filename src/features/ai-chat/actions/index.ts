/**
 * Frontend Actions
 *
 * This folder contains all frontend tool/action implementations that the AI
 * agent can invoke. Tools are registered in frontend_tools.ts (tool_result
 * pathway) and frontend_tool_prompts.ts (frontend_tool_prompt pathway).
 *
 * To add a new action:
 * 1. Create a handler file (e.g., myAction.ts)
 * 2. Register it in frontend_tools.ts FRONTEND_TOOL_HANDLERS
 * 3. Add a case in frontend_tool_prompts.ts handleFrontendToolPromptMessage()
 * 4. Add categorization in hooks/useExecutionTraces.ts
 */

export { processFrontendTool, isFrontendTool, getFrontendToolNames } from './frontend_tools';
export type { FrontendToolResult, SendMessageCallback, NavigateCallback } from './frontend_tools';

export { handleFrontendToolPromptMessage } from './frontend_tool_prompts';
export type { FrontendToolPromptMessage, SendFrontendToolResponse } from './frontend_tool_prompts';

export { handleCreateKpi, handleCreateKpiPrompt } from './createKpi';
export type { CreateKpiInput } from './createKpi';
