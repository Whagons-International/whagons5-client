/**
 * Database adapter types for IndexedDB/DuckDB abstraction layer.
 * 
 * This provides a common interface that both IndexedDB and DuckDB
 * can implement, allowing seamless switching between backends.
 */

export interface DatabaseAdapter {
  /** Whether the database has been initialized */
  inited: boolean;

  /**
   * Initialize the database for the given user.
   * @param uid - Firebase user ID (used for per-user database isolation)
   */
  init(uid?: string): Promise<boolean>;

  /**
   * Wait for the database to be ready.
   * @param timeoutMs - Maximum time to wait (default 5000ms)
   */
  whenReady(timeoutMs?: number): Promise<boolean>;

  /**
   * Delete the database for the given user.
   * @param userID - Firebase user ID
   */
  deleteDatabase(userID: string): Promise<void>;

  /**
   * Get all rows from a store/table.
   * @param storeName - The store/table name
   */
  getAll(storeName: string): Promise<any[]>;

  /**
   * Get a single row by primary key.
   * @param storeName - The store/table name
   * @param key - The primary key value
   */
  get(storeName: string, key: number | string): Promise<any | null>;

  /**
   * Insert or update a row (upsert).
   * @param storeName - The store/table name
   * @param row - The row data (must include primary key)
   */
  put(storeName: string, row: any): Promise<void>;

  /**
   * Bulk insert or update multiple rows.
   * @param storeName - The store/table name
   * @param rows - Array of row data
   */
  bulkPut(storeName: string, rows: any[]): Promise<void>;

  /**
   * Delete a row by primary key.
   * @param storeName - The store/table name
   * @param key - The primary key value
   */
  delete(storeName: string, key: number | string): Promise<void>;

  /**
   * Delete all rows from a store/table.
   * @param storeName - The store/table name
   */
  clear(storeName: string): Promise<void>;

  // ============================================================================
  // DuckDB-specific methods (optional for IndexedDB fallback)
  // ============================================================================

  /**
   * Execute a raw SQL query and return results.
   * Only available when using DuckDB backend.
   * @param sql - SQL query string
   * @param params - Query parameters (for prepared statements)
   */
  query?(sql: string, params?: any[]): Promise<any[]>;

  /**
   * Execute a raw SQL statement (DDL/DML) without returning results.
   * Only available when using DuckDB backend.
   * @param sql - SQL statement
   */
  exec?(sql: string): Promise<void>;
}

// ============================================================================
// Schema types for DuckDB table generation
// ============================================================================

export type DuckDBColumnType = 
  | 'INTEGER' 
  | 'BIGINT'
  | 'VARCHAR' 
  | 'TEXT' 
  | 'BOOLEAN' 
  | 'TIMESTAMP' 
  | 'DATE'
  | 'DOUBLE'
  | 'JSON';

export interface ColumnDef {
  name: string;
  type: DuckDBColumnType;
  nullable?: boolean;
  primaryKey?: boolean;
}

export interface IndexDef {
  name: string;
  columns: string[];
  unique?: boolean;
}

export interface TableSchema {
  /** Store/table name (e.g., 'tasks', 'statuses') */
  name: string;
  /** Column definitions */
  columns: ColumnDef[];
  /** Primary key column name */
  primaryKey: string;
  /** Optional indexes */
  indexes?: IndexDef[];
}

// ============================================================================
// OpenAPI schema types (for parsing api-docs.json)
// ============================================================================

export interface OpenAPISchema {
  type: string;
  format?: string;
  properties?: Record<string, OpenAPIProperty>;
  required?: string[];
  title?: string;
}

export interface OpenAPIProperty {
  type: string;
  format?: string;
  nullable?: boolean;
  example?: any;
}

export interface OpenAPIDocument {
  components?: {
    schemas?: Record<string, OpenAPISchema>;
  };
}
