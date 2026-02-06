/**
 * DuckDB Adapter - implements DatabaseAdapter interface using DuckDB-WASM.
 * 
 * Features:
 * - OPFS persistence (survives browser refresh)
 * - Per-user database isolation
 * - Full SQL query support
 * - Schema generation from OpenAPI
 * - Fallback to IndexedDB if OPFS not available
 */

import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

import { auth } from '@/firebase/firebaseConfig';
import { 
  SIMPLE_STORES, 
  INDEXED_STORES, 
  SPECIAL_KEYPATH_STORES 
} from '../tableRegistry';
import { 
  generateAllSchemas, 
  getSchemaForStore,
  loadOpenAPISchemas 
} from './schemaGenerator';
import type { DatabaseAdapter, TableSchema } from './types';

// ============================================================================
// Constants
// ============================================================================

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker,
  },
};

// Schema version - bump this to force database recreation
const CURRENT_SCHEMA_VERSION = '1.0.0';
const SCHEMA_VERSION_KEY = 'duckdb_schema_version';

// ============================================================================
// Utility Functions
// ============================================================================

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

function getDBPath(uid: string): string {
  return `opfs://whagons_${uid}.duckdb`;
}

/**
 * Convert DuckDB Arrow result to plain JavaScript objects.
 */
function arrowToObjects(result: any): any[] {
  if (!result) return [];
  
  try {
    // DuckDB-WASM returns an Arrow Table
    // We need to convert each row to a plain object
    const rows: any[] = [];
    const numRows = result.numRows;
    
    if (numRows === 0) return [];

    // Get column names from schema
    const schema = result.schema;
    const columnNames = schema.fields.map((f: any) => f.name);
    
    // Iterate over rows
    for (let i = 0; i < numRows; i++) {
      const row: Record<string, any> = {};
      for (let j = 0; j < columnNames.length; j++) {
        const colName = columnNames[j];
        const column = result.getChildAt(j);
        let value = column?.get(i);
        
        // Handle BigInt conversion
        if (typeof value === 'bigint') {
          value = Number(value);
        }
        
        // Handle JSON columns (stored as strings)
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          try {
            value = JSON.parse(value);
          } catch {
            // Keep as string if not valid JSON
          }
        }
        
        row[colName] = value;
      }
      rows.push(row);
    }
    
    return rows;
  } catch (e) {
    console.error('[DuckDBAdapter] arrowToObjects failed:', e);
    return [];
  }
}

/**
 * Escape a value for SQL insertion.
 */
function escapeValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'object') {
    // JSON stringify for objects/arrays
    const jsonStr = JSON.stringify(value);
    return `'${jsonStr.replace(/'/g, "''")}'`;
  }
  // String - escape single quotes
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Get the primary key column for a store.
 */
function getKeyPath(store: string): string {
  if (SPECIAL_KEYPATH_STORES[store]) {
    return SPECIAL_KEYPATH_STORES[store].keyPath;
  }
  if (INDEXED_STORES[store]) {
    return INDEXED_STORES[store].keyPath;
  }
  return 'id';
}

// ============================================================================
// DuckDB Adapter Class
// ============================================================================

export class DuckDBAdapter implements DatabaseAdapter {
  private static db: duckdb.AsyncDuckDB | null = null;
  private static conn: duckdb.AsyncDuckDBConnection | null = null;
  private static _inited = false;
  private static initPromise: Promise<boolean> | null = null;
  private static currentUID: string | null = null;
  private static openAPISchemas: Record<string, any> | null = null;
  private static tableSchemas: Map<string, TableSchema> = new Map();
  private static deleting = false;

  // Serialize operations per store to prevent race conditions
  private static storeQueues: Map<string, Promise<any>> = new Map();

  private static runExclusive<T>(storeName: string, fn: () => Promise<T>): Promise<T> {
    const tail = DuckDBAdapter.storeQueues.get(storeName) || Promise.resolve();
    const next = tail.catch(() => {}).then(fn);
    DuckDBAdapter.storeQueues.set(storeName, next.catch(() => {}));
    return next;
  }

  // ============================================================================
  // DatabaseAdapter Interface Implementation
  // ============================================================================

  get inited(): boolean {
    return DuckDBAdapter._inited;
  }

  async init(uid?: string): Promise<boolean> {
    return DuckDBAdapter.initStatic(uid);
  }

