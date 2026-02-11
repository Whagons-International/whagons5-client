/**
 * Task Frontend Actions
 *
 * Handles all task-related tool calls from the AI agent:
 * create_task, update_task, delete_task, change_task_status,
 * add_task_tag, remove_task_tag, add_task_note.
 *
 * Each action has two handlers:
 * - handleXxxPrompt: for the frontend_action/prompt pathway (async, sends response via callback)
 * - handleXxx: for the tool_result pathway (dispatches and returns true immediately)
 */

import type { FrontendToolResult, SendMessageCallback, NavigateCallback } from './frontend_tools';
import { store } from '@/store/store';
import { addTaskAsync, updateTaskAsync, removeTaskAsync, moveTaskThunk } from '@/store/reducers/tasksSlice';
import { genericActions } from '@/store/genericSlices';
import { Logger } from '@/utils/logger';

// ─── Helper: normalize numeric ID from various input shapes ──────────────────

function normalizeId(raw: Record<string, any>, ...keys: string[]): number | null {
  for (const key of keys) {
    const val = raw[key];
    if (val != null) {
      const num = typeof val === 'number' ? val : parseInt(val, 10);
      if (!isNaN(num)) return num;
    }
  }
  return null;
}

// ─── CREATE TASK ─────────────────────────────────────────────────────────────

export function handleCreateTask(
  result: FrontendToolResult,
  sendMessage?: SendMessageCallback,
  navigate?: NavigateCallback,
): boolean {
  if (result.action && result.action !== 'create_task') return false;

  const rawInput = result.data ?? result;

  if (!rawInput.name) {
    Logger.error('assistant', '[Create_Task] Missing required field: name');
    if (sendMessage) sendMessage('Error creating task: "name" is required.');
    return true;
  }

  Logger.info('assistant', '[Create_Task] Creating task:', rawInput.name);

  store
    .dispatch(addTaskAsync(rawInput) as any)
    .unwrap()
    .then((task: any) => {
      Logger.info('assistant', '[Create_Task] Task created successfully:', task?.id);
      if (sendMessage) sendMessage(`Task "${rawInput.name}" created successfully.`);
    })
    .catch((error: any) => {
      Logger.error('assistant', '[Create_Task] Failed:', error);
      if (sendMessage) {
        const errMsg = error?.message || error?.response?.data?.message || 'Unknown error';
        sendMessage(`Failed to create task: ${errMsg}`);
      }
    });

  return true;
}

export async function handleCreateTaskPrompt(
  data: { tool?: string; data?: Record<string, any> },
  send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
  navigate?: (path: string) => void,
): Promise<boolean> {
  const rawInput = data?.data;

  if (!rawInput?.name || typeof rawInput.name !== 'string' || rawInput.name.trim() === '') {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing required field: name' }),
    });
    return true;
  }

  // Validate other required fields
  for (const field of ['category_id', 'team_id', 'status_id', 'priority_id']) {
    if (rawInput[field] == null) {
      send({
        type: 'frontend_tool_response',
        tool: data?.tool,
        response: JSON.stringify({ ok: false, error: `Missing required field: ${field}` }),
      });
      return true;
    }
  }

  Logger.info('assistant', '[Create_Task] Raw input from agent:', JSON.stringify(rawInput));

  try {
    const created = await store.dispatch(addTaskAsync(rawInput) as any).unwrap();
    Logger.info('assistant', '[Create_Task] Task created successfully via prompt pathway:', created?.id);

    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({
        ok: true,
        task: {
          id: created?.id,
          name: rawInput.name,
          category_id: rawInput.category_id,
          team_id: rawInput.team_id,
          status_id: rawInput.status_id,
          priority_id: rawInput.priority_id,
        },
      }),
    });
  } catch (error: any) {
    const errMsg = error?.response?.data?.message || error?.message || 'Unknown error';
    Logger.error('assistant', '[Create_Task] Failed:', errMsg);
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: errMsg }),
    });
  }

  return true;
}

// ─── UPDATE TASK ─────────────────────────────────────────────────────────────

