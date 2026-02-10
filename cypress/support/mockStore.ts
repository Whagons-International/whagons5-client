/**
 * Mock Redux store for Cypress component tests.
 *
 * Replaces `@/store/store` via a Vite alias in cypress.config.mjs so that
 * all action-handler modules receive this lightweight mock instead of the
 * real store (which pulls in IndexedDB, Firebase, API layers, etc.).
 *
 * The mock exposes `__reset`, `__rejectNext`, and `__setState` helpers so
 * individual tests can control dispatch outcomes and store state.
 */

interface MockDispatch {
  (...args: any[]): { unwrap: () => Promise<any> };
  __calls: any[][];
  __rejectNext: string | null;
  __resolveValue: any;
  __reset: () => void;
}

interface MockGetState {
  (): any;
  __state: any;
  __setState: (state: any) => void;
  __reset: () => void;
}

function createMockDispatch(): MockDispatch {
  const fn: any = (...args: any[]) => {
    fn.__calls.push(args);
    if (fn.__rejectNext) {
      const err = fn.__rejectNext;
      fn.__rejectNext = null;
      return { unwrap: () => Promise.reject(new Error(err)) };
    }
    return { unwrap: () => Promise.resolve(fn.__resolveValue) };
  };
  fn.__calls = [] as any[][];
  fn.__rejectNext = null as string | null;
  fn.__resolveValue = { id: 1 } as any;
  fn.__reset = () => {
    fn.__calls = [];
    fn.__rejectNext = null;
    fn.__resolveValue = { id: 1 };
  };
  return fn as MockDispatch;
}

function createMockGetState(): MockGetState {
  const fn: any = () => fn.__state;
  fn.__state = {} as any;
  fn.__setState = (state: any) => {
    fn.__state = state;
  };
  fn.__reset = () => {
    fn.__state = {};
  };
  return fn as MockGetState;
}

export const store = {
  dispatch: createMockDispatch(),
  getState: createMockGetState(),
};

export type RootState = any;
export type AppDispatch = any;
