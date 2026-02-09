/**
 * Centralized logging utility with category-based filtering and error telemetry.
 * 
 * Configuration is loaded from YAML files:
 * - src/config/logging.dev.yaml (development)
 * - src/config/logging.prod.yaml (production)
 * 
 * YAML format:
 *   mode: all | none | categories
 *   categories:
 *     - auth
 *     - api
 *     - cache
 * 
 * Errors are always logged regardless of settings.
 * Errors and traces are automatically sent to RTL for telemetry.
 * 
 * Example usage:
 *   Logger.info('auth', 'User authenticated:', userId);
 *   Logger.warn('cache', 'Cache miss for key:', key);
 *   Logger.error('api', 'Request failed:', error);
 *   Logger.debug('rtl', 'WebSocket message received');
 * 
 * IMPORTANT: Do NOT use console.log/warn/error/info/debug directly.
 * Always use Logger.* methods to ensure consistent logging behavior.
 */

import devConfig from '@/config/logging.dev.yaml?raw';
import prodConfig from '@/config/logging.prod.yaml?raw';
import { parse as parseYaml } from 'yaml';

// Lazy import to avoid circular dependency
let errorTelemetryModule: typeof import('./errorTelemetry') | null = null;
const getErrorTelemetry = async () => {
  if (!errorTelemetryModule) {
    errorTelemetryModule = await import('./errorTelemetry');
  }
  return errorTelemetryModule.ErrorTelemetry;
};

// Log categories matching the app's main features
export type LogCategory =
  | 'auth'           // Authentication & Firebase
  | 'api'            // API requests/responses
  | 'cache'          // IndexedDB caching (GenericCache, TasksCache)
  | 'rtl'            // Real-time listener / WebSocket
  | 'redux'          // Redux state management
  | 'db'             // DuckDB / database operations
  | 'assistant'      // AI assistant / chat
  | 'scheduler'      // Scheduler features
  | 'forms'          // Form handling
  | 'notifications'  // Push notifications / FCM
  | 'integrity'      // Cache integrity validation
  | 'ui'             // UI components / rendering
  | 'perf'           // Performance timing
  | 'navigation'     // Routing / navigation
  | 'icons'          // Icon loading / caching
  | 'boards'         // Boards feature
  | 'workspaces'     // Workspaces feature
  | 'tasks'          // Tasks feature
  | 'branding'       // Tenant branding
  | 'settings'       // Settings pages
  | 'broadcast'      // Broadcast feature
  | 'profile'        // Profile feature
  | 'activity'       // Activity monitoring
  | 'invitations'    // Invitations feature
  | 'speech'         // Speech-to-text
  | 'whiteboard'     // Whiteboard feature
  | 'kpi'            // KPI cards
  | 'confetti';      // Celebration effects

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// All available categories for 'all' mode
const ALL_CATEGORIES: LogCategory[] = [
  'auth', 'api', 'cache', 'rtl', 'redux', 'db', 'assistant', 'scheduler',
  'forms', 'notifications', 'integrity', 'ui', 'perf', 'navigation', 'icons',
  'boards', 'workspaces', 'tasks', 'branding', 'settings', 'broadcast',
  'profile', 'activity', 'invitations', 'speech', 'whiteboard', 'kpi', 'confetti'
];

interface LoggingConfig {
  mode?: 'all' | 'none' | 'categories';
  categories?: string[];
}

class LoggerClass {
  private enabledCategories: Set<LogCategory> = new Set();
  private globalErrorsInstalled = false;
  private isDevelopment: boolean;
  private telemetryEnabled = false;

  constructor() {
    // Check if we're in development mode
    this.isDevelopment = import.meta.env.VITE_DEVELOPMENT === 'true' || import.meta.env.DEV;
    this.loadConfig();
  }

  /**
   * Enable error telemetry - sends errors to RTL server
   * Should be called after app initialization
   */
  async enableTelemetry(): Promise<void> {
    if (this.telemetryEnabled) return;
    
    try {
      const telemetry = await getErrorTelemetry();
      await telemetry.init();
      this.telemetryEnabled = true;
      this.info('ui', 'Error telemetry enabled');
    } catch (e) {
      console.error('Failed to enable error telemetry:', e);
    }
  }