export function handleUpdateTask(
  result: FrontendToolResult,
  sendMessage?: SendMessageCallback,
  navigate?: NavigateCallback,
): boolean {
  if (result.action && result.action !== 'update_task') return false;

  const rawInput = result.data ?? result;
  const id = normalizeId(rawInput, 'id', 'task_id', 'taskId');

  if (!id) {
    Logger.error('assistant', '[Update_Task] Missing required field: id');
    if (sendMessage) sendMessage('Error updating task: "id" is required.');
    return true;
  }

  const { id: _id, task_id: _tid, taskId: _tId, ...updates } = rawInput;
  Logger.info('assistant', '[Update_Task] Updating task:', { id, updates });

  store
    .dispatch(updateTaskAsync({ id, updates }) as any)
    .unwrap()
    .then((task: any) => {
      Logger.info('assistant', '[Update_Task] Task updated successfully');
      if (sendMessage) sendMessage(`Task #${id} updated successfully.`);
    })
    .catch((error: any) => {
      Logger.error('assistant', '[Update_Task] Failed:', error);
      if (sendMessage) {
        const errMsg = error?.message || error?.response?.data?.message || 'Unknown error';
        sendMessage(`Failed to update task: ${errMsg}`);
      }
    });

  return true;
}

export async function handleUpdateTaskPrompt(
  data: { tool?: string; data?: Record<string, any> },
  send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
  navigate?: (path: string) => void,
): Promise<boolean> {
  const rawInput = data?.data;

  if (!rawInput?.id) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing required field: id' }),
    });
    return true;
  }

  const id = normalizeId(rawInput, 'id', 'task_id', 'taskId');
  if (!id) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'id must be a valid number' }),
    });
    return true;
  }

  // Extract updates (everything except the id fields)
  const { id: _id, task_id: _tid, taskId: _tId, ...updates } = rawInput;

  Logger.info('assistant', '[Update_Task] Raw input from agent:', JSON.stringify(rawInput));
  Logger.info('assistant', '[Update_Task] Resolved updates:', JSON.stringify(updates));

  try {
    const updated = await store.dispatch(updateTaskAsync({ id, updates }) as any).unwrap();
    Logger.info('assistant', '[Update_Task] Task updated successfully via prompt pathway');

    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({
        ok: true,
        task: {
          id: updated?.id ?? id,
          name: updated?.name,
          status_id: updated?.status_id,
          priority_id: updated?.priority_id,
        },
      }),
    });
  } catch (error: any) {
    const errMsg = error?.response?.data?.message || error?.message || 'Unknown error';
    Logger.error('assistant', '[Update_Task] Failed:', errMsg);
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: errMsg }),
    });
  }

  return true;
}

// ─── DELETE TASK ─────────────────────────────────────────────────────────────

export function handleDeleteTask(
  result: FrontendToolResult,
  sendMessage?: SendMessageCallback,
  navigate?: NavigateCallback,
): boolean {
  if (result.action && result.action !== 'delete_task') return false;

  const rawInput = result.data ?? result;
  const id = normalizeId(rawInput, 'id', 'task_id', 'taskId');

  if (!id) {
    Logger.error('assistant', '[Delete_Task] Missing required field: id');
    if (sendMessage) sendMessage('Error deleting task: "id" is required.');
    return true;
  }

  Logger.info('assistant', `[Delete_Task] Deleting task #${id}`);

  store
    .dispatch(removeTaskAsync(id) as any)
    .unwrap()
    .then(() => {
      Logger.info('assistant', '[Delete_Task] Task deleted successfully');
      if (sendMessage) sendMessage(`Task #${id} deleted successfully.`);
    })
    .catch((error: any) => {
      Logger.error('assistant', '[Delete_Task] Failed:', error);
      if (sendMessage) {
        const errMsg = error?.message || error?.response?.data?.message || 'Unknown error';
        sendMessage(`Failed to delete task: ${errMsg}`);
      }
    });

  return true;
}

