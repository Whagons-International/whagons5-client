/**
 * IndexedDB Adapter - wraps the existing DB class to match DatabaseAdapter interface.
 * 
 * This provides backward compatibility when DuckDB is not available or disabled.
 * It simply delegates all calls to the existing DB.ts implementation.
 */

import { DB } from '../indexedDB/DB';
import type { DatabaseAdapter } from './types';

/**
 * IndexedDB adapter that wraps the existing DB class.
 * Implements the DatabaseAdapter interface for seamless switching.
 */
export class IndexedDBAdapter implements DatabaseAdapter {
  /** Whether the database has been initialized */
  get inited(): boolean {
    return DB.inited;
  }

  /**
   * Initialize the database for the given user.
   */
  async init(uid?: string): Promise<boolean> {
    return DB.init(uid);
  }

  /**
   * Wait for the database to be ready.
   */
  async whenReady(timeoutMs?: number): Promise<boolean> {
    return DB.whenReady(timeoutMs);
  }

  /**
   * Delete the database for the given user.
   */
  async deleteDatabase(userID: string): Promise<void> {
    return DB.deleteDatabase(userID);
  }

  /**
   * Get all rows from a store.
   */
  async getAll(storeName: string): Promise<any[]> {
    return DB.getAll(storeName);
  }

  /**
   * Get a single row by primary key.
   */
  async get(storeName: string, key: number | string): Promise<any | null> {
    return DB.get(storeName, key);
  }

  /**
   * Insert or update a row.
   */
  async put(storeName: string, row: any): Promise<void> {
    return DB.put(storeName, row);
  }

  /**
   * Bulk insert or update multiple rows.
   */
  async bulkPut(storeName: string, rows: any[]): Promise<void> {
    return DB.bulkPut(storeName, rows);
  }

  /**
   * Delete a row by primary key.
   */
  async delete(storeName: string, key: number | string): Promise<void> {
    return DB.delete(storeName, key);
  }

  /**
   * Delete all rows from a store.
   */
  async clear(storeName: string): Promise<void> {
    return DB.clear(storeName);
  }

  // Note: query() and exec() are not implemented for IndexedDB
  // These methods are DuckDB-specific and will return undefined
}

// Export a singleton instance
export const indexedDBAdapter = new IndexedDBAdapter();
