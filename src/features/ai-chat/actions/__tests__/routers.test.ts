import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NavigateFunction } from 'react-router-dom';

// ─── Module mocks (must be before imports) ───────────────────────────────────

vi.mock('react-hot-toast', () => ({ default: vi.fn() }));

// Mock KPI handlers used by handleFrontendAction's dynamic imports
vi.mock('../createKpi', () => ({
  handleCreateKpi: vi.fn(() => true),
  handleCreateKpiPrompt: vi.fn(async (_data: any, send: any) => {
    send({ type: 'frontend_tool_response', tool: 'Create_Kpi', response: JSON.stringify({ ok: true }) });
    return true;
  }),
}));
vi.mock('../updateKpi', () => ({
  handleUpdateKpi: vi.fn(() => true),
  handleUpdateKpiPrompt: vi.fn(async (_data: any, send: any) => {
    send({ type: 'frontend_tool_response', tool: 'Update_Kpi', response: JSON.stringify({ ok: true }) });
    return true;
  }),
}));
vi.mock('../deleteKpi', () => ({
  handleDeleteKpi: vi.fn(() => true),
  handleDeleteKpiPrompt: vi.fn(async (_data: any, send: any) => {
    send({ type: 'frontend_tool_response', tool: 'Delete_Kpi', response: JSON.stringify({ ok: true }) });
    return true;
  }),
}));
vi.mock('../listKpi', () => ({
  handleListKpi: vi.fn(() => true),
  handleListKpiPrompt: vi.fn(async (_data: any, send: any) => {
    send({ type: 'frontend_tool_response', tool: 'List_Kpi', response: JSON.stringify({ ok: true }) });
    return true;
  }),
}));

// Mock task action handlers used by handleFrontendAction's dynamic imports
vi.mock('../taskActions', () => ({
  handleCreateTask: vi.fn(() => true),
  handleCreateTaskPrompt: vi.fn(async (_data: any, send: any) => {
    send({ type: 'frontend_tool_response', tool: 'Create_Task', response: JSON.stringify({ ok: true }) });
    return true;
  }),
  handleUpdateTask: vi.fn(() => true),
  handleUpdateTaskPrompt: vi.fn(async (_data: any, send: any) => {
    send({ type: 'frontend_tool_response', tool: 'Update_Task', response: JSON.stringify({ ok: true }) });
    return true;
  }),
  handleDeleteTask: vi.fn(() => true),
  handleDeleteTaskPrompt: vi.fn(async (_data: any, send: any) => {
    send({ type: 'frontend_tool_response', tool: 'Delete_Task', response: JSON.stringify({ ok: true }) });
    return true;
  }),
  handleChangeTaskStatus: vi.fn(() => true),
  handleChangeTaskStatusPrompt: vi.fn(async (_data: any, send: any) => {
    send({ type: 'frontend_tool_response', tool: 'Change_Task_Status', response: JSON.stringify({ ok: true }) });
    return true;
  }),
  handleAddTaskTag: vi.fn(() => true),
  handleAddTaskTagPrompt: vi.fn(async (_data: any, send: any) => {
    send({ type: 'frontend_tool_response', tool: 'Add_Task_Tag', response: JSON.stringify({ ok: true }) });
    return true;
  }),
  handleRemoveTaskTag: vi.fn(() => true),
  handleRemoveTaskTagPrompt: vi.fn(async (_data: any, send: any) => {
    send({ type: 'frontend_tool_response', tool: 'Remove_Task_Tag', response: JSON.stringify({ ok: true }) });
    return true;
  }),
  handleAddTaskNote: vi.fn(() => true),
  handleAddTaskNotePrompt: vi.fn(async (_data: any, send: any) => {
    send({ type: 'frontend_tool_response', tool: 'Add_Task_Note', response: JSON.stringify({ ok: true }) });
    return true;
  }),
}));

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { handleFrontendAction } from '../handleFrontendAction';
import { processFrontendTool, isFrontendTool } from '../frontend_tools';
import { handleFrontendToolPromptMessage } from '../frontend_tool_prompts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tick(ms = 50) {
  return new Promise((r) => setTimeout(r, ms));
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. handleFrontendAction
// ═════════════════════════════════════════════════════════════════════════════