export async function handleDeleteTaskPrompt(
  data: { tool?: string; data?: Record<string, any> },
  send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
  navigate?: (path: string) => void,
): Promise<boolean> {
  const rawInput = data?.data;

  if (!rawInput) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing data payload' }),
    });
    return true;
  }

  const id = normalizeId(rawInput, 'id', 'task_id', 'taskId');

  if (!id) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing required field: id (must be a number)' }),
    });
    return true;
  }

  Logger.info('assistant', `[Delete_Task] Deleting task #${id}`);

  try {
    await store.dispatch(removeTaskAsync(id) as any).unwrap();
    Logger.info('assistant', '[Delete_Task] Task deleted successfully via prompt pathway');

    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: true, deleted: { id } }),
    });
  } catch (error: any) {
    const errMsg = error?.response?.data?.message || error?.message || 'Unknown error';
    Logger.error('assistant', '[Delete_Task] Failed:', errMsg);
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: errMsg }),
    });
  }

  return true;
}

// ─── CHANGE TASK STATUS ──────────────────────────────────────────────────────

export function handleChangeTaskStatus(
  result: FrontendToolResult,
  sendMessage?: SendMessageCallback,
  navigate?: NavigateCallback,
): boolean {
  if (result.action && result.action !== 'change_task_status') return false;

  const rawInput = result.data ?? result;
  const taskId = normalizeId(rawInput, 'id', 'task_id', 'taskId');
  const newStatusId = normalizeId(rawInput, 'status_id', 'statusId', 'new_status_id');

  if (!taskId || !newStatusId) {
    Logger.error('assistant', '[Change_Task_Status] Missing required fields: id and status_id');
    if (sendMessage) sendMessage('Error changing task status: "id" and "status_id" are required.');
    return true;
  }

  // Read previous status from the Redux store
  const state = store.getState() as any;
  const tasks = state.tasks?.value ?? [];
  const existingTask = tasks.find((t: any) => t.id === taskId);
  const previousStatusId = existingTask?.status_id ?? 0;

  Logger.info('assistant', `[Change_Task_Status] Moving task #${taskId} from status ${previousStatusId} to ${newStatusId}`);

  store
    .dispatch(moveTaskThunk({ taskId, newStatusId, previousStatusId }) as any)
    .unwrap()
    .then((task: any) => {
      Logger.info('assistant', '[Change_Task_Status] Status changed successfully');
      if (sendMessage) sendMessage(`Task #${taskId} status changed to ${newStatusId}.`);
    })
    .catch((error: any) => {
      Logger.error('assistant', '[Change_Task_Status] Failed:', error);
      if (sendMessage) {
        const errMsg = error?.message || error?.response?.data?.message || 'Unknown error';
        sendMessage(`Failed to change task status: ${errMsg}`);
      }
    });

  return true;
}

export async function handleChangeTaskStatusPrompt(
  data: { tool?: string; data?: Record<string, any> },
  send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
  navigate?: (path: string) => void,
): Promise<boolean> {
  const rawInput = data?.data;

  if (!rawInput) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing data payload' }),
    });
    return true;
  }

  const taskId = normalizeId(rawInput, 'id', 'task_id', 'taskId');
  const newStatusId = normalizeId(rawInput, 'status_id', 'statusId', 'new_status_id');

  if (!taskId) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing required field: id' }),
    });
    return true;
  }

  if (!newStatusId) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing required field: status_id' }),
    });
    return true;
  }

  // Read previous status from the Redux store
  const state = store.getState() as any;
  const tasks = state.tasks?.value ?? [];
  const existingTask = tasks.find((t: any) => t.id === taskId);
  const previousStatusId = existingTask?.status_id ?? 0;

  Logger.info('assistant', `[Change_Task_Status] Moving task #${taskId} from status ${previousStatusId} to ${newStatusId}`);

  try {
    const updated = await store.dispatch(moveTaskThunk({ taskId, newStatusId, previousStatusId }) as any).unwrap();
    Logger.info('assistant', '[Change_Task_Status] Status changed successfully via prompt pathway');

    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({
        ok: true,
        task: {
          id: updated?.id ?? taskId,
          status_id: newStatusId,
          previous_status_id: previousStatusId,
        },
      }),
    });
  } catch (error: any) {
    const errMsg = error?.response?.data?.message || error?.message || 'Unknown error';
    Logger.error('assistant', '[Change_Task_Status] Failed:', errMsg);
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: errMsg }),
    });
  }

  return true;
}

