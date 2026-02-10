/**
 * Test utilities for Cypress component tests that test plain TypeScript modules.
 *
 * Since Cypress component testing requires mounting a React component,
 * we provide helpers that set up module mocks and run assertions in the
 * browser context where the actual source modules execute.
 */

/** Mock store that tracks dispatch calls */
export function createMockStore(stateOverrides: Record<string, any> = {}) {
  const dispatchCalls: any[] = [];
  return {
    dispatch: (action: any) => {
      dispatchCalls.push(action);
      return {
        unwrap: () => Promise.resolve({ id: 1 }),
      };
    },
    getState: () => stateOverrides,
    dispatchCalls,
  };
}

/** Mock store that rejects on dispatch */
export function createRejectingMockStore(error: string = 'API Error') {
  const dispatchCalls: any[] = [];
  return {
    dispatch: (action: any) => {
      dispatchCalls.push(action);
      return {
        unwrap: () => Promise.reject(new Error(error)),
      };
    },
    getState: () => ({}),
    dispatchCalls,
  };
}
