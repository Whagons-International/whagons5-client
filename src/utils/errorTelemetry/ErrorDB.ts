/**
 * Separate IndexedDB database for error telemetry queue.
 * 
 * This acts as a queue - errors are stored here temporarily until
 * RTL acknowledges receipt, then they are deleted.
 * 
 * Isolated from the main app database to ensure error
 * logging works even when the main DB has issues.
 */

import { Logger } from '@/utils/logger';

const ERROR_DB_NAME = 'whagons_error_queue';
const ERROR_DB_VERSION = 1;
const ERROR_STORE_NAME = 'pending_errors';

export interface QueuedError {
  id: string;
  timestamp: string;
  category: string;
  message: string;
  stack?: string;
  context: {
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
  };
  retryCount: number;
  createdAt: string;
}

export class ErrorDB {
  private static db: IDBDatabase | null = null;
  private static initPromise: Promise<boolean> | null = null;

  /**
   * Initialize the error queue database
   */
  static async init(): Promise<boolean> {
    if (ErrorDB.db) return true;
    if (ErrorDB.initPromise) return ErrorDB.initPromise;

    ErrorDB.initPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(ERROR_DB_NAME, ERROR_DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          if (!db.objectStoreNames.contains(ERROR_STORE_NAME)) {
            const store = db.createObjectStore(ERROR_STORE_NAME, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('category', 'category', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
          }
        };

        request.onsuccess = () => {
          ErrorDB.db = request.result;
          ErrorDB.initPromise = null;
          resolve(true);
        };

        request.onerror = () => {
          Logger.error('ui', 'ErrorDB: Failed to open error queue database:', request.error);
          ErrorDB.initPromise = null;
          resolve(false);
        };

        request.onblocked = () => {
          Logger.warn('ui', 'ErrorDB: Database open blocked');
        };
      } catch (error) {
        Logger.error('ui', 'ErrorDB: Exception during init:', error);
        ErrorDB.initPromise = null;
        resolve(false);
      }
    });

