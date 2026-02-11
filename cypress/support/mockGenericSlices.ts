/**
 * Mock generic slices for Cypress component tests.
 *
 * Replaces `@/store/genericSlices` via Vite alias. Every property access
 * on `genericActions` returns a set of mock thunk creators that produce
 * plain action objects (suitable for the mock store's dispatch).
 */

function createMockSliceActions() {
  return {
    addAsync: (data: any) => ({ type: 'mock/addAsync', payload: data }),
    updateAsync: (data: any) => ({ type: 'mock/updateAsync', payload: data }),
    removeAsync: (id: any) => ({ type: 'mock/removeAsync', payload: id }),
  };
}

/**
 * Proxy-based genericActions: any property access returns a set of mock
 * CRUD thunk creators so that handler code like
 * `genericActions.taskTags.addAsync(...)` works without real Redux.
 */
export const genericActions: Record<string, ReturnType<typeof createMockSliceActions>> = new Proxy(
  {} as any,
  {
    get(target: any, prop: string) {
      if (typeof prop === 'symbol') return undefined;
      if (!target[prop]) {
        target[prop] = createMockSliceActions();
      }
      return target[prop];
    },
  },
);

// Re-export anything else that importing modules might reference
export const genericSlices = {
  reducers: {},
  slices: new Proxy({} as any, {
    get(_target: any, _prop: string) {
      return {
        actions: createMockSliceActions(),
        eventNames: {},
        reducer: (state: any = { value: [], loading: false, error: null }) => state,
      };
    },
  }),
  caches: {},
};

export const genericCaches = {};
export const genericReducers = (state: any = {}) => state;
export const genericEvents = { on: () => () => {}, emit: () => {} };
export const genericEventNames = {};
export const genericInternalActions = genericActions;
