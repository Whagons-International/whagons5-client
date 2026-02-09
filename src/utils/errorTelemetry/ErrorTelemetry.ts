/**
 * Error Telemetry System
 * 
 * Captures errors with full context and sends them to the RTL server.
 * Errors are queued locally in IndexedDB and transmitted via WebSocket.
 * Once RTL acknowledges receipt, errors are removed from the queue.
 */

import { auth } from '@/firebase/firebaseConfig';
import { store } from '@/store/store';
import { getVersionInfo } from '@/utils/version';
import { ErrorDB, QueuedError } from './ErrorDB';
import { getGlobalRtl, RealTimeListener } from '@/store/realTimeListener/RTL';
import { Logger, LogCategory } from '@/utils/logger';

// Maximum size of Redux state snapshot to prevent huge payloads
const MAX_STATE_SNAPSHOT_SIZE = 50 * 1024; // 50KB

// Maximum retry attempts before discarding
const MAX_RETRY_ATTEMPTS = 5;

// Flush interval for pending errors (in ms)
const FLUSH_INTERVAL = 30000; // 30 seconds

// Stale error cleanup interval (in ms)
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

export interface ErrorContext {
  userId?: number;
  userUid?: string;
  userEmail?: string;
  tenantName?: string;
  appVersion: string;
  commitHash: string;
  buildTime: string;
  url: string;
  userAgent: string;
  reduxStateSnapshot?: Record<string, unknown>;
}

class ErrorTelemetryClass {
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;
  private rtlUnsubscribe: (() => void) | null = null;
  private pendingAcks: Set<string> = new Set();

  /**
   * Initialize the telemetry system
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    await ErrorDB.init();

    // Start periodic flush of pending errors
    this.flushTimer = setInterval(() => {
      this.flushQueue();
    }, FLUSH_INTERVAL);

    // Start periodic cleanup of stale errors
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleErrors();
    }, CLEANUP_INTERVAL);

    // Clean up stale errors on init
    const deleted = await ErrorDB.deleteStaleErrors(24);
    if (deleted > 0) {
      Logger.info('ui', `ErrorTelemetry: Cleaned up ${deleted} stale errors`);
    }

    // Subscribe to RTL events for ACK handling
    this.subscribeToRtl();

    // Try to flush any pending errors from previous sessions
    this.flushQueue();

    this.isInitialized = true;
    Logger.info('ui', 'ErrorTelemetry: Initialized');
  }

  /**
   * Subscribe to RTL events for telemetry ACKs
   */
  private subscribeToRtl(): void {
    try {
      const rtl = getGlobalRtl();
      
      // Listen for telemetry ACK messages
      this.rtlUnsubscribe = rtl.on('telemetry:ack', (data: { error_ids?: string[] }) => {
        this.handleAck(data.error_ids || []);
      });

      // Also listen for connection status to flush on reconnect
      rtl.on('connection:status', (data: { status: string }) => {
        if (data.status === 'authenticated') {
          // Flush queue when RTL reconnects
          setTimeout(() => this.flushQueue(), 1000);
        }
      });
    } catch {
      // RTL not available yet, will retry on flush
    }
  }

  /**
   * Handle ACK from RTL - remove acknowledged errors from queue
   */
  private async handleAck(errorIds: string[]): Promise<void> {
    if (errorIds.length === 0) return;

    const dequeued = await ErrorDB.dequeueBatch(errorIds);
    
    // Remove from pending ACKs set
    for (const id of errorIds) {
      this.pendingAcks.delete(id);
    }

    Logger.debug('ui', `ErrorTelemetry: Dequeued ${dequeued} acknowledged errors`);
  }

  /**
   * Capture and queue an error
   */
  async captureError(
    category: LogCategory,
    message: string,
    error?: Error | unknown,
    additionalContext?: Record<string, unknown>
  ): Promise<void> {
    try {
      const context = this.gatherContext();
      const now = new Date().toISOString();
      
      const queuedError: QueuedError = {
        id: this.generateId(),
        timestamp: now,
        createdAt: now,
        category,
        message: this.formatMessage(message, error),
        stack: this.extractStack(error),
        context: {
          ...context,
          ...(additionalContext && { ...additionalContext }),
        } as QueuedError['context'],
        retryCount: 0,
      };

      // Store in queue
      await ErrorDB.enqueue(queuedError);

      // Try to send immediately
      this.sendError(queuedError);
    } catch (e) {
      // Fail silently - we don't want error logging to cause more errors
      console.error('ErrorTelemetry: Failed to capture error:', e);
    }
  }

  /**
   * Capture an uncaught error from window.onerror
   */
  async captureUncaughtError(
    message: string | Event,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): Promise<void> {
    const errorMessage = typeof message === 'string' ? message : 'Uncaught error';
    const stack = error?.stack || `at ${source}:${lineno}:${colno}`;

    await this.captureError('ui', `[Uncaught] ${errorMessage}`, error, {
      source,
      lineno,
      colno,
      originalStack: stack,
    });
  }

  /**
   * Capture an unhandled promise rejection
   */
  async captureUnhandledRejection(event: PromiseRejectionEvent): Promise<void> {
    const reason = event.reason;
    const message = reason?.message || reason?.toString?.() || 'Unhandled promise rejection';
    const stack = reason?.stack;

    await this.captureError('ui', `[Unhandled Rejection] ${message}`, reason, {
      originalStack: stack,
    });
  }