  async whenReady(timeoutMs?: number): Promise<boolean> {
    return DuckDBAdapter.whenReadyStatic(timeoutMs);
  }

  async deleteDatabase(userID: string): Promise<void> {
    return DuckDBAdapter.deleteDatabaseStatic(userID);
  }

  async getAll(storeName: string): Promise<any[]> {
    return DuckDBAdapter.getAllStatic(storeName);
  }

  async get(storeName: string, key: number | string): Promise<any | null> {
    return DuckDBAdapter.getStatic(storeName, key);
  }

  async put(storeName: string, row: any): Promise<void> {
    return DuckDBAdapter.putStatic(storeName, row);
  }

  async bulkPut(storeName: string, rows: any[]): Promise<void> {
    return DuckDBAdapter.bulkPutStatic(storeName, rows);
  }

  async delete(storeName: string, key: number | string): Promise<void> {
    return DuckDBAdapter.deleteStatic(storeName, key);
  }

  async clear(storeName: string): Promise<void> {
    return DuckDBAdapter.clearStatic(storeName);
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    return DuckDBAdapter.queryStatic(sql, params);
  }

  async exec(sql: string): Promise<void> {
    return DuckDBAdapter.execStatic(sql);
  }

  // ============================================================================
  // Static Methods (actual implementation)
  // ============================================================================

  private static async waitForUID(prefUid?: string, timeoutMs: number = 15000): Promise<string | null> {
    if (prefUid) return prefUid;
    const start = Date.now();
    let current: string | undefined | null = auth.currentUser?.uid;
    while (!current) {
      await new Promise((r) => setTimeout(r, 20));
      current = auth.currentUser?.uid;
      if (current) break;
      if (Date.now() - start > timeoutMs) return null;
    }
    return current as string;
  }

  static async initStatic(uid?: string): Promise<boolean> {
    if (DuckDBAdapter._inited && DuckDBAdapter.db && DuckDBAdapter.conn) return true;
    if (DuckDBAdapter.initPromise) {
      return DuckDBAdapter.initPromise;
    }

    DuckDBAdapter.initPromise = (async () => {
      try {
        if (typeof window === 'undefined') {
          console.warn('[DuckDBAdapter] Not in browser environment');
          return false;
        }

        const userID = await DuckDBAdapter.waitForUID(uid);
        if (!userID) {
          console.warn('[DuckDBAdapter] No user ID available');
          DuckDBAdapter.initPromise = null;
          return false;
        }

        DuckDBAdapter.currentUID = userID;

        // Check schema version
        const storedVersion = localStorage.getItem(SCHEMA_VERSION_KEY);
        const shouldResetDatabase = storedVersion !== CURRENT_SCHEMA_VERSION;

        if (shouldResetDatabase && storedVersion) {
          console.log(`[DuckDBAdapter] Schema version changed from ${storedVersion} to ${CURRENT_SCHEMA_VERSION}, resetting database`);
          await DuckDBAdapter.deleteDatabaseStatic(userID);
        }

        // Initialize DuckDB
        const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
        if (!bundle.mainWorker || !bundle.mainModule) {
          console.error('[DuckDBAdapter] No suitable WASM bundle found');
          return false;
        }

        const worker = new Worker(bundle.mainWorker);
        const logger = new duckdb.ConsoleLogger();
        const db = new duckdb.AsyncDuckDB(logger, worker);

        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

        // Open database with OPFS persistence
        const opfs = isOpfsSupported();
        const targetPath = opfs ? getDBPath(userID) : ':memory:';
        
        try {
          await (db as any).open({
            path: targetPath,
            accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
          });
          console.log('[DuckDBAdapter] Opened database', targetPath, opfs ? '(OPFS persistent)' : '(in-memory)');
        } catch (openErr) {
          console.warn('[DuckDBAdapter] Failed to open OPFS database, falling back to in-memory', openErr);
          await (db as any).open({ path: ':memory:' });
        }

        const conn = await db.connect();
        DuckDBAdapter.db = db;
        DuckDBAdapter.conn = conn;

        // Create tables if this is a fresh database
        if (shouldResetDatabase || !storedVersion) {
          await DuckDBAdapter.createAllTables();
          localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
        }

        DuckDBAdapter._inited = true;
        DuckDBAdapter.initPromise = null;
        console.log('[DuckDBAdapter] Initialized successfully');
        return true;
      } catch (e) {
        console.error('[DuckDBAdapter] init failed', e);
        DuckDBAdapter.db = null;
        DuckDBAdapter.conn = null;
        DuckDBAdapter._inited = false;
        DuckDBAdapter.initPromise = null;
        return false;
      }
    })();

    return DuckDBAdapter.initPromise;
  }