    return ErrorDB.initPromise;
  }

  /**
   * Queue an error for sending
   */
  static async enqueue(error: QueuedError): Promise<boolean> {
    const ready = await ErrorDB.init();
    if (!ready || !ErrorDB.db) return false;

    return new Promise((resolve) => {
      try {
        const tx = ErrorDB.db!.transaction(ERROR_STORE_NAME, 'readwrite');
        const store = tx.objectStore(ERROR_STORE_NAME);
        const request = store.put(error);

        request.onsuccess = () => resolve(true);
        request.onerror = () => {
          Logger.error('ui', 'ErrorDB: Failed to enqueue error:', request.error);
          resolve(false);
        };
      } catch (error) {
        Logger.error('ui', 'ErrorDB: Exception enqueueing error:', error);
        resolve(false);
      }
    });
  }

  /**
   * Get all pending errors in the queue
   */
  static async getPendingErrors(): Promise<QueuedError[]> {
    const ready = await ErrorDB.init();
    if (!ready || !ErrorDB.db) return [];

    return new Promise((resolve) => {
      try {
        const tx = ErrorDB.db!.transaction(ERROR_STORE_NAME, 'readonly');
        const store = tx.objectStore(ERROR_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => {
          Logger.error('ui', 'ErrorDB: Failed to get pending errors:', request.error);
          resolve([]);
        };
      } catch (error) {
        Logger.error('ui', 'ErrorDB: Exception getting pending errors:', error);
        resolve([]);
      }
    });
  }

  /**
   * Remove an error from the queue (after RTL ACK)
   */
  static async dequeue(id: string): Promise<boolean> {
    const ready = await ErrorDB.init();
    if (!ready || !ErrorDB.db) return false;

    return new Promise((resolve) => {
      try {
        const tx = ErrorDB.db!.transaction(ERROR_STORE_NAME, 'readwrite');
        const store = tx.objectStore(ERROR_STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = () => {
          Logger.error('ui', 'ErrorDB: Failed to dequeue error:', request.error);
          resolve(false);
        };
      } catch (error) {
        Logger.error('ui', 'ErrorDB: Exception dequeuing error:', error);
        resolve(false);
      }
    });
  }

  /**
   * Remove multiple errors from the queue (batch ACK)
   */
  static async dequeueBatch(ids: string[]): Promise<number> {
    const ready = await ErrorDB.init();
    if (!ready || !ErrorDB.db) return 0;

    return new Promise((resolve) => {
      try {
        const tx = ErrorDB.db!.transaction(ERROR_STORE_NAME, 'readwrite');
        const store = tx.objectStore(ERROR_STORE_NAME);
        
        let deletedCount = 0;
        
        for (const id of ids) {
          const request = store.delete(id);
          request.onsuccess = () => deletedCount++;
        }

        tx.oncomplete = () => resolve(deletedCount);
        tx.onerror = () => resolve(deletedCount);
      } catch (error) {
        Logger.error('ui', 'ErrorDB: Exception dequeuing batch:', error);
        resolve(0);
      }
    });
  }

  /**
   * Increment retry count for an error
   */
  static async incrementRetryCount(id: string): Promise<boolean> {
    const ready = await ErrorDB.init();
    if (!ready || !ErrorDB.db) return false;

    return new Promise((resolve) => {
      try {
        const tx = ErrorDB.db!.transaction(ERROR_STORE_NAME, 'readwrite');
        const store = tx.objectStore(ERROR_STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const error = getRequest.result as QueuedError | undefined;
          if (error) {
            error.retryCount += 1;
            const putRequest = store.put(error);
            putRequest.onsuccess = () => resolve(true);
            putRequest.onerror = () => resolve(false);
          } else {
            resolve(false);
          }
        };

        getRequest.onerror = () => resolve(false);
      } catch (error) {
        Logger.error('ui', 'ErrorDB: Exception incrementing retry:', error);
        resolve(false);
      }
    });
  }

  /**
   * Delete stale errors that have been in the queue too long
   * (e.g., if RTL was down for extended period)
   */
  static async deleteStaleErrors(maxAgeHours: number = 24): Promise<number> {
    const ready = await ErrorDB.init();
    if (!ready || !ErrorDB.db) return 0;

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);
    const cutoffISO = cutoffDate.toISOString();

    return new Promise((resolve) => {
      try {
        const tx = ErrorDB.db!.transaction(ERROR_STORE_NAME, 'readwrite');
        const store = tx.objectStore(ERROR_STORE_NAME);
        const index = store.index('createdAt');
        const range = IDBKeyRange.upperBound(cutoffISO);
        const request = index.openCursor(range);

        let deletedCount = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          }
        };

        tx.oncomplete = () => resolve(deletedCount);
        tx.onerror = () => resolve(deletedCount);
      } catch (error) {
        Logger.error('ui', 'ErrorDB: Exception deleting stale errors:', error);
        resolve(0);
      }
    });
  }

  /**
   * Get queue size
   */
  static async getQueueSize(): Promise<number> {
    const ready = await ErrorDB.init();
    if (!ready || !ErrorDB.db) return 0;

    return new Promise((resolve) => {
      try {
        const tx = ErrorDB.db!.transaction(ERROR_STORE_NAME, 'readonly');
        const store = tx.objectStore(ERROR_STORE_NAME);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      } catch (error) {
        resolve(0);
      }
    });
  }

  /**
   * Clear the entire queue (for debugging/testing)
   */
  static async clearQueue(): Promise<boolean> {
    const ready = await ErrorDB.init();
    if (!ready || !ErrorDB.db) return false;

    return new Promise((resolve) => {
      try {
        const tx = ErrorDB.db!.transaction(ERROR_STORE_NAME, 'readwrite');
        const store = tx.objectStore(ERROR_STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch (error) {
        resolve(false);
      }
    });
  }
}