// ─── ADD TASK TAG ────────────────────────────────────────────────────────────

export function handleAddTaskTag(
  result: FrontendToolResult,
  sendMessage?: SendMessageCallback,
  navigate?: NavigateCallback,
): boolean {
  if (result.action && result.action !== 'add_task_tag') return false;

  const rawInput = result.data ?? result;
  const taskId = normalizeId(rawInput, 'task_id', 'taskId');
  const tagId = normalizeId(rawInput, 'tag_id', 'tagId');

  if (!taskId || !tagId) {
    Logger.error('assistant', '[Add_Task_Tag] Missing required fields: task_id and tag_id');
    if (sendMessage) sendMessage('Error adding tag: "task_id" and "tag_id" are required.');
    return true;
  }

  Logger.info('assistant', `[Add_Task_Tag] Adding tag #${tagId} to task #${taskId}`);

  store
    .dispatch(genericActions.taskTags.addAsync({ task_id: taskId, tag_id: tagId }) as any)
    .unwrap()
    .then((created: any) => {
      Logger.info('assistant', '[Add_Task_Tag] Tag added successfully');
      if (sendMessage) sendMessage(`Tag #${tagId} added to task #${taskId}.`);
    })
    .catch((error: any) => {
      Logger.error('assistant', '[Add_Task_Tag] Failed:', error);
      if (sendMessage) {
        const errMsg = error?.message || error?.response?.data?.message || 'Unknown error';
        sendMessage(`Failed to add tag: ${errMsg}`);
      }
    });

  return true;
}

export async function handleAddTaskTagPrompt(
  data: { tool?: string; data?: Record<string, any> },
  send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
  navigate?: (path: string) => void,
): Promise<boolean> {
  const rawInput = data?.data;

  if (!rawInput) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing data payload' }),
    });
    return true;
  }

  const taskId = normalizeId(rawInput, 'task_id', 'taskId');
  const tagId = normalizeId(rawInput, 'tag_id', 'tagId');

  if (!taskId) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing required field: task_id' }),
    });
    return true;
  }

  if (!tagId) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing required field: tag_id' }),
    });
    return true;
  }

  Logger.info('assistant', `[Add_Task_Tag] Adding tag #${tagId} to task #${taskId}`);

  try {
    const created = await store.dispatch(genericActions.taskTags.addAsync({ task_id: taskId, tag_id: tagId }) as any).unwrap();
    Logger.info('assistant', '[Add_Task_Tag] Tag added successfully via prompt pathway');

    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({
        ok: true,
        taskTag: {
          id: created?.id,
          task_id: taskId,
          tag_id: tagId,
        },
      }),
    });
  } catch (error: any) {
    const errMsg = error?.response?.data?.message || error?.message || 'Unknown error';
    Logger.error('assistant', '[Add_Task_Tag] Failed:', errMsg);
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: errMsg }),
    });
  }

  return true;
}

// ─── REMOVE TASK TAG ─────────────────────────────────────────────────────────

export function handleRemoveTaskTag(
  result: FrontendToolResult,
  sendMessage?: SendMessageCallback,
  navigate?: NavigateCallback,
): boolean {
  if (result.action && result.action !== 'remove_task_tag') return false;

  const rawInput = result.data ?? result;
  const id = normalizeId(rawInput, 'id', 'task_tag_id', 'taskTagId');

  if (!id) {
    Logger.error('assistant', '[Remove_Task_Tag] Missing required field: id');
    if (sendMessage) sendMessage('Error removing tag: "id" (task_tag record ID) is required.');
    return true;
  }

  Logger.info('assistant', `[Remove_Task_Tag] Removing task-tag #${id}`);

  store
    .dispatch(genericActions.taskTags.removeAsync(id) as any)
    .unwrap()
    .then(() => {
      Logger.info('assistant', '[Remove_Task_Tag] Tag removed successfully');
      if (sendMessage) sendMessage(`Task-tag #${id} removed successfully.`);
    })
    .catch((error: any) => {
      Logger.error('assistant', '[Remove_Task_Tag] Failed:', error);
      if (sendMessage) {
        const errMsg = error?.message || error?.response?.data?.message || 'Unknown error';
        sendMessage(`Failed to remove tag: ${errMsg}`);
      }
    });

  return true;
}

