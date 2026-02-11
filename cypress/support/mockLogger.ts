/**
 * Mock Logger for Cypress component tests.
 *
 * Replaces `@/utils/logger` via Vite alias. Provides a no-op Logger so
 * that action-handler modules can call Logger.info / Logger.error etc.
 * without pulling in YAML config parsing or telemetry code.
 */

const noop = (..._args: any[]) => {};

export const Logger = {
  info: noop,
  warn: noop,
  error: noop,
  debug: noop,
  log: noop,
  scope: (_category: string) => ({
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    isEnabled: () => false,
  }),
  time: (_category: string, _label: string) => noop,
  group: noop,
  groupEnd: noop,
  table: noop,
  isEnabled: () => false,
  getEnabledCategories: () => [],
  isDev: () => true,
  installGlobalErrorHandlers: noop,
  enableTelemetry: () => Promise.resolve(),
  isTelemetryEnabled: () => false,
};

export class LoggerClass {}
