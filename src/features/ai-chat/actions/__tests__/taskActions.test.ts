import { describe, it, expect, vi, beforeEach } from 'vitest';
import { store } from '@/store/store';
import { addTaskAsync, updateTaskAsync, removeTaskAsync, moveTaskThunk } from '@/store/reducers/tasksSlice';
import { genericActions } from '@/store/genericSlices';

import {
  handleCreateTask,
  handleCreateTaskPrompt,
  handleUpdateTask,
  handleUpdateTaskPrompt,
  handleDeleteTask,
  handleDeleteTaskPrompt,
  handleChangeTaskStatus,
  handleChangeTaskStatusPrompt,
  handleAddTaskTag,
  handleAddTaskTagPrompt,
  handleRemoveTaskTag,
  handleRemoveTaskTagPrompt,
  handleAddTaskNote,
  handleAddTaskNotePrompt,
} from '../taskActions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse the JSON response from a prompt-pathway `send` call. */
function parseSendResponse(send: ReturnType<typeof vi.fn>) {
  return JSON.parse(send.mock.calls[0][0].response);
}

/** Shorthand for making store.dispatch reject. */
function mockDispatchReject(msg = 'Network error') {
  vi.mocked(store.dispatch).mockReturnValueOnce({
    unwrap: () => Promise.reject(new Error(msg)),
  } as any);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Reset default dispatch behaviour (resolve with { id: 1 })
  vi.mocked(store.dispatch).mockImplementation(
    () => ({ unwrap: () => Promise.resolve({ id: 1 }) }) as any,
  );

  vi.mocked(store.getState).mockReturnValue({} as any);
});

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE TASK
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleCreateTask (tool_result pathway)', () => {
  it('returns true and dispatches addTaskAsync when name is provided', () => {
    const sendMessage = vi.fn();
    const result = handleCreateTask(
      { action: 'create_task', data: { name: 'New task' } },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(store.dispatch).toHaveBeenCalledOnce();
    expect(addTaskAsync).toHaveBeenCalledWith({ name: 'New task' });
  });

  it('returns true and logs error when name is missing', () => {
    const sendMessage = vi.fn();
    const result = handleCreateTask(
      { action: 'create_task', data: {} },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(expect.stringContaining('name'));
  });
});

