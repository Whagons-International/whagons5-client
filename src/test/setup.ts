import { vi } from 'vitest';

// ─── Mock the Redux store ────────────────────────────────────────────────────
// All action handlers import `store` from '@/store/store'
vi.mock('@/store/store', () => ({
  store: {
    dispatch: vi.fn(() => ({
      unwrap: vi.fn(() => Promise.resolve({ id: 1 })),
    })),
    getState: vi.fn(() => ({})),
  },
}));

// ─── Mock genericActions ─────────────────────────────────────────────────────
// Returns a Proxy so any slice name (e.g., genericActions.categories) auto-creates mock actions
function createMockSliceActions() {
  return {
    addAsync: vi.fn((data: any) => ({ type: 'mock/addAsync', payload: data })),
    updateAsync: vi.fn((data: any) => ({ type: 'mock/updateAsync', payload: data })),
    removeAsync: vi.fn((id: any) => ({ type: 'mock/removeAsync', payload: id })),
    getFromIndexedDB: vi.fn(() => ({ type: 'mock/getFromIndexedDB' })),
    fetchFromAPI: vi.fn(() => ({ type: 'mock/fetchFromAPI' })),
  };
}

vi.mock('@/store/genericSlices', () => ({
  genericActions: new Proxy({}, {
    get(_target, prop) {
      // Cache the mock so the same slice returns the same mock object
      if (typeof prop === 'string') {
        if (!(_target as any)[prop]) {
          (_target as any)[prop] = createMockSliceActions();
        }
        return (_target as any)[prop];
      }
      return undefined;
    },
  }),
}));

// ─── Mock Logger ─────────────────────────────────────────────────────────────
vi.mock('@/utils/logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    scope: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
    time: vi.fn(() => vi.fn()),
  },
}));

// ─── Mock task thunks ────────────────────────────────────────────────────────
vi.mock('@/store/reducers/tasksSlice', () => ({
  addTaskAsync: vi.fn((data: any) => ({ type: 'tasks/addTaskAsync', payload: data })),
  updateTaskAsync: vi.fn((data: any) => ({ type: 'tasks/updateTaskAsync', payload: data })),
  removeTaskAsync: vi.fn((id: any) => ({ type: 'tasks/removeTaskAsync', payload: id })),
  moveTaskThunk: vi.fn((data: any) => ({ type: 'tasks/moveTaskThunk', payload: data })),
}));
