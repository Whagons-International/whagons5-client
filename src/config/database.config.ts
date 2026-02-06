/**
 * Database Configuration
 * 
 * Central configuration for the database layer.
 * Edit this file to control database behavior.
 */

export const databaseConfig = {
  /**
   * Which database backend to use.
   * 
   * Options:
   * - 'auto': Use DuckDB if OPFS is available, otherwise IndexedDB (default)
   * - 'duckdb': Force DuckDB (falls back to IndexedDB if OPFS unavailable)
   * - 'indexeddb': Force IndexedDB (ignore DuckDB entirely)
   * 
   * Backend now generates proper OpenAPI schemas via `php artisan api:export-spec`.
   * DuckDB uses these schemas to create properly typed tables.
   */
  backend: 'auto' as 'auto' | 'duckdb' | 'indexeddb',

  /**
   * Schema version for DuckDB.
   * Bump this to force a fresh database on next load.
   */
  schemaVersion: '1.0.0',

  /**
   * Enable debug logging for database operations.
   */
  debug: {
    /** Log SQL queries when using DuckDB */
    sql: false,
    /** Log all database operations (get, put, delete, etc.) */
    operations: false,
    /** Log schema creation */
    schema: false,
  },
} as const;

// Type export for use elsewhere
export type DatabaseBackend = typeof databaseConfig.backend;
