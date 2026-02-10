import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createGenericCrudHandlers,
  GENERIC_ACTION_MAP,
  categoryActions,
  statusActions,
  teamActions,
  broadcastActions,
  spotTypeActions,
  pluginActions,
  type GenericCrudHandlers,
} from '../genericCrudActions';
import { store } from '@/store/store';
import { genericActions } from '@/store/genericSlices';
import { Logger } from '@/utils/logger';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse the JSON response from a prompt-pathway send call */
function parseSendResponse(send: ReturnType<typeof vi.fn>, callIndex = 0) {
  return JSON.parse(send.mock.calls[callIndex][0].response);
}

/** Build a default config for a test entity */
function testConfig(overrides: Partial<Parameters<typeof createGenericCrudHandlers>[0]> = {}) {
  return {
    sliceName: 'testEntities',
    label: 'test entity',
    requiredFields: ['name'],
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Reset default dispatch mock (resolves with { id: 1 })
  vi.mocked(store.dispatch).mockReturnValue({
    unwrap: () => Promise.resolve({ id: 1 }),
  } as any);
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. Factory function
// ═════════════════════════════════════════════════════════════════════════════

describe('createGenericCrudHandlers (factory)', () => {
  it('returns an object with all 8 handler methods', () => {
    const handlers = createGenericCrudHandlers(testConfig());

    const expectedKeys: (keyof GenericCrudHandlers)[] = [
      'handleCreate',
      'handleCreatePrompt',
      'handleUpdate',
      'handleUpdatePrompt',
      'handleDelete',
      'handleDeletePrompt',
      'handleList',
      'handleListPrompt',
    ];

    for (const key of expectedKeys) {
      expect(handlers[key]).toBeTypeOf('function');
    }
    expect(Object.keys(handlers)).toHaveLength(8);
  });

  it('converts camelCase sliceName to snake_case for action matching', () => {
    const handlers = createGenericCrudHandlers({
      sliceName: 'spotTypes',
      label: 'spot type',
    });

    // Should match `create_spot_types`, NOT `create_spotTypes`
    const result = handlers.handleCreate(
      { action: 'create_spot_types', data: { name: 'Test' } },
      vi.fn(),
    );
    expect(result).toBe(true);

    // camelCase version should NOT match
    const resultCamel = handlers.handleCreate(
      { action: 'create_spotTypes', data: { name: 'Test' } },
      vi.fn(),
    );
    expect(resultCamel).toBe(false);
  });

  it('defaults requiredFields to empty array when omitted', () => {
    const handlers = createGenericCrudHandlers({
      sliceName: 'plugins',
      label: 'plugin',
      // no requiredFields
    });

    // Should succeed without any fields
    const send = vi.fn();
    handlers.handleCreate({ action: 'create_plugins', data: {} }, send);
    expect(store.dispatch).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. handleCreate (tool_result pathway)
// ═════════════════════════════════════════════════════════════════════════════

describe('handleCreate (tool_result pathway)', () => {
  let handlers: GenericCrudHandlers;
  const sendMessage = vi.fn();

  beforeEach(() => {
    handlers = createGenericCrudHandlers(testConfig());
  });

  it('returns true when action matches', () => {
    const result = handlers.handleCreate(
      { action: 'create_test_entities', data: { name: 'Test' } },
      sendMessage,
    );
    expect(result).toBe(true);
  });

  it('returns false when action does not match', () => {
    const result = handlers.handleCreate(
      { action: 'create_other_thing', data: { name: 'Test' } },
      sendMessage,
    );
    expect(result).toBe(false);
  });

  it('validates required fields — returns true but sends error message', () => {
    const result = handlers.handleCreate(
      { action: 'create_test_entities', data: { description: 'no name' } },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('"name" is required'),
    );
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('validates required fields — treats empty string as missing', () => {
    const result = handlers.handleCreate(
      { action: 'create_test_entities', data: { name: '' } },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('"name" is required'),
    );
  });

  it('dispatches addAsync with rawInput on valid data', () => {
    const data = { name: 'Widget' };
    handlers.handleCreate(
      { action: 'create_test_entities', data },
      sendMessage,
    );

    const actions = (genericActions as any).testEntities;
    expect(actions.addAsync).toHaveBeenCalledWith(data);
    expect(store.dispatch).toHaveBeenCalled();
  });

  it('calls sendMessage on successful dispatch', async () => {
    handlers.handleCreate(
      { action: 'create_test_entities', data: { name: 'Widget' } },
      sendMessage,
    );

    // Let the .then() resolve
    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith('test entity created successfully.');
    });
  });

  it('calls sendMessage with error on dispatch failure', async () => {
    vi.mocked(store.dispatch).mockReturnValueOnce({
      unwrap: () => Promise.reject(new Error('API Error')),
    } as any);

    handlers.handleCreate(
      { action: 'create_test_entities', data: { name: 'Widget' } },
      sendMessage,
    );

    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create test entity'),
      );
    });
  });

  it('falls back to result itself when data property is missing', () => {
    const result = { action: 'create_test_entities', name: 'Inline' } as any;
    handlers.handleCreate(result, sendMessage);

    const actions = (genericActions as any).testEntities;
    expect(actions.addAsync).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Inline' }),
    );
  });

  it('calls navigate when navigateTo is configured', async () => {
    const handlersWithNav = createGenericCrudHandlers(
      testConfig({ navigateTo: '/settings/test' }),
    );
    const navigate = vi.fn();

    handlersWithNav.handleCreate(
      { action: 'create_test_entities', data: { name: 'Nav' } },
      sendMessage,
      navigate,
    );

    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/settings/test');
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. handleCreatePrompt (prompt pathway)
// ═════════════════════════════════════════════════════════════════════════════

describe('handleCreatePrompt (prompt pathway)', () => {
  let handlers: GenericCrudHandlers;
  const send = vi.fn();

  beforeEach(() => {
    handlers = createGenericCrudHandlers(testConfig());
  });

  it('sends { ok: false, error } when required field is missing', async () => {
    await handlers.handleCreatePrompt(
      { tool: 'create_test_entities', data: { description: 'no name' } },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(false);
    expect(response.error).toContain('name');
  });

  it('sends { ok: false, error } when data is undefined', async () => {
    await handlers.handleCreatePrompt(
      { tool: 'create_test_entities' },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(false);
    expect(response.error).toContain('name');
  });

  it('dispatches addAsync and sends { ok: true, item } on success', async () => {
    vi.mocked(store.dispatch).mockReturnValueOnce({
      unwrap: () => Promise.resolve({ id: 42, name: 'Created' }),
    } as any);

    await handlers.handleCreatePrompt(
      { tool: 'create_test_entities', data: { name: 'Created' } },
      send,
    );

    const actions = (genericActions as any).testEntities;
    expect(actions.addAsync).toHaveBeenCalledWith({ name: 'Created' });

    const response = parseSendResponse(send);
    expect(response.ok).toBe(true);
    expect(response.item).toEqual({ id: 42, name: 'Created' });
  });

  it('falls back to rawInput when dispatch returns null', async () => {
    vi.mocked(store.dispatch).mockReturnValueOnce({
      unwrap: () => Promise.resolve(null),
    } as any);

    await handlers.handleCreatePrompt(
      { tool: 'create_test_entities', data: { name: 'Fallback' } },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(true);
    expect(response.item).toEqual({ name: 'Fallback' });
  });

  it('sends { ok: false, error } when dispatch rejects', async () => {
    vi.mocked(store.dispatch).mockReturnValueOnce({
      unwrap: () => Promise.reject(new Error('Server Error')),
    } as any);

    await handlers.handleCreatePrompt(
      { tool: 'create_test_entities', data: { name: 'Fail' } },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(false);
    expect(response.error).toBe('Server Error');
  });

  it('extracts error from response.data.message shape', async () => {
    vi.mocked(store.dispatch).mockReturnValueOnce({
      unwrap: () =>
        Promise.reject({ response: { data: { message: 'Duplicate name' } } }),
    } as any);

    await handlers.handleCreatePrompt(
      { tool: 'create_test_entities', data: { name: 'Dup' } },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(false);
    expect(response.error).toBe('Duplicate name');
  });

  it('includes the tool name in the send payload', async () => {
    await handlers.handleCreatePrompt(
      { tool: 'create_test_entities', data: { name: 'X' } },
      send,
    );

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'frontend_tool_response',
        tool: 'create_test_entities',
      }),
    );
  });

  it('calls navigate when navigateTo is configured', async () => {
    const handlersWithNav = createGenericCrudHandlers(
      testConfig({ navigateTo: '/settings/test' }),
    );
    const navigate = vi.fn();

    await handlersWithNav.handleCreatePrompt(
      { tool: 'create_test_entities', data: { name: 'Nav' } },
      send,
      navigate,
    );

    expect(navigate).toHaveBeenCalledWith('/settings/test');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. handleUpdate (tool_result pathway)
// ═════════════════════════════════════════════════════════════════════════════

describe('handleUpdate (tool_result pathway)', () => {
  let handlers: GenericCrudHandlers;
  const sendMessage = vi.fn();

  beforeEach(() => {
    handlers = createGenericCrudHandlers(testConfig());
  });

  it('returns false when action does not match', () => {
    expect(
      handlers.handleUpdate({ action: 'update_other', data: { id: 1 } }, sendMessage),
    ).toBe(false);
  });

  it('returns true and sends error when id is missing', () => {
    const result = handlers.handleUpdate(
      { action: 'update_test_entities', data: { name: 'No ID' } },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('"id" is required'),
    );
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('dispatches updateAsync with { id, updates } on valid data', () => {
    handlers.handleUpdate(
      { action: 'update_test_entities', data: { id: 5, name: 'Updated' } },
      sendMessage,
    );

    const actions = (genericActions as any).testEntities;
    expect(actions.updateAsync).toHaveBeenCalledWith({
      id: 5,
      updates: { name: 'Updated' },
    });
  });

  it('normalizes string id to number', () => {
    handlers.handleUpdate(
      { action: 'update_test_entities', data: { id: '10', name: 'Updated' } },
      sendMessage,
    );

    const actions = (genericActions as any).testEntities;
    expect(actions.updateAsync).toHaveBeenCalledWith({
      id: 10,
      updates: { name: 'Updated' },
    });
  });

  it('calls sendMessage on successful dispatch', async () => {
    handlers.handleUpdate(
      { action: 'update_test_entities', data: { id: 5, name: 'Updated' } },
      sendMessage,
    );

    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith('test entity #5 updated successfully.');
    });
  });

  it('calls sendMessage with error on dispatch failure', async () => {
    vi.mocked(store.dispatch).mockReturnValueOnce({
      unwrap: () => Promise.reject(new Error('Update Failed')),
    } as any);

    handlers.handleUpdate(
      { action: 'update_test_entities', data: { id: 5, name: 'Fail' } },
      sendMessage,
    );

    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update test entity'),
      );
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4b. handleUpdatePrompt (prompt pathway)
// ═════════════════════════════════════════════════════════════════════════════

describe('handleUpdatePrompt (prompt pathway)', () => {
  let handlers: GenericCrudHandlers;
  const send = vi.fn();

  beforeEach(() => {
    handlers = createGenericCrudHandlers(testConfig());
  });

  it('sends error when id is missing', async () => {
    await handlers.handleUpdatePrompt(
      { tool: 'update_test_entities', data: { name: 'No ID' } },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(false);
    expect(response.error).toContain('id');
  });

  it('sends error when id is not a valid number', async () => {
    await handlers.handleUpdatePrompt(
      { tool: 'update_test_entities', data: { id: 'abc' } },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(false);
    expect(response.error).toContain('valid number');
  });

  it('dispatches updateAsync and sends { ok: true, item } on success', async () => {
    vi.mocked(store.dispatch).mockReturnValueOnce({
      unwrap: () => Promise.resolve({ id: 5, name: 'Updated' }),
    } as any);

    await handlers.handleUpdatePrompt(
      { tool: 'update_test_entities', data: { id: 5, name: 'Updated' } },
      send,
    );

    const actions = (genericActions as any).testEntities;
    expect(actions.updateAsync).toHaveBeenCalledWith({
      id: 5,
      updates: { name: 'Updated' },
    });

    const response = parseSendResponse(send);
    expect(response.ok).toBe(true);
    expect(response.item).toEqual({ id: 5, name: 'Updated' });
  });

  it('falls back to { id, ...updates } when dispatch returns null', async () => {
    vi.mocked(store.dispatch).mockReturnValueOnce({
      unwrap: () => Promise.resolve(null),
    } as any);

    await handlers.handleUpdatePrompt(
      { tool: 'update_test_entities', data: { id: 3, color: 'blue' } },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(true);
    expect(response.item).toEqual({ id: 3, color: 'blue' });
  });

  it('sends { ok: false, error } when dispatch rejects', async () => {
    vi.mocked(store.dispatch).mockReturnValueOnce({
      unwrap: () => Promise.reject(new Error('Update rejected')),
    } as any);

    await handlers.handleUpdatePrompt(
      { tool: 'update_test_entities', data: { id: 5, name: 'Fail' } },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(false);
    expect(response.error).toBe('Update rejected');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. handleDelete (tool_result pathway)
// ═════════════════════════════════════════════════════════════════════════════

describe('handleDelete (tool_result pathway)', () => {
  let handlers: GenericCrudHandlers;
  const sendMessage = vi.fn();

  beforeEach(() => {
    handlers = createGenericCrudHandlers(testConfig());
  });

  it('returns false when action does not match', () => {
    expect(
      handlers.handleDelete({ action: 'delete_other', data: { id: 1 } }, sendMessage),
    ).toBe(false);
  });

  it('returns true and sends error when id is missing', () => {
    const result = handlers.handleDelete(
      { action: 'delete_test_entities', data: {} },
      sendMessage,
    );
    expect(result).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('"id" is required'),
    );
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('dispatches removeAsync with id', () => {
    handlers.handleDelete(
      { action: 'delete_test_entities', data: { id: 7 } },
      sendMessage,
    );

    const actions = (genericActions as any).testEntities;
    expect(actions.removeAsync).toHaveBeenCalledWith(7);
  });

  it('calls sendMessage on successful dispatch', async () => {
    handlers.handleDelete(
      { action: 'delete_test_entities', data: { id: 7 } },
      sendMessage,
    );

    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith('test entity #7 deleted successfully.');
    });
  });

  it('calls sendMessage with error on dispatch failure', async () => {
    vi.mocked(store.dispatch).mockReturnValueOnce({
      unwrap: () => Promise.reject(new Error('Delete Failed')),
    } as any);

    handlers.handleDelete(
      { action: 'delete_test_entities', data: { id: 7 } },
      sendMessage,
    );

    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete test entity'),
      );
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5b. handleDeletePrompt (prompt pathway)
// ═════════════════════════════════════════════════════════════════════════════

describe('handleDeletePrompt (prompt pathway)', () => {
  let handlers: GenericCrudHandlers;
  const send = vi.fn();

  beforeEach(() => {
    handlers = createGenericCrudHandlers(testConfig());
  });

  it('sends error when data payload is missing', async () => {
    await handlers.handleDeletePrompt({ tool: 'delete_test_entities' }, send);

    const response = parseSendResponse(send);
    expect(response.ok).toBe(false);
    expect(response.error).toContain('Missing data payload');
  });

  it('sends error when id is missing', async () => {
    await handlers.handleDeletePrompt(
      { tool: 'delete_test_entities', data: {} },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(false);
    expect(response.error).toContain('id');
  });

  it('sends error when id is not a valid number', async () => {
    await handlers.handleDeletePrompt(
      { tool: 'delete_test_entities', data: { id: 'xyz' } },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(false);
    expect(response.error).toContain('id');
  });

  it('dispatches removeAsync and sends { ok: true, deleted } on success', async () => {
    await handlers.handleDeletePrompt(
      { tool: 'delete_test_entities', data: { id: 9 } },
      send,
    );

    const actions = (genericActions as any).testEntities;
    expect(actions.removeAsync).toHaveBeenCalledWith(9);

    const response = parseSendResponse(send);
    expect(response.ok).toBe(true);
    expect(response.deleted).toEqual({ id: 9 });
  });

  it('sends { ok: false, error } when dispatch rejects', async () => {
    vi.mocked(store.dispatch).mockReturnValueOnce({
      unwrap: () => Promise.reject(new Error('Cannot delete')),
    } as any);

    await handlers.handleDeletePrompt(
      { tool: 'delete_test_entities', data: { id: 9 } },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(false);
    expect(response.error).toBe('Cannot delete');
  });

  it('calls navigate on success when navigateTo is configured', async () => {
    const handlersWithNav = createGenericCrudHandlers(
      testConfig({ navigateTo: '/settings/test' }),
    );
    const navigate = vi.fn();

    await handlersWithNav.handleDeletePrompt(
      { tool: 'delete_test_entities', data: { id: 3 } },
      send,
      navigate,
    );

    expect(navigate).toHaveBeenCalledWith('/settings/test');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. handleList (tool_result pathway)
// ═════════════════════════════════════════════════════════════════════════════

describe('handleList (tool_result pathway)', () => {
  let handlers: GenericCrudHandlers;
  const sendMessage = vi.fn();

  beforeEach(() => {
    handlers = createGenericCrudHandlers(testConfig());
  });

  it('returns false when action does not match', () => {
    expect(
      handlers.handleList({ action: 'list_other' }, sendMessage),
    ).toBe(false);
  });

  it('reads items from store state and sends count message', () => {
    vi.mocked(store.getState).mockReturnValueOnce({
      testEntities: {
        value: [
          { id: 1, name: 'A' },
          { id: 2, name: 'B' },
        ],
      },
    } as any);

    const result = handlers.handleList(
      { action: 'list_test_entities' },
      sendMessage,
    );

    expect(result).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith('Found 2 test entity(s).');
  });

  it('returns empty array when slice is missing from state', () => {
    vi.mocked(store.getState).mockReturnValueOnce({} as any);

    const result = handlers.handleList(
      { action: 'list_test_entities' },
      sendMessage,
    );

    expect(result).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith('Found 0 test entity(s).');
  });

  it('filters items by workspace_id when provided', () => {
    vi.mocked(store.getState).mockReturnValueOnce({
      testEntities: {
        value: [
          { id: 1, name: 'A', workspace_id: 10 },
          { id: 2, name: 'B', workspace_id: 20 },
          { id: 3, name: 'C', workspace_id: null },
        ],
      },
    } as any);

    const result = handlers.handleList(
      { action: 'list_test_entities', data: { workspace_id: 10 } },
      sendMessage,
    );

    expect(result).toBe(true);
    // workspace_id 10 matches item 1, and null matches item 3
    expect(sendMessage).toHaveBeenCalledWith('Found 2 test entity(s).');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6b. handleListPrompt (prompt pathway)
// ═════════════════════════════════════════════════════════════════════════════

describe('handleListPrompt (prompt pathway)', () => {
  let handlers: GenericCrudHandlers;
  const send = vi.fn();

  beforeEach(() => {
    handlers = createGenericCrudHandlers(testConfig());
  });

  it('returns all items from store state', async () => {
    const items = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ];
    vi.mocked(store.getState).mockReturnValueOnce({
      testEntities: { value: items },
    } as any);

    await handlers.handleListPrompt(
      { tool: 'list_test_entities', data: {} },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(true);
    expect(response.items).toEqual(items);
    expect(response.count).toBe(2);
  });

  it('filters by workspace_id when provided', async () => {
    vi.mocked(store.getState).mockReturnValueOnce({
      testEntities: {
        value: [
          { id: 1, name: 'A', workspace_id: 10 },
          { id: 2, name: 'B', workspace_id: 20 },
          { id: 3, name: 'C', workspace_id: null },
        ],
      },
    } as any);

    await handlers.handleListPrompt(
      { tool: 'list_test_entities', data: { workspace_id: 10 } },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(true);
    expect(response.items).toHaveLength(2);
    expect(response.items.map((i: any) => i.id)).toEqual([1, 3]);
  });

  it('handles missing data gracefully (defaults to empty object)', async () => {
    vi.mocked(store.getState).mockReturnValueOnce({
      testEntities: { value: [{ id: 1 }] },
    } as any);

    await handlers.handleListPrompt({ tool: 'list_test_entities' }, send);

    const response = parseSendResponse(send);
    expect(response.ok).toBe(true);
    expect(response.count).toBe(1);
  });

  it('returns empty items when slice value is missing', async () => {
    vi.mocked(store.getState).mockReturnValueOnce({} as any);

    await handlers.handleListPrompt(
      { tool: 'list_test_entities', data: {} },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(true);
    expect(response.items).toEqual([]);
    expect(response.count).toBe(0);
  });

  it('accepts workspaceId (camelCase) as alternate key', async () => {
    vi.mocked(store.getState).mockReturnValueOnce({
      testEntities: {
        value: [
          { id: 1, workspace_id: 5 },
          { id: 2, workspace_id: 10 },
        ],
      },
    } as any);

    await handlers.handleListPrompt(
      { tool: 'list_test_entities', data: { workspaceId: 5 } },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.items).toHaveLength(1);
    expect(response.items[0].id).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. Entity registrations & GENERIC_ACTION_MAP
// ═════════════════════════════════════════════════════════════════════════════

describe('GENERIC_ACTION_MAP', () => {
  it('contains expected entity keys (spot-check)', () => {
    const expectedKeys = [
      'categories',
      'statuses',
      'teams',
      'broadcasts',
      'spot_types',
      'custom_fields',
      'slas',
      'sla_policies',
      'boards',
      'plugins',
      'workflows',
      'documents',
      'working_schedules',
      'task_attachments',
    ];

    for (const key of expectedKeys) {
      expect(GENERIC_ACTION_MAP).toHaveProperty(key);
    }
  });

  it('each entry has all 8 handler methods', () => {
    const handlerKeys: (keyof GenericCrudHandlers)[] = [
      'handleCreate',
      'handleCreatePrompt',
      'handleUpdate',
      'handleUpdatePrompt',
      'handleDelete',
      'handleDeletePrompt',
      'handleList',
      'handleListPrompt',
    ];

    // Spot-check a few entries
    for (const entity of ['categories', 'teams', 'broadcasts']) {
      const entry = GENERIC_ACTION_MAP[entity];
      for (const key of handlerKeys) {
        expect(entry[key]).toBeTypeOf('function');
      }
    }
  });
});

describe('exported named handler instances', () => {
  it('categoryActions is defined with all handlers', () => {
    expect(categoryActions).toBeDefined();
    expect(categoryActions.handleCreate).toBeTypeOf('function');
    expect(categoryActions.handleListPrompt).toBeTypeOf('function');
  });

  it('statusActions is defined with all handlers', () => {
    expect(statusActions).toBeDefined();
    expect(statusActions.handleUpdate).toBeTypeOf('function');
  });

  it('teamActions is defined with all handlers', () => {
    expect(teamActions).toBeDefined();
    expect(teamActions.handleDeletePrompt).toBeTypeOf('function');
  });

  it('broadcastActions is defined with all handlers', () => {
    expect(broadcastActions).toBeDefined();
    expect(broadcastActions.handleCreatePrompt).toBeTypeOf('function');
  });

  it('spotTypeActions handles camelCase→snake_case correctly', () => {
    // spotTypes → spot_types, so action should be create_spot_types
    const result = spotTypeActions.handleCreate(
      { action: 'create_spot_types', data: { name: 'Type A' } },
      vi.fn(),
    );
    expect(result).toBe(true);
  });

  it('pluginActions has no required fields', async () => {
    const send = vi.fn();
    await pluginActions.handleCreatePrompt(
      { tool: 'create_plugins', data: {} },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. Logger integration
// ═════════════════════════════════════════════════════════════════════════════

describe('Logger integration', () => {
  let handlers: GenericCrudHandlers;

  beforeEach(() => {
    handlers = createGenericCrudHandlers(testConfig());
  });

  it('logs error when required field validation fails in tool_result pathway', () => {
    handlers.handleCreate(
      { action: 'create_test_entities', data: {} },
      vi.fn(),
    );

    expect(Logger.error).toHaveBeenCalledWith(
      'assistant',
      expect.stringContaining('Missing required field: name'),
    );
  });

  it('logs info on successful create dispatch', () => {
    handlers.handleCreate(
      { action: 'create_test_entities', data: { name: 'Test' } },
      vi.fn(),
    );

    expect(Logger.info).toHaveBeenCalledWith(
      'assistant',
      expect.stringContaining('Creating test entity'),
      expect.anything(),
    );
  });

  it('logs info in prompt pathway on create', async () => {
    await handlers.handleCreatePrompt(
      { tool: 'create_test_entities', data: { name: 'Test' } },
      vi.fn(),
    );

    expect(Logger.info).toHaveBeenCalledWith(
      'assistant',
      expect.stringContaining('Raw input from agent'),
      expect.anything(),
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. Multiple required fields (e.g., statuses need name + category_id)
// ═════════════════════════════════════════════════════════════════════════════

describe('multiple required fields validation', () => {
  let handlers: GenericCrudHandlers;

  beforeEach(() => {
    handlers = createGenericCrudHandlers({
      sliceName: 'statuses',
      label: 'status',
      requiredFields: ['name', 'category_id'],
    });
  });

  it('tool_result: fails on first missing field', () => {
    const sendMessage = vi.fn();
    handlers.handleCreate(
      { action: 'create_statuses', data: { category_id: 1 } },
      sendMessage,
    );

    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('"name" is required'),
    );
  });

  it('tool_result: fails on second missing field', () => {
    const sendMessage = vi.fn();
    handlers.handleCreate(
      { action: 'create_statuses', data: { name: 'Open' } },
      sendMessage,
    );

    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('"category_id" is required'),
    );
  });

  it('prompt: fails on first missing field', async () => {
    const send = vi.fn();
    await handlers.handleCreatePrompt(
      { tool: 'create_statuses', data: { category_id: 1 } },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(false);
    expect(response.error).toContain('name');
  });

  it('prompt: succeeds when all required fields are present', async () => {
    const send = vi.fn();
    await handlers.handleCreatePrompt(
      { tool: 'create_statuses', data: { name: 'Open', category_id: 1 } },
      send,
    );

    const response = parseSendResponse(send);
    expect(response.ok).toBe(true);
  });
});
