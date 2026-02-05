/**
 * Database Layer - Main Entry Point
 * 
 * This module provides a unified database interface that can use either:
 * - DuckDB (preferred, with OPFS persistence and SQL query support)
 * - IndexedDB (fallback for browsers without OPFS support)
 * 
 * Usage:
 *   import { DB } from '@/store/database';
 *   
 *   await DB.init();
 *   const tasks = await DB.getAll('tasks');
 *   
 *   // DuckDB-specific SQL queries (when available)
 *   if (DB.query) {
 *     const results = await DB.query('SELECT * FROM tasks WHERE status_id = 1');
 *   }
 * 
 * Feature Flags:
 *   - localStorage 'whagons-use-duckdb' = 'true' | 'false' | undefined
 *   - If undefined, DuckDB is used when OPFS is available
 *   - Set to 'false' to force IndexedDB
 *   - Set to 'true' to force DuckDB (falls back to IndexedDB if OPFS unavailable)
 */

import { DuckDBAdapter, duckDBAdapter } from './DuckDBAdapter';
import { IndexedDBAdapter, indexedDBAdapter } from './IndexedDBAdapter';
import type { DatabaseAdapter } from './types';

// ============================================================================
// Feature Detection
// ============================================================================

/**
 * Check if OPFS (Origin Private File System) is supported.
 * Required for DuckDB persistence.
 */
function isOpfsSupported(): boolean {
  try {
    const hasNavigator = typeof navigator !== 'undefined';
    const hasStorage = hasNavigator && 'storage' in navigator;
    const hasGetDirectory =
      hasStorage && (navigator.storage as any) && 'getDirectory' in navigator.storage;
    return hasNavigator && hasStorage && hasGetDirectory;
  } catch {
    return false;
  }
}

/**
 * Determine which database adapter to use based on:
 * 1. Feature flag in localStorage
 * 2. Browser capability (OPFS support)
 */
function selectAdapter(): { adapter: DatabaseAdapter; isDuckDB: boolean } {
  // Check feature flag
  const flag = typeof localStorage !== 'undefined' 
    ? localStorage.getItem('whagons-use-duckdb') 
    : null;

  // Explicit disable
  if (flag === 'false') {
    console.log('[Database] Using IndexedDB (feature flag disabled)');
    return { adapter: indexedDBAdapter, isDuckDB: false };
  }

  // Check OPFS support
  const opfsAvailable = isOpfsSupported();

  // Explicit enable (but fallback if no OPFS)
  if (flag === 'true') {
    if (opfsAvailable) {
      console.log('[Database] Using DuckDB (feature flag enabled)');
      return { adapter: duckDBAdapter, isDuckDB: true };
    } else {
      console.log('[Database] Using IndexedDB (DuckDB requested but OPFS not available)');
      return { adapter: indexedDBAdapter, isDuckDB: false };
    }
  }

  // Default behavior: use DuckDB if OPFS available
  if (opfsAvailable) {
    console.log('[Database] Using DuckDB (OPFS available)');
    return { adapter: duckDBAdapter, isDuckDB: true };
  } else {
    console.log('[Database] Using IndexedDB (OPFS not available)');
    return { adapter: indexedDBAdapter, isDuckDB: false };
  }
}

// ============================================================================
// Adapter Selection (happens once at module load)
// ============================================================================

const { adapter: selectedAdapter, isDuckDB: _isDuckDB } = selectAdapter();

/**
 * Whether the current adapter is DuckDB.
 */
export const isDuckDB = _isDuckDB;

/**
 * Whether the current adapter supports SQL queries.
 */
export const hasSQLSupport = _isDuckDB;

// ============================================================================
// Unified Database Interface
// ============================================================================

/**
 * Database interface that works with either IndexedDB or DuckDB.
 * 
 * Implements the same API as the original DB class for backward compatibility.
 */
class UnifiedDatabase implements DatabaseAdapter {
  private adapter: DatabaseAdapter;

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  get inited(): boolean {
    return this.adapter.inited;
  }

  async init(uid?: string): Promise<boolean> {
    return this.adapter.init(uid);
  }

  async whenReady(timeoutMs?: number): Promise<boolean> {
    return this.adapter.whenReady(timeoutMs);
  }

  async deleteDatabase(userID: string): Promise<void> {
    return this.adapter.deleteDatabase(userID);
  }

  async getAll(storeName: string): Promise<any[]> {
    return this.adapter.getAll(storeName);
  }

  async get(storeName: string, key: number | string): Promise<any | null> {
    return this.adapter.get(storeName, key);
  }

  async put(storeName: string, row: any): Promise<void> {
    return this.adapter.put(storeName, row);
  }

  async bulkPut(storeName: string, rows: any[]): Promise<void> {
    return this.adapter.bulkPut(storeName, rows);
  }

  async delete(storeName: string, key: number | string): Promise<void> {
    return this.adapter.delete(storeName, key);
  }

  async clear(storeName: string): Promise<void> {
    return this.adapter.clear(storeName);
  }

  /**
   * Execute a raw SQL query (DuckDB only).
   * Returns undefined if using IndexedDB.
   */
  async query(sql: string, params?: any[]): Promise<any[] | undefined> {
    if (this.adapter.query) {
      return this.adapter.query(sql, params);
    }
    return undefined;
  }

  /**
   * Execute a raw SQL statement (DuckDB only).
   * No-op if using IndexedDB.
   */
  async exec(sql: string): Promise<void> {
    if (this.adapter.exec) {
      return this.adapter.exec(sql);
    }
  }

  /**
   * Check if SQL query support is available.
   */
  get hasSQLSupport(): boolean {
    return !!this.adapter.query;
  }
}

/**
 * The main database instance.
 * Use this for all database operations.
 */
export const DB = new UnifiedDatabase(selectedAdapter);

// ============================================================================
// Re-exports for advanced usage
// ============================================================================

export { DuckDBAdapter, duckDBAdapter } from './DuckDBAdapter';
export { IndexedDBAdapter, indexedDBAdapter } from './IndexedDBAdapter';
export { TaskQueryBuilder, buildTaskQuery } from './TaskQueryBuilder';
export type { TaskQueryParams, FilterModelEntry } from './TaskQueryBuilder';
export type { DatabaseAdapter, TableSchema, ColumnDef, IndexDef, DuckDBColumnType } from './types';
export { 
  generateTableSchema, 
  generateCreateTableDDL, 
  generateAllSchemas,
  getSchemaForStore,
  HARDCODED_SCHEMAS 
} from './schemaGenerator';