  /**
   * Gather current context information
   */
  private gatherContext(): ErrorContext {
    const versionInfo = getVersionInfo();
    const currentUser = auth.currentUser;
    const subdomain = localStorage.getItem('whagons-subdomain') || '';
    const tenantName = subdomain.replace(/\.$/, ''); // Remove trailing dot

    // Get user info from Redux if available
    let userId: number | undefined;
    let userEmail: string | undefined;
    try {
      const state = store.getState();
      const users = state?.users?.value || [];
      const currentUserData = users.find(
        (u: { firebase_uid?: string }) => u.firebase_uid === currentUser?.uid
      );
      if (currentUserData) {
        userId = currentUserData.id;
        userEmail = currentUserData.email;
      }
    } catch {
      // Ignore errors accessing Redux state
    }

    return {
      userId,
      userUid: currentUser?.uid,
      userEmail: userEmail || currentUser?.email || undefined,
      tenantName: tenantName || undefined,
      appVersion: versionInfo.version,
      commitHash: versionInfo.commit,
      buildTime: versionInfo.buildTime,
      url: window.location.href,
      userAgent: navigator.userAgent,
      reduxStateSnapshot: this.getReduxStateSnapshot(),
    };
  }

  /**
   * Get a minimal snapshot of Redux state for debugging
   */
  private getReduxStateSnapshot(): Record<string, unknown> | undefined {
    try {
      const state = store.getState();
      
      // Create a minimal snapshot with counts and key info
      const snapshot: Record<string, unknown> = {
        _snapshotTime: new Date().toISOString(),
      };

      // Add counts for each slice
      for (const [key, value] of Object.entries(state)) {
        if (value && typeof value === 'object') {
          if ('value' in value && Array.isArray(value.value)) {
            snapshot[key] = {
              count: value.value.length,
              loading: (value as { loading?: boolean }).loading,
              error: (value as { error?: string }).error,
            };
          } else if (Array.isArray(value)) {
            snapshot[key] = { count: value.length };
          } else {
            // For other objects, just note their presence
            snapshot[key] = { type: 'object', keys: Object.keys(value).length };
          }
        }
      }

      // Ensure we don't exceed size limit
      const json = JSON.stringify(snapshot);
      if (json.length > MAX_STATE_SNAPSHOT_SIZE) {
        return { _truncated: true, _size: json.length };
      }

      return snapshot;
    } catch {
      return undefined;
    }
  }

  /**
   * Format error message
   */
  private formatMessage(message: string, error?: Error | unknown): string {
    if (error instanceof Error) {
      return `${message}: ${error.message}`;
    }
    if (error !== undefined) {
      return `${message}: ${String(error)}`;
    }
    return message;
  }

  /**
   * Extract stack trace from error
   */
  private extractStack(error?: Error | unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }
    if (error && typeof error === 'object' && 'stack' in error) {
      return String((error as { stack: unknown }).stack);
    }
    return undefined;
  }

  /**
   * Generate unique error ID
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `err_${timestamp}_${random}`;
  }

  /**
   * Send error to RTL server via WebSocket
   */
  private sendError(error: QueuedError): boolean {
    try {
      const rtl = getGlobalRtl();
      const status = rtl.connectionStatus;

      if (!status.connected || !status.authenticated) {
        // RTL not connected, error will be sent during flush
        return false;
      }

      // Track that we're waiting for ACK
      this.pendingAcks.add(error.id);

      // Send error as a telemetry message
      rtl.send({
        type: 'telemetry',
        operation: 'error',
        data: {
          id: error.id,
          timestamp: error.timestamp,
          category: error.category,
          message: error.message,
          stack: error.stack,
          context: error.context,
        },
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Flush pending errors from queue to server
   */
  async flushQueue(): Promise<void> {
    try {
      const rtl = getGlobalRtl();
      const status = rtl.connectionStatus;

      if (!status.connected || !status.authenticated) {
        return;
      }

      const pendingErrors = await ErrorDB.getPendingErrors();
      
      for (const error of pendingErrors) {
        // Skip if we're already waiting for ACK
        if (this.pendingAcks.has(error.id)) {
          continue;
        }

        // Skip if too many retries
        if (error.retryCount >= MAX_RETRY_ATTEMPTS) {
          // Remove from queue - too many failures
          await ErrorDB.dequeue(error.id);
          Logger.warn('ui', `ErrorTelemetry: Discarding error ${error.id} after ${MAX_RETRY_ATTEMPTS} retries`);
          continue;
        }

        const sent = this.sendError(error);
        if (!sent) {
          await ErrorDB.incrementRetryCount(error.id);
        }
      }
    } catch {
      // Fail silently
    }
  }

  /**
   * Clean up stale errors that have been in queue too long
   */
  private async cleanupStaleErrors(): Promise<void> {
    const deleted = await ErrorDB.deleteStaleErrors(24);
    if (deleted > 0) {
      Logger.info('ui', `ErrorTelemetry: Cleaned up ${deleted} stale errors`);
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{ queueSize: number; pendingAcks: number }> {
    const queueSize = await ErrorDB.getQueueSize();
    return {
      queueSize,
      pendingAcks: this.pendingAcks.size,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    if (this.rtlUnsubscribe) {
      this.rtlUnsubscribe();
      this.rtlUnsubscribe = null;
    }
    this.pendingAcks.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const ErrorTelemetry = new ErrorTelemetryClass();