  /**
   * Check if telemetry is enabled
   */
  isTelemetryEnabled(): boolean {
    return this.telemetryEnabled;
  }

  /**
   * Load configuration from YAML files based on environment
   */
  private loadConfig(): void {
    try {
      const configYaml = this.isDevelopment ? devConfig : prodConfig;
      const config = parseYaml(configYaml) as LoggingConfig;

      if (!config) {
        // Fallback: all in dev, none in prod
        if (this.isDevelopment) {
          this.enableAllCategories();
        }
        return;
      }

      const mode = config.mode?.toLowerCase();

      if (mode === 'all') {
        this.enableAllCategories();
      } else if (mode === 'none') {
        this.enabledCategories.clear();
      } else if (config.categories && Array.isArray(config.categories)) {
        // Use specified categories
        config.categories.forEach(cat => {
          const category = cat.toLowerCase() as LogCategory;
          if (ALL_CATEGORIES.includes(category)) {
            this.enabledCategories.add(category);
          }
        });
      } else {
        // Default fallback
        if (this.isDevelopment) {
          this.enableAllCategories();
        }
      }
    } catch {
      // On parse error, use safe defaults
      if (this.isDevelopment) {
        this.enableAllCategories();
      }
    }
  }

  private enableAllCategories(): void {
    ALL_CATEGORIES.forEach(cat => this.enabledCategories.add(cat));
  }

  /**
   * Check if a category is enabled
   */
  isEnabled(category: LogCategory): boolean {
    return this.enabledCategories.has(category);
  }

  /**
   * Get list of enabled categories
   */
  getEnabledCategories(): LogCategory[] {
    return Array.from(this.enabledCategories);
  }

  /**
   * Check if running in development mode
   */
  isDev(): boolean {
    return this.isDevelopment;
  }

  /**
   * Format the log message with category prefix
   */
  private formatPrefix(category: LogCategory, level: LogLevel): string {
    const levelStr = level.toUpperCase().padEnd(5);
    return `[${levelStr}][${category.toUpperCase()}]`;
  }

  /**
   * Debug level log - for development/debugging details
   */
  debug(category: LogCategory, ...args: unknown[]): void {
    if (!this.isEnabled(category)) return;
    console.debug(this.formatPrefix(category, 'debug'), ...args);
  }

  /**
   * Info level log - general information
   */
  info(category: LogCategory, ...args: unknown[]): void {
    if (!this.isEnabled(category)) return;
    console.info(this.formatPrefix(category, 'info'), ...args);
  }

  /**
   * Warn level log - warnings that don't prevent operation
   */
  warn(category: LogCategory, ...args: unknown[]): void {
    if (!this.isEnabled(category)) return;
    console.warn(this.formatPrefix(category, 'warn'), ...args);
  }

  /**
   * Error level log - errors (ALWAYS logged regardless of category settings)
   * Also sends to telemetry for server-side tracking
   */
  error(category: LogCategory, ...args: unknown[]): void {
    // Errors are ALWAYS logged regardless of category settings
    console.error(this.formatPrefix(category, 'error'), ...args);

    // Send to telemetry if enabled
    if (this.telemetryEnabled) {
      this.sendToTelemetry(category, args);
    }
  }

  /**
   * Send error to telemetry system
   */
  private async sendToTelemetry(category: LogCategory, args: unknown[]): Promise<void> {
    try {
      const telemetry = await getErrorTelemetry();
      
      // Extract message and error from args
      const message = args
        .filter(arg => typeof arg === 'string')
        .join(' ') || 'Error';
      
      // Find Error object in args
      const errorObj = args.find(arg => arg instanceof Error) as Error | undefined;
      
      // Find additional context object
      const contextObj = args.find(
        arg => arg !== null && typeof arg === 'object' && !(arg instanceof Error)
      ) as Record<string, unknown> | undefined;

      await telemetry.captureError(category, message, errorObj, contextObj);
    } catch {
      // Fail silently - don't let telemetry errors cause more errors
    }
  }