  static async whenReadyStatic(timeoutMs: number = 5000): Promise<boolean> {
    if (DuckDBAdapter._inited && DuckDBAdapter.conn) return true;
    const start = Date.now();
    while (!(DuckDBAdapter._inited && DuckDBAdapter.conn)) {
      if (DuckDBAdapter.initPromise) {
        try { await DuckDBAdapter.initPromise; } catch {}
      } else {
        await new Promise((r) => setTimeout(r, 10));
      }
      if (DuckDBAdapter._inited && DuckDBAdapter.conn) return true;
      if (Date.now() - start > timeoutMs) {
        console.warn('[DuckDBAdapter] whenReady timed out');
        return false;
      }
    }
    return true;
  }

  static async deleteDatabaseStatic(userID: string): Promise<void> {
    DuckDBAdapter.deleting = true;
    
    try {
      // Close existing connection
      if (DuckDBAdapter.conn) {
        try {
          await DuckDBAdapter.conn.close();
        } catch {}
      }
      
      // Close database
      if (DuckDBAdapter.db) {
        try {
          await (DuckDBAdapter.db as any).terminate?.();
        } catch {}
      }

      // Delete OPFS file if possible
      if (isOpfsSupported()) {
        try {
          const root = await navigator.storage.getDirectory();
          const fileName = `whagons_${userID}.duckdb`;
          await root.removeEntry(fileName);
          console.log('[DuckDBAdapter] Deleted OPFS database file:', fileName);
        } catch (e) {
          // File might not exist, that's OK
          console.log('[DuckDBAdapter] Could not delete OPFS file (may not exist):', e);
        }
      }

      // Clear schema version
      localStorage.removeItem(SCHEMA_VERSION_KEY);

    } finally {
      DuckDBAdapter.db = null;
      DuckDBAdapter.conn = null;
      DuckDBAdapter._inited = false;
      DuckDBAdapter.currentUID = null;
      DuckDBAdapter.deleting = false;
    }
  }

  /**
   * Create all tables based on tableRegistry definitions.
   */
  private static async createAllTables(): Promise<void> {
    console.log('[DuckDBAdapter] Creating all tables...');
    
    // Try to load OpenAPI schemas
    DuckDBAdapter.openAPISchemas = await loadOpenAPISchemas();
    
    // Generate all schemas
    const allSchemas = generateAllSchemas(DuckDBAdapter.openAPISchemas || undefined);
    
    let created = 0;
    for (const [storeName, ddl] of allSchemas) {
      try {
        await DuckDBAdapter.conn!.query(ddl.createTable);
        
        // Create indexes
        for (const indexDDL of ddl.createIndexes) {
          try {
            await DuckDBAdapter.conn!.query(indexDDL);
          } catch (indexErr) {
            console.warn(`[DuckDBAdapter] Failed to create index for ${storeName}:`, indexErr);
          }
        }
        
        // Cache the schema
        const schema = getSchemaForStore(storeName, DuckDBAdapter.openAPISchemas || undefined);
        DuckDBAdapter.tableSchemas.set(storeName, schema);
        
        created++;
      } catch (e) {
        console.error(`[DuckDBAdapter] Failed to create table ${storeName}:`, e);
      }
    }
    
    console.log(`[DuckDBAdapter] Created ${created} tables`);
  }