describe('handleFrontendAction', () => {
  let navigate: NavigateFunction;
  let wsSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    navigate = vi.fn() as unknown as NavigateFunction;
    wsSend = vi.fn(() => true);
  });

  // ── navigate ──────────────────────────────────────────────────────────────

  it('routes "navigate" action and calls navigate()', () => {
    handleFrontendAction(
      { action: 'navigate', data: { path: '/dashboard' } },
      'conv-1',
      wsSend,
      navigate,
    );

    expect(navigate).toHaveBeenCalledWith('/dashboard');
    expect(wsSend).toHaveBeenCalledWith('conv-1', {
      type: 'frontend_action_response',
      response: 'Navigated to /dashboard',
    });
  });

  // ── alert ─────────────────────────────────────────────────────────────────

  it('routes "alert" action and sends "Alert shown" response', () => {
    handleFrontendAction(
      { action: 'alert', data: { message: 'Hello!' } },
      'conv-2',
      wsSend,
      navigate,
    );

    expect(wsSend).toHaveBeenCalledWith('conv-2', {
      type: 'frontend_action_response',
      response: 'Alert shown',
    });
  });

  // ── KPI actions ───────────────────────────────────────────────────────────

  it('routes "create_kpi" to dynamic import handler', async () => {
    handleFrontendAction(
      { action: 'create_kpi', data: { name: 'Revenue' } },
      'conv-3',
      wsSend,
      navigate,
    );

    await tick();

    // The dynamic import handler calls wsSend via callback
    expect(wsSend).toHaveBeenCalledWith('conv-3', expect.objectContaining({
      type: 'frontend_action_response',
    }));
  });

  it('routes "update_kpi" to dynamic import handler', async () => {
    handleFrontendAction(
      { action: 'update_kpi', data: { id: 5, name: 'Updated' } },
      'conv-4',
      wsSend,
      navigate,
    );

    await tick();

    expect(wsSend).toHaveBeenCalledWith('conv-4', expect.objectContaining({
      type: 'frontend_action_response',
    }));
  });

  it('routes "delete_kpi" to dynamic import handler', async () => {
    handleFrontendAction(
      { action: 'delete_kpi', data: { id: 3 } },
      'conv-5',
      wsSend,
      navigate,
    );

    await tick();

    expect(wsSend).toHaveBeenCalledWith('conv-5', expect.objectContaining({
      type: 'frontend_action_response',
    }));
  });

  it('routes "list_kpi" to dynamic import handler', async () => {
    handleFrontendAction(
      { action: 'list_kpi', data: {} },
      'conv-6',
      wsSend,
      navigate,
    );

    await tick();

    expect(wsSend).toHaveBeenCalledWith('conv-6', expect.objectContaining({
      type: 'frontend_action_response',
    }));
  });

  // ── Task actions ──────────────────────────────────────────────────────────

  it('routes "create_task" to dynamic import handler', async () => {
    handleFrontendAction(
      { action: 'create_task', data: { name: 'Fix bug' } },
      'conv-7',
      wsSend,
      navigate,
    );

    await tick();

    expect(wsSend).toHaveBeenCalledWith('conv-7', expect.objectContaining({
      type: 'frontend_action_response',
    }));
  });

  it('routes "add_task_note" to dynamic import handler', async () => {
    handleFrontendAction(
      { action: 'add_task_note', data: { task_id: 1, content: 'Note' } },
      'conv-8',
      wsSend,
      navigate,
    );

    await tick();

    expect(wsSend).toHaveBeenCalledWith('conv-8', expect.objectContaining({
      type: 'frontend_action_response',
    }));
  });

  // ── Generic CRUD catch-all ────────────────────────────────────────────────

  it('routes "create_categories" via generic CRUD catch-all', async () => {
    handleFrontendAction(
      { action: 'create_categories', data: { name: 'Support' } },
      'conv-9',
      wsSend,
      navigate,
    );

    // Generic handler is async (dispatches to store)
    await tick();

    expect(wsSend).toHaveBeenCalledWith('conv-9', expect.objectContaining({
      type: 'frontend_action_response',
    }));
  });

  it('routes "delete_tags" via generic CRUD catch-all', async () => {
    handleFrontendAction(
      { action: 'delete_tags', data: { id: 10 } },
      'conv-10',
      wsSend,
      navigate,
    );

    await tick();

    expect(wsSend).toHaveBeenCalledWith('conv-10', expect.objectContaining({
      type: 'frontend_action_response',
    }));
  });

  // ── Unrecognized action ───────────────────────────────────────────────────

  it('sends default "ok" response for unrecognized actions', () => {
    handleFrontendAction(
      { action: 'unknown_xyz', data: {} },
      'conv-11',
      wsSend,
      navigate,
    );

    expect(wsSend).toHaveBeenCalledWith('conv-11', {
      type: 'frontend_action_response',
      response: 'ok',
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it('sends error response when navigate throws', () => {
    (navigate as any).mockImplementation(() => {
      throw new Error('Router exploded');
    });

    handleFrontendAction(
      { action: 'navigate', data: { path: '/boom' } },
      'conv-12',
      wsSend,
      navigate,
    );

    expect(wsSend).toHaveBeenCalledWith('conv-12', {
      type: 'frontend_action_response',
      error: 'Error: Router exploded',
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. frontend_tools.ts — isFrontendTool & processFrontendTool
// ═════════════════════════════════════════════════════════════════════════════

describe('isFrontendTool', () => {
  it('returns true for Browser_Alert', () => {
    expect(isFrontendTool('Browser_Alert')).toBe(true);
  });

  it('returns true for Create_Task (registered tool)', () => {
    expect(isFrontendTool('Create_Task')).toBe(true);
  });

  it('returns true for generic CRUD tool Create_Categories', () => {
    expect(isFrontendTool('Create_Categories')).toBe(true);
  });

  it('returns true for generic CRUD tool Update_Statuses', () => {
    expect(isFrontendTool('Update_Statuses')).toBe(true);
  });

  it('returns false for unknown tool', () => {
    expect(isFrontendTool('Unknown_Tool')).toBe(false);
  });

  it('returns false for partial match like "Create"', () => {
    expect(isFrontendTool('Create')).toBe(false);
  });
});

describe('processFrontendTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes Browser_Alert and returns true', () => {
    const result = processFrontendTool('Browser_Alert', {
      action: 'browser_alert',
      message: 'Hi there',
    });

    expect(result).toBe(true);
  });

  it('parses string result before processing', () => {
    const result = processFrontendTool(
      'Browser_Alert',
      JSON.stringify({ action: 'browser_alert', message: 'Hello' }),
    );

    expect(result).toBe(true);
  });

  it('returns false for invalid JSON string', () => {
    const result = processFrontendTool('Browser_Alert', 'not-valid-json');
    expect(result).toBe(false);
  });

  it('returns false for unknown tool name', () => {
    const result = processFrontendTool('Totally_Unknown', { action: 'foo' });
    expect(result).toBe(false);
  });

  it('processes generic CRUD tool Create_Categories', () => {
    const result = processFrontendTool('Create_Categories', {
      action: 'create_categories',
      data: { name: 'Test Category' },
    });

    expect(result).toBe(true);
  });

  it('processes generic CRUD tool Delete_Tags', () => {
    const result = processFrontendTool('Delete_Tags', {
      action: 'delete_tags',
      data: { id: 42 },
    });

    expect(result).toBe(true);
  });

  it('processes Browser_Navigate with valid path', () => {
    const navigateFn = vi.fn();
    const result = processFrontendTool(
      'Browser_Navigate',
      { action: 'browser_navigate', path: '/tasks' },
      undefined,
      navigateFn,
    );

    expect(result).toBe(true);
    expect(navigateFn).toHaveBeenCalledWith('/tasks');
  });

  it('returns false for Browser_Navigate with dangerous path', () => {
    const navigateFn = vi.fn();
    const result = processFrontendTool(
      'Browser_Navigate',
      { action: 'browser_navigate', path: 'javascript:alert(1)' },
      undefined,
      navigateFn,
    );

    expect(result).toBe(false);
    expect(navigateFn).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. frontend_tool_prompts.ts — handleFrontendToolPromptMessage
// ═════════════════════════════════════════════════════════════════════════════

describe('handleFrontendToolPromptMessage', () => {
  let send: ReturnType<typeof vi.fn>;
  let navigateFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    send = vi.fn();
    navigateFn = vi.fn();
  });

  // ── browser_alert ─────────────────────────────────────────────────────────

  it('routes browser_alert and sends response', () => {
    const result = handleFrontendToolPromptMessage(
      { type: 'frontend_tool_prompt', action: 'browser_alert', data: { message: 'Hello' } },
      send,
    );

    expect(result).toBe(true);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'frontend_tool_response', response: 'ok' }),
    );
  });

  // ── browser_navigate ──────────────────────────────────────────────────────

  it('routes browser_navigate with valid path', () => {
    const result = handleFrontendToolPromptMessage(
      { type: 'frontend_tool_prompt', action: 'browser_navigate', data: { path: '/dashboard' } },
      send,
      navigateFn,
    );

    expect(result).toBe(true);
    expect(navigateFn).toHaveBeenCalledWith('/dashboard');
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'frontend_tool_response', response: 'ok' }),
    );
  });

  it('rejects browser_navigate with javascript: protocol', () => {
    const result = handleFrontendToolPromptMessage(
      { type: 'frontend_tool_prompt', action: 'browser_navigate', data: { path: 'javascript:alert(1)' } },
      send,
      navigateFn,
    );

    expect(result).toBe(true);
    expect(navigateFn).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'frontend_tool_response',
        response: expect.stringContaining('Error'),
      }),
    );
  });

  it('rejects browser_navigate with protocol-relative URL', () => {
    const result = handleFrontendToolPromptMessage(
      { type: 'frontend_tool_prompt', action: 'browser_navigate', data: { path: '//evil.com/steal' } },
      send,
      navigateFn,
    );

    expect(result).toBe(true);
    expect(navigateFn).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'frontend_tool_response',
        response: expect.stringContaining('Error'),
      }),
    );
  });

  it('rejects browser_navigate with external domain', () => {
    const result = handleFrontendToolPromptMessage(
      { type: 'frontend_tool_prompt', action: 'browser_navigate', data: { path: 'https://evil.com/phish' } },
      send,
      navigateFn,
    );

    expect(result).toBe(true);
    expect(navigateFn).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'frontend_tool_response',
        response: expect.stringContaining('Error'),
      }),
    );
  });

  // ── KPI actions ───────────────────────────────────────────────────────────

  it('routes create_kpi action', () => {
    const result = handleFrontendToolPromptMessage(
      { type: 'frontend_tool_prompt', action: 'create_kpi', data: { name: 'Revenue' } },
      send,
      navigateFn,
    );

    expect(result).toBe(true);
  });

  it('routes update_kpi action', () => {
    const result = handleFrontendToolPromptMessage(
      { type: 'frontend_tool_prompt', action: 'update_kpi', data: { id: 1, name: 'Updated' } },
      send,
    );

    expect(result).toBe(true);
  });

  // ── Task actions ──────────────────────────────────────────────────────────

  it('routes create_task action', () => {
    const result = handleFrontendToolPromptMessage(
      { type: 'frontend_tool_prompt', action: 'create_task', data: { name: 'New task' } },
      send,
    );

    expect(result).toBe(true);
  });

  it('routes change_task_status action', () => {
    const result = handleFrontendToolPromptMessage(
      { type: 'frontend_tool_prompt', action: 'change_task_status', data: { id: 1, status_id: 2 } },
      send,
    );

    expect(result).toBe(true);
  });

  // ── Generic CRUD catch-all ────────────────────────────────────────────────

  it('routes create_categories via generic catch-all', () => {
    const result = handleFrontendToolPromptMessage(
      { type: 'frontend_tool_prompt', action: 'create_categories', data: { name: 'Billing' } },
      send,
    );

    expect(result).toBe(true);
  });

  it('routes update_teams via generic catch-all', () => {
    const result = handleFrontendToolPromptMessage(
      { type: 'frontend_tool_prompt', action: 'update_teams', data: { id: 1, name: 'Eng' } },
      send,
    );

    expect(result).toBe(true);
  });

  it('routes list_priorities via generic catch-all', () => {
    const result = handleFrontendToolPromptMessage(
      { type: 'frontend_tool_prompt', action: 'list_priorities', data: {} },
      send,
    );

    expect(result).toBe(true);
  });

  // ── Unknown action ────────────────────────────────────────────────────────

  it('returns false for unknown actions', () => {
    const result = handleFrontendToolPromptMessage(
      { type: 'frontend_tool_prompt', action: 'totally_unknown', data: {} },
      send,
    );

    expect(result).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it('returns false when action is undefined', () => {
    const result = handleFrontendToolPromptMessage(
      { type: 'frontend_tool_prompt' },
      send,
    );

    expect(result).toBe(false);
  });
});