  /**
   * Log with explicit level
   */
  log(level: LogLevel, category: LogCategory, ...args: unknown[]): void {
    switch (level) {
      case 'debug':
        this.debug(category, ...args);
        break;
      case 'info':
        this.info(category, ...args);
        break;
      case 'warn':
        this.warn(category, ...args);
        break;
      case 'error':
        this.error(category, ...args);
        break;
    }
  }

  /**
   * Create a scoped logger for a specific category
   * Useful for creating a logger instance for a module/file
   */
  scope(category: LogCategory) {
    return {
      debug: (...args: unknown[]) => this.debug(category, ...args),
      info: (...args: unknown[]) => this.info(category, ...args),
      warn: (...args: unknown[]) => this.warn(category, ...args),
      error: (...args: unknown[]) => this.error(category, ...args),
      isEnabled: () => this.isEnabled(category),
    };
  }

  /**
   * Install global error handlers to catch unhandled errors and promise rejections.
   * Should be called once at app startup.
   */
  installGlobalErrorHandlers(): void {
    if (typeof window === 'undefined' || this.globalErrorsInstalled) return;

    // Handle uncaught errors
    window.onerror = (message, source, lineno, colno, error) => {
      this.error('ui', 'Uncaught error:', {
        message,
        source,
        lineno,
        colno,
        error: error?.stack || error?.message || error,
      });

      // Also send directly to telemetry for uncaught errors
      if (this.telemetryEnabled) {
        getErrorTelemetry().then(telemetry => {
          telemetry.captureUncaughtError(message, source, lineno, colno, error);
        }).catch(() => {});
      }

      // Return false to allow default error handling to continue
      return false;
    };

    // Handle unhandled promise rejections
    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      this.error('ui', 'Unhandled promise rejection:', {
        reason: event.reason?.stack || event.reason?.message || event.reason,
      });

      // Also send directly to telemetry for unhandled rejections
      if (this.telemetryEnabled) {
        getErrorTelemetry().then(telemetry => {
          telemetry.captureUnhandledRejection(event);
        }).catch(() => {});
      }
    };

    // Override console.error to also capture through our logging system
    // This helps catch errors from third-party libraries
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      // Check if this is already from our logger (to avoid infinite loop)
      const firstArg = args[0];
      if (typeof firstArg === 'string' && firstArg.startsWith('[ERROR]')) {
        originalConsoleError.apply(console, args);
        return;
      }
      
      // Pass to original console.error
      originalConsoleError.apply(console, args);
    };

    // Override console.trace to capture stack traces
    const originalConsoleTrace = console.trace;
    console.trace = (...args: unknown[]) => {
      // Call original trace
      originalConsoleTrace.apply(console, args);

      // Send to telemetry if enabled
      if (this.telemetryEnabled) {
        const message = args
          .filter(arg => typeof arg === 'string')
          .join(' ') || 'Trace';
        
        getErrorTelemetry().then(telemetry => {
          telemetry.captureError('ui', `[Trace] ${message}`, new Error('Trace'), {
            traceArgs: args.filter(arg => typeof arg !== 'string'),
          });
        }).catch(() => {});
      }
    };

    this.globalErrorsInstalled = true;
    this.info('ui', 'Global error handlers installed');
  }

  /**
   * Performance timing helper
   * Returns a function to call when the operation completes
   */
  time(category: LogCategory, label: string): () => void {
    if (!this.isEnabled(category) && !this.isEnabled('perf')) {
      return () => {};
    }
    
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.debug(category, `${label}: ${duration.toFixed(2)}ms`);
    };
  }

  /**
   * Group related logs together (collapsible in console)
   */
  group(category: LogCategory, label: string): void {
    if (!this.isEnabled(category)) return;
    console.groupCollapsed(this.formatPrefix(category, 'info'), label);
  }

  /**
   * End a log group
   */
  groupEnd(category: LogCategory): void {
    if (!this.isEnabled(category)) return;
    console.groupEnd();
  }

  /**
   * Log a table (useful for arrays/objects)
   */
  table(category: LogCategory, data: unknown, columns?: string[]): void {
    if (!this.isEnabled(category)) return;
    console.info(this.formatPrefix(category, 'info'), 'Table:');
    console.table(data, columns);
  }
}

// Export singleton instance
export const Logger = new LoggerClass();

// Also export the class for testing purposes
export { LoggerClass };