describe('handleCreateTaskPrompt (prompt pathway)', () => {
  const validData = {
    tool: 'Create_Task',
    data: { name: 'Test', category_id: 1, team_id: 2, status_id: 1, priority_id: 3 },
  };

  it('sends ok:true with task on success', async () => {
    const send = vi.fn();
    await handleCreateTaskPrompt(validData, send);

    expect(send).toHaveBeenCalledOnce();
    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(true);
    expect(resp.task).toMatchObject({ id: 1, name: 'Test', category_id: 1 });
  });

  it('validates that name is required', async () => {
    const send = vi.fn();
    await handleCreateTaskPrompt({ tool: 'Create_Task', data: { category_id: 1, team_id: 2, status_id: 1, priority_id: 3 } }, send);

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toContain('name');
  });

  it('validates that category_id, team_id, status_id, priority_id are required', async () => {
    for (const field of ['category_id', 'team_id', 'status_id', 'priority_id']) {
      const send = vi.fn();
      const data = { name: 'T', category_id: 1, team_id: 2, status_id: 1, priority_id: 3 };
      delete (data as any)[field];
      await handleCreateTaskPrompt({ tool: 'Create_Task', data }, send);

      const resp = parseSendResponse(send);
      expect(resp.ok).toBe(false);
      expect(resp.error).toContain(field);
    }
  });

  it('sends ok:false with error when dispatch rejects', async () => {
    mockDispatchReject('Server error');
    const send = vi.fn();
    await handleCreateTaskPrompt(validData, send);

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toBe('Server error');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE TASK
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleUpdateTask (tool_result pathway)', () => {
  it('dispatches updateTaskAsync with id and updates', () => {
    const sendMessage = vi.fn();
    const result = handleUpdateTask(
      { action: 'update_task', data: { id: 42, name: 'Renamed' } },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(updateTaskAsync).toHaveBeenCalledWith({ id: 42, updates: { name: 'Renamed' } });
  });

  it('normalizes task_id to id', () => {
    handleUpdateTask({ action: 'update_task', data: { task_id: 7, name: 'X' } });
    expect(updateTaskAsync).toHaveBeenCalledWith({ id: 7, updates: { name: 'X' } });
  });

  it('normalizes taskId to id', () => {
    handleUpdateTask({ action: 'update_task', data: { taskId: 9, name: 'Y' } });
    expect(updateTaskAsync).toHaveBeenCalledWith({ id: 9, updates: { name: 'Y' } });
  });

  it('returns true and errors when id is missing', () => {
    const sendMessage = vi.fn();
    const result = handleUpdateTask(
      { action: 'update_task', data: { name: 'No id' } },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(expect.stringContaining('id'));
  });
});

describe('handleUpdateTaskPrompt (prompt pathway)', () => {
  it('sends ok:true on success', async () => {
    const send = vi.fn();
    await handleUpdateTaskPrompt({ tool: 'Update_Task', data: { id: 5, name: 'Updated' } }, send);

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(true);
    expect(resp.task.id).toBeDefined();
  });

  it('sends ok:false when id is missing', async () => {
    const send = vi.fn();
    await handleUpdateTaskPrompt({ tool: 'Update_Task', data: { name: 'No id' } }, send);

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toContain('id');
  });

  it('sends ok:false when dispatch rejects', async () => {
    mockDispatchReject('Update failed');
    const send = vi.fn();
    await handleUpdateTaskPrompt({ tool: 'Update_Task', data: { id: 5, name: 'X' } }, send);

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toBe('Update failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE TASK
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleDeleteTask (tool_result pathway)', () => {
  it('dispatches removeTaskAsync with bare id', () => {
    const sendMessage = vi.fn();
    const result = handleDeleteTask(
      { action: 'delete_task', data: { id: 10 } },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(removeTaskAsync).toHaveBeenCalledWith(10);
  });

  it('returns true and errors when id is missing', () => {
    const sendMessage = vi.fn();
    const result = handleDeleteTask(
      { action: 'delete_task', data: {} },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(expect.stringContaining('id'));
  });
});

describe('handleDeleteTaskPrompt (prompt pathway)', () => {
  it('sends ok:true with deleted id on success', async () => {
    const send = vi.fn();
    await handleDeleteTaskPrompt({ tool: 'Delete_Task', data: { id: 10 } }, send);

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(true);
    expect(resp.deleted).toEqual({ id: 10 });
  });

  it('sends ok:false when id is missing', async () => {
    const send = vi.fn();
    await handleDeleteTaskPrompt({ tool: 'Delete_Task', data: {} }, send);

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toContain('id');
  });

  it('sends ok:false when data payload is missing', async () => {
    const send = vi.fn();
    await handleDeleteTaskPrompt({ tool: 'Delete_Task' }, send);

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toContain('Missing data payload');
  });

  it('sends ok:false when dispatch rejects', async () => {
    mockDispatchReject('Delete failed');
    const send = vi.fn();
    await handleDeleteTaskPrompt({ tool: 'Delete_Task', data: { id: 3 } }, send);

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toBe('Delete failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CHANGE TASK STATUS
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleChangeTaskStatus (tool_result pathway)', () => {
  it('reads previous status from Redux and dispatches moveTaskThunk', () => {
    vi.mocked(store.getState).mockReturnValue({
      tasks: { value: [{ id: 42, status_id: 1 }] },
    } as any);

    const sendMessage = vi.fn();
    const result = handleChangeTaskStatus(
      { action: 'change_task_status', data: { id: 42, status_id: 3 } },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(moveTaskThunk).toHaveBeenCalledWith({
      taskId: 42,
      newStatusId: 3,
      previousStatusId: 1,
    });
  });

  it('defaults previousStatusId to 0 when task not found in store', () => {
    vi.mocked(store.getState).mockReturnValue({
      tasks: { value: [] },
    } as any);

    handleChangeTaskStatus(
      { action: 'change_task_status', data: { id: 99, status_id: 2 } },
    );
    expect(moveTaskThunk).toHaveBeenCalledWith({
      taskId: 99,
      newStatusId: 2,
      previousStatusId: 0,
    });
  });

  it('returns true and errors when id or status_id is missing', () => {
    const sendMessage = vi.fn();
    const result = handleChangeTaskStatus(
      { action: 'change_task_status', data: { id: 42 } },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(expect.stringContaining('status_id'));
  });
});

describe('handleChangeTaskStatusPrompt (prompt pathway)', () => {
  it('sends ok:true with task status info on success', async () => {
    vi.mocked(store.getState).mockReturnValue({
      tasks: { value: [{ id: 42, status_id: 1 }] },
    } as any);

    const send = vi.fn();
    await handleChangeTaskStatusPrompt(
      { tool: 'Change_Task_Status', data: { id: 42, status_id: 3 } },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(true);
    expect(resp.task.status_id).toBe(3);
    expect(resp.task.previous_status_id).toBe(1);
  });

  it('sends ok:false when id is missing', async () => {
    const send = vi.fn();
    await handleChangeTaskStatusPrompt(
      { tool: 'Change_Task_Status', data: { status_id: 3 } },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toContain('id');
  });

  it('sends ok:false when status_id is missing', async () => {
    const send = vi.fn();
    await handleChangeTaskStatusPrompt(
      { tool: 'Change_Task_Status', data: { id: 42 } },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toContain('status_id');
  });

  it('sends ok:false when data payload is missing', async () => {
    const send = vi.fn();
    await handleChangeTaskStatusPrompt({ tool: 'Change_Task_Status' }, send);

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toContain('Missing data payload');
  });

  it('sends ok:false when dispatch rejects', async () => {
    vi.mocked(store.getState).mockReturnValue({
      tasks: { value: [{ id: 42, status_id: 1 }] },
    } as any);
    mockDispatchReject('Move failed');

    const send = vi.fn();
    await handleChangeTaskStatusPrompt(
      { tool: 'Change_Task_Status', data: { id: 42, status_id: 3 } },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toBe('Move failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADD TASK TAG
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleAddTaskTag (tool_result pathway)', () => {
  it('dispatches genericActions.taskTags.addAsync with task_id and tag_id', () => {
    const sendMessage = vi.fn();
    const result = handleAddTaskTag(
      { action: 'add_task_tag', data: { task_id: 5, tag_id: 8 } },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(genericActions.taskTags.addAsync).toHaveBeenCalledWith({ task_id: 5, tag_id: 8 });
  });

  it('returns true and errors when task_id or tag_id is missing', () => {
    const sendMessage = vi.fn();
    const result = handleAddTaskTag(
      { action: 'add_task_tag', data: { task_id: 5 } },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith(expect.stringContaining('tag_id'));
  });
});

describe('handleAddTaskTagPrompt (prompt pathway)', () => {
  it('sends ok:true with taskTag on success', async () => {
    const send = vi.fn();
    await handleAddTaskTagPrompt(
      { tool: 'Add_Task_Tag', data: { task_id: 5, tag_id: 8 } },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(true);
    expect(resp.taskTag).toMatchObject({ task_id: 5, tag_id: 8 });
  });

  it('sends ok:false when task_id is missing', async () => {
    const send = vi.fn();
    await handleAddTaskTagPrompt(
      { tool: 'Add_Task_Tag', data: { tag_id: 8 } },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toContain('task_id');
  });

  it('sends ok:false when tag_id is missing', async () => {
    const send = vi.fn();
    await handleAddTaskTagPrompt(
      { tool: 'Add_Task_Tag', data: { task_id: 5 } },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toContain('tag_id');
  });

  it('sends ok:false when dispatch rejects', async () => {
    mockDispatchReject('Tag error');
    const send = vi.fn();
    await handleAddTaskTagPrompt(
      { tool: 'Add_Task_Tag', data: { task_id: 5, tag_id: 8 } },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toBe('Tag error');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REMOVE TASK TAG
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleRemoveTaskTag (tool_result pathway)', () => {
  it('dispatches genericActions.taskTags.removeAsync with bare id', () => {
    const sendMessage = vi.fn();
    const result = handleRemoveTaskTag(
      { action: 'remove_task_tag', data: { id: 77 } },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(genericActions.taskTags.removeAsync).toHaveBeenCalledWith(77);
  });

  it('returns true and errors when id is missing', () => {
    const sendMessage = vi.fn();
    const result = handleRemoveTaskTag(
      { action: 'remove_task_tag', data: {} },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith(expect.stringContaining('id'));
  });
});

describe('handleRemoveTaskTagPrompt (prompt pathway)', () => {
  it('sends ok:true with deleted id on success', async () => {
    const send = vi.fn();
    await handleRemoveTaskTagPrompt(
      { tool: 'Remove_Task_Tag', data: { id: 77 } },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(true);
    expect(resp.deleted).toEqual({ id: 77 });
  });

  it('sends ok:false when id is missing', async () => {
    const send = vi.fn();
    await handleRemoveTaskTagPrompt(
      { tool: 'Remove_Task_Tag', data: {} },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toContain('id');
  });

  it('sends ok:false when dispatch rejects', async () => {
    mockDispatchReject('Remove tag failed');
    const send = vi.fn();
    await handleRemoveTaskTagPrompt(
      { tool: 'Remove_Task_Tag', data: { id: 77 } },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toBe('Remove tag failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADD TASK NOTE
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleAddTaskNote (tool_result pathway)', () => {
  it('dispatches genericActions.taskNotes.addAsync with task_id and note', () => {
    const sendMessage = vi.fn();
    const result = handleAddTaskNote(
      { action: 'add_task_note', data: { task_id: 12, content: 'Hello' } },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(genericActions.taskNotes.addAsync).toHaveBeenCalledWith({ task_id: 12, note: 'Hello' });
  });

  it('returns true and errors when task_id or content is missing', () => {
    const sendMessage = vi.fn();
    const result = handleAddTaskNote(
      { action: 'add_task_note', data: { task_id: 12 } },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith(expect.stringContaining('content'));
  });
});

describe('handleAddTaskNotePrompt (prompt pathway)', () => {
  it('sends ok:true with note on success', async () => {
    const send = vi.fn();
    await handleAddTaskNotePrompt(
      { tool: 'Add_Task_Note', data: { task_id: 12, content: 'Hello' } },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(true);
    expect(resp.note).toMatchObject({ task_id: 12, content: 'Hello' });
  });

  it('sends ok:false when task_id is missing', async () => {
    const send = vi.fn();
    await handleAddTaskNotePrompt(
      { tool: 'Add_Task_Note', data: { content: 'Hello' } },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toContain('task_id');
  });

  it('sends ok:false when content is missing', async () => {
    const send = vi.fn();
    await handleAddTaskNotePrompt(
      { tool: 'Add_Task_Note', data: { task_id: 12 } },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toContain('content');
  });

  it('sends ok:false when content is empty string', async () => {
    const send = vi.fn();
    await handleAddTaskNotePrompt(
      { tool: 'Add_Task_Note', data: { task_id: 12, content: '   ' } },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toContain('content');
  });

  it('sends ok:false when dispatch rejects', async () => {
    mockDispatchReject('Note error');
    const send = vi.fn();
    await handleAddTaskNotePrompt(
      { tool: 'Add_Task_Note', data: { task_id: 12, content: 'Hello' } },
      send,
    );

    const resp = parseSendResponse(send);
    expect(resp.ok).toBe(false);
    expect(resp.error).toBe('Note error');
  });
});