export async function handleRemoveTaskTagPrompt(
  data: { tool?: string; data?: Record<string, any> },
  send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
  navigate?: (path: string) => void,
): Promise<boolean> {
  const rawInput = data?.data;

  if (!rawInput) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing data payload' }),
    });
    return true;
  }

  const id = normalizeId(rawInput, 'id', 'task_tag_id', 'taskTagId');

  if (!id) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing required field: id (task_tag record ID)' }),
    });
    return true;
  }

  Logger.info('assistant', `[Remove_Task_Tag] Removing task-tag #${id}`);

  try {
    await store.dispatch(genericActions.taskTags.removeAsync(id) as any).unwrap();
    Logger.info('assistant', '[Remove_Task_Tag] Tag removed successfully via prompt pathway');

    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: true, deleted: { id } }),
    });
  } catch (error: any) {
    const errMsg = error?.response?.data?.message || error?.message || 'Unknown error';
    Logger.error('assistant', '[Remove_Task_Tag] Failed:', errMsg);
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: errMsg }),
    });
  }

  return true;
}

// ─── ADD TASK NOTE ───────────────────────────────────────────────────────────

export function handleAddTaskNote(
  result: FrontendToolResult,
  sendMessage?: SendMessageCallback,
  navigate?: NavigateCallback,
): boolean {
  if (result.action && result.action !== 'add_task_note') return false;

  const rawInput = result.data ?? result;
  const taskId = normalizeId(rawInput, 'task_id', 'taskId');
  const content = rawInput.content ?? rawInput.note ?? rawInput.text;

  if (!taskId || !content) {
    Logger.error('assistant', '[Add_Task_Note] Missing required fields: task_id and content');
    if (sendMessage) sendMessage('Error adding note: "task_id" and "content" are required.');
    return true;
  }

  Logger.info('assistant', `[Add_Task_Note] Adding note to task #${taskId}`);

  store
    .dispatch(genericActions.taskNotes.addAsync({ task_id: taskId, note: content }) as any)
    .unwrap()
    .then((created: any) => {
      Logger.info('assistant', '[Add_Task_Note] Note added successfully');
      if (sendMessage) sendMessage(`Note added to task #${taskId}.`);
    })
    .catch((error: any) => {
      Logger.error('assistant', '[Add_Task_Note] Failed:', error);
      if (sendMessage) {
        const errMsg = error?.message || error?.response?.data?.message || 'Unknown error';
        sendMessage(`Failed to add note: ${errMsg}`);
      }
    });

  return true;
}

export async function handleAddTaskNotePrompt(
  data: { tool?: string; data?: Record<string, any> },
  send: (payload: { type: 'frontend_tool_response'; tool?: string; response: string }) => void,
  navigate?: (path: string) => void,
): Promise<boolean> {
  const rawInput = data?.data;

  if (!rawInput) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing data payload' }),
    });
    return true;
  }

  const taskId = normalizeId(rawInput, 'task_id', 'taskId');
  const content = rawInput.content ?? rawInput.note ?? rawInput.text;

  if (!taskId) {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing required field: task_id' }),
    });
    return true;
  }

  if (!content || typeof content !== 'string' || content.trim() === '') {
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: 'Missing required field: content' }),
    });
    return true;
  }

  Logger.info('assistant', `[Add_Task_Note] Adding note to task #${taskId}`);

  try {
    const created = await store.dispatch(genericActions.taskNotes.addAsync({ task_id: taskId, note: content.trim() }) as any).unwrap();
    Logger.info('assistant', '[Add_Task_Note] Note added successfully via prompt pathway');

    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({
        ok: true,
        note: {
          id: created?.id,
          task_id: taskId,
          content: content.trim(),
        },
      }),
    });
  } catch (error: any) {
    const errMsg = error?.response?.data?.message || error?.message || 'Unknown error';
    Logger.error('assistant', '[Add_Task_Note] Failed:', errMsg);
    send({
      type: 'frontend_tool_response',
      tool: data?.tool,
      response: JSON.stringify({ ok: false, error: errMsg }),
    });
  }

  return true;
}