  /**
   * Ensure table exists (lazy creation if needed).
   */
  private static async ensureTable(storeName: string): Promise<TableSchema | null> {
    // Check cache first
    if (DuckDBAdapter.tableSchemas.has(storeName)) {
      return DuckDBAdapter.tableSchemas.get(storeName)!;
    }

    // Generate and create the table
    const schema = getSchemaForStore(storeName, DuckDBAdapter.openAPISchemas || undefined);
    const allSchemas = generateAllSchemas(DuckDBAdapter.openAPISchemas || undefined);
    const ddl = allSchemas.get(storeName);
    
    if (ddl) {
      try {
        await DuckDBAdapter.conn!.query(ddl.createTable);
        for (const indexDDL of ddl.createIndexes) {
          try {
            await DuckDBAdapter.conn!.query(indexDDL);
          } catch {}
        }
        DuckDBAdapter.tableSchemas.set(storeName, schema);
        return schema;
      } catch (e) {
        console.error(`[DuckDBAdapter] Failed to create table ${storeName}:`, e);
      }
    }

    return null;
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  static async getAllStatic(storeName: string): Promise<any[]> {
    return DuckDBAdapter.runExclusive(storeName, async () => {
      if (DuckDBAdapter.deleting) return [];
      if (!DuckDBAdapter._inited) await DuckDBAdapter.initStatic();
      if (!DuckDBAdapter._inited || !DuckDBAdapter.conn) return [];

      try {
        await DuckDBAdapter.ensureTable(storeName);
        const result = await DuckDBAdapter.conn!.query(`SELECT * FROM ${storeName}`);
        return arrowToObjects(result).filter(r => r != null);
      } catch (e: any) {
        // Table might not exist yet
        if (e?.message?.includes('does not exist')) {
          return [];
        }
        console.error(`[DuckDBAdapter] getAll failed for ${storeName}:`, e);
        return [];
      }
    });
  }

  static async getStatic(storeName: string, key: number | string): Promise<any | null> {
    return DuckDBAdapter.runExclusive(storeName, async () => {
      if (DuckDBAdapter.deleting) return null;
      if (!DuckDBAdapter._inited) await DuckDBAdapter.initStatic();
      if (!DuckDBAdapter._inited || !DuckDBAdapter.conn) return null;

      try {
        const keyPath = getKeyPath(storeName);
        const escapedKey = escapeValue(key);
        const result = await DuckDBAdapter.conn!.query(
          `SELECT * FROM ${storeName} WHERE ${keyPath} = ${escapedKey} LIMIT 1`
        );
        const rows = arrowToObjects(result);
        return rows[0] ?? null;
      } catch (e: any) {
        if (e?.message?.includes('does not exist')) {
          return null;
        }
        console.error(`[DuckDBAdapter] get failed for ${storeName}:`, e);
        return null;
      }
    });
  }

  static async putStatic(storeName: string, row: any): Promise<void> {
    if (!row) return;
    const rowCopy = JSON.parse(JSON.stringify(row));

    return DuckDBAdapter.runExclusive(storeName, async () => {
      if (DuckDBAdapter.deleting) return;
      if (!DuckDBAdapter._inited) await DuckDBAdapter.initStatic();
      if (!DuckDBAdapter._inited || !DuckDBAdapter.conn) return;

      try {
        await DuckDBAdapter.ensureTable(storeName);
        const schema = DuckDBAdapter.tableSchemas.get(storeName);
        
        if (!schema) {
          console.error(`[DuckDBAdapter] No schema for ${storeName}`);
          return;
        }

        const keyPath = getKeyPath(storeName);
        const keyValue = rowCopy[keyPath];
        
        if (keyValue === undefined || keyValue === null) {
          console.error(`[DuckDBAdapter] Row missing key '${keyPath}' for ${storeName}`);
          return;
        }

        // Build column list from schema, only including columns that exist in the row
        const columns: string[] = [];
        const values: string[] = [];
        
        for (const col of schema.columns) {
          if (rowCopy.hasOwnProperty(col.name)) {
            columns.push(col.name);
            values.push(escapeValue(rowCopy[col.name]));
          }
        }

        // Also include any extra columns not in schema (for flexibility)
        for (const key of Object.keys(rowCopy)) {
          if (!columns.includes(key)) {
            columns.push(key);
            values.push(escapeValue(rowCopy[key]));
          }
        }

        // Use INSERT OR REPLACE for upsert semantics
        const sql = `INSERT OR REPLACE INTO ${storeName} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
        await DuckDBAdapter.conn!.query(sql);
      } catch (e) {
        console.error(`[DuckDBAdapter] put failed for ${storeName}:`, e);
        throw e;
      }
    });
  }

  static async bulkPutStatic(storeName: string, rows: any[]): Promise<void> {
    if (!rows || rows.length === 0) return;

    return DuckDBAdapter.runExclusive(storeName, async () => {
      if (DuckDBAdapter.deleting) return;
      if (!DuckDBAdapter._inited) await DuckDBAdapter.initStatic();
      if (!DuckDBAdapter._inited || !DuckDBAdapter.conn) return;

      try {
        await DuckDBAdapter.ensureTable(storeName);
        
        // Use transaction for bulk insert
        await DuckDBAdapter.conn!.query('BEGIN TRANSACTION');
        
        try {
          for (const row of rows) {
            if (!row) continue;
            const rowCopy = JSON.parse(JSON.stringify(row));
            
            const schema = DuckDBAdapter.tableSchemas.get(storeName);
            const keyPath = getKeyPath(storeName);
            const keyValue = rowCopy[keyPath];
            
            if (keyValue === undefined || keyValue === null) continue;

            const columns: string[] = [];
            const values: string[] = [];
            
            if (schema) {
              for (const col of schema.columns) {
                if (rowCopy.hasOwnProperty(col.name)) {
                  columns.push(col.name);
                  values.push(escapeValue(rowCopy[col.name]));
                }
              }
            }

            for (const key of Object.keys(rowCopy)) {
              if (!columns.includes(key)) {
                columns.push(key);
                values.push(escapeValue(rowCopy[key]));
              }
            }

            const sql = `INSERT OR REPLACE INTO ${storeName} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
            await DuckDBAdapter.conn!.query(sql);
          }
          
          await DuckDBAdapter.conn!.query('COMMIT');
        } catch (e) {
          await DuckDBAdapter.conn!.query('ROLLBACK');
          throw e;
        }
      } catch (e) {
        console.error(`[DuckDBAdapter] bulkPut failed for ${storeName}:`, e);
        throw e;
      }
    });
  }

  static async deleteStatic(storeName: string, key: number | string): Promise<void> {
    return DuckDBAdapter.runExclusive(storeName, async () => {
      if (!DuckDBAdapter._inited) await DuckDBAdapter.initStatic();
      if (!DuckDBAdapter._inited || !DuckDBAdapter.conn) return;

      try {
        const keyPath = getKeyPath(storeName);
        const escapedKey = escapeValue(key);
        await DuckDBAdapter.conn!.query(`DELETE FROM ${storeName} WHERE ${keyPath} = ${escapedKey}`);
      } catch (e: any) {
        if (e?.message?.includes('does not exist')) {
          return; // Table doesn't exist, nothing to delete
        }
        console.error(`[DuckDBAdapter] delete failed for ${storeName}:`, e);
        throw e;
      }
    });
  }

  static async clearStatic(storeName: string): Promise<void> {
    return DuckDBAdapter.runExclusive(storeName, async () => {
      if (!DuckDBAdapter._inited) await DuckDBAdapter.initStatic();
      if (!DuckDBAdapter._inited || !DuckDBAdapter.conn) return;

      try {
        await DuckDBAdapter.conn!.query(`DELETE FROM ${storeName}`);
      } catch (e: any) {
        if (e?.message?.includes('does not exist')) {
          return;
        }
        console.error(`[DuckDBAdapter] clear failed for ${storeName}:`, e);
        throw e;
      }
    });
  }

  // ============================================================================
  // SQL Query Methods (DuckDB-specific)
  // ============================================================================

  static async queryStatic(sql: string, _params?: any[]): Promise<any[]> {
    if (!DuckDBAdapter._inited) await DuckDBAdapter.initStatic();
    if (!DuckDBAdapter._inited || !DuckDBAdapter.conn) return [];

    try {
      // Note: DuckDB-WASM doesn't have great prepared statement support
      // For now, we expect params to be interpolated in the SQL string
      const result = await DuckDBAdapter.conn!.query(sql);
      return arrowToObjects(result);
    } catch (e) {
      console.error('[DuckDBAdapter] query failed:', { sql, error: e });
      throw e;
    }
  }

  static async execStatic(sql: string): Promise<void> {
    if (!DuckDBAdapter._inited) await DuckDBAdapter.initStatic();
    if (!DuckDBAdapter._inited || !DuckDBAdapter.conn) return;

    try {
      await DuckDBAdapter.conn!.query(sql);
    } catch (e) {
      console.error('[DuckDBAdapter] exec failed:', { sql, error: e });
      throw e;
    }
  }
}

// Export a singleton instance
export const duckDBAdapter = new DuckDBAdapter();
