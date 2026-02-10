/**
 * Mock tasksSlice for Cypress component tests.
 *
 * Replaces `@/store/reducers/tasksSlice` via Vite alias. Exports the same
 * thunk creator names that taskActions.ts imports, but as simple functions
 * that return plain action objects (no API / IndexedDB side-effects).
 */

export const addTaskAsync = (data: any) => ({ type: 'tasks/addTaskAsync', payload: data });
export const updateTaskAsync = (data: any) => ({ type: 'tasks/updateTaskAsync', payload: data });
export const removeTaskAsync = (id: any) => ({ type: 'tasks/removeTaskAsync', payload: id });
export const moveTaskThunk = (data: any) => ({ type: 'tasks/moveTaskThunk', payload: data });
export const getTasksFromIndexedDB = () => ({ type: 'tasks/loadTasks' });

// Mock slice object in case anything accesses it
export const tasksSlice = {
  reducer: (state: any = { value: [], loading: false, error: null }) => state,
  actions: {},
  name: 'tasks',
};

export const applyTaskUserPivotChanges = () => Promise.resolve();
