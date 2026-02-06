/**
 * Collection - Optimistic CRUD wrapper over Dexie tables
 * 
 * Provides the same optimistic update pattern as before:
 *   1. Write to Dexie immediately (UI updates via useLiveQuery)
 *   2. Call API in background
 *   3. On success: update with server response
 *   4. On failure: rollback
 * 
 * Usage:
 *   const task = await collections.tasks.add({ title: 'New', workspace_id: 1 });
 *   await collections.tasks.update(task.id, { title: 'Updated' });
 *   await collections.tasks.delete(task.id);
 */

import { Table } from 'dexie';
import { db } from './db';
import { api } from '../api/internalApi';
import { getEndpoint, getTableName } from '../tableRegistry';

type IdType = string | number;

export interface CollectionConfig {
  /** Store name (e.g., 'tasks') */
  store: string;
  /** API endpoint (e.g., '/tasks'), empty string for local-only */
  endpoint: string;
  /** Backend table name for RTL routing (e.g., 'wh_tasks') */
  table: string;
  /** Primary key field, defaults to 'id' */
  idField?: string;
}

export class Collection<T extends Record<string, any> = any> {
  readonly store: string;
  readonly endpoint: string;
  readonly table: string;
  readonly idField: string;

  private get dexieTable(): Table<T> {
    return db.getTable<T>(this.store);
  }

  constructor(config: CollectionConfig) {
    this.store = config.store;
    this.endpoint = config.endpoint;
    this.table = config.table;
    this.idField = config.idField ?? 'id';
  }

  // ==========================================================================
  // READ OPERATIONS (use Dexie directly, works with useLiveQuery)
  // ==========================================================================

  /**
   * Get a single row by ID
   */
  async get(id: IdType): Promise<T | undefined> {
    return this.dexieTable.get(id);
  }

  /**
   * Get all rows
   */
  async getAll(): Promise<T[]> {
    return this.dexieTable.toArray();
  }

  /**
   * Get the Dexie table for use with useLiveQuery
   * 
   * Usage:
   *   const tasks = useLiveQuery(() => 
   *     collections.tasks.query().where('workspace_id').equals(1).toArray()
   *   );
   */
  query(): Table<T> {
    return this.dexieTable;
  }

  /**
   * Count rows
   */
  async count(filters?: Partial<T>): Promise<number> {
    if (!filters || Object.keys(filters).length === 0) {
      return this.dexieTable.count();
    }
    // Simple filter - find first indexed field
    const [key, value] = Object.entries(filters)[0];
    return this.dexieTable.where(key).equals(value).count();
  }

  // ==========================================================================
  // WRITE OPERATIONS (optimistic updates)
  // ==========================================================================

  /**
   * Add a new row with optimistic update
   */
  async add(item: Omit<T, 'id'> & Partial<Pick<T, 'id'>>): Promise<T> {
    // Generate temp ID
    const hasId = (item as any)[this.idField] != null;
    const tempId = hasId 
      ? (item as any)[this.idField] 
      : `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const optimistic = { ...item, [this.idField]: tempId } as T;

    try {
      // 1. Optimistic write to Dexie (triggers useLiveQuery updates)
      await this.dexieTable.put(optimistic);

      // 2. Call API (skip if no endpoint)
      if (!this.endpoint) {
        return optimistic;
      }

      const response = await api.post(this.endpoint, item);
      const saved = this.unwrapResponse(response.data) as T;

      // 3. Replace temp with server data
      await this.dexieTable.delete(tempId);
      await this.dexieTable.put(saved);

      return saved;
    } catch (err) {
      // Rollback: remove optimistic row
      try {
        await this.dexieTable.delete(tempId);
      } catch {}
      throw err;
    }
  }

  /**
   * Update a row with optimistic update
   */
  async update(id: IdType, updates: Partial<T>): Promise<T> {
    // 1. Get current for rollback
    const previous = await this.get(id);
    if (!previous) {
      throw new Error(`[Collection:${this.store}] Cannot update: row ${id} not found`);
    }

    const optimistic = { ...previous, ...updates } as T;

    try {
      // 2. Optimistic write
      await this.dexieTable.put(optimistic);

      // 3. Call API (skip if no endpoint)
      if (!this.endpoint) {
        return optimistic;
      }

      const response = await api.patch(`${this.endpoint}/${id}`, updates);
      const saved = this.unwrapResponse(response.data) as T;

      // 4. Update with server truth
      await this.dexieTable.put(saved);

      return saved;
    } catch (err) {
      // Rollback
      try {
        await this.dexieTable.put(previous);
      } catch {}
      throw err;
    }
  }

  /**
   * Delete a row with optimistic update
   */
  async delete(id: IdType): Promise<void> {
    // 1. Get current for rollback
    const previous = await this.get(id);

    try {
      // 2. Optimistic delete
      await this.dexieTable.delete(id);

      // 3. Call API (skip if no endpoint)
      if (!this.endpoint) {
        return;
      }

      await api.delete(`${this.endpoint}/${id}`);
    } catch (err: any) {
      // 404 means already deleted - treat as success
      if (err?.response?.status === 404) {
        return;
      }

      // Rollback
      if (previous) {
        try {
          await this.dexieTable.put(previous);
        } catch {}
      }
      throw err;
    }
  }

  // ==========================================================================
  // BULK OPERATIONS (for sync stream / RTL)
  // ==========================================================================

  /**
   * Put a row (upsert) - used by sync stream and RTL
   * No API call, just local write
   */
  async put(row: T): Promise<void> {
    // Handle soft-deleted rows
    if (row.deleted_at != null) {
      const id = row[this.idField];
      if (id != null) {
        try {
          await this.dexieTable.delete(id);
        } catch {}
      }
      return;
    }

    await this.dexieTable.put(row);
  }

  /**
   * Bulk put rows - used by sync stream
   * No API call, just local write
   */
  async bulkPut(rows: T[]): Promise<void> {
    if (rows.length === 0) return;

    // Separate soft-deleted rows
    const toDelete = rows.filter(r => r.deleted_at != null);
    const toPut = rows.filter(r => r.deleted_at == null);

    // Delete soft-deleted
    if (toDelete.length > 0) {
      const ids = toDelete.map(r => r[this.idField]).filter(id => id != null);
      if (ids.length > 0) {
        await this.dexieTable.bulkDelete(ids);
      }
    }

    // Bulk put the rest
    if (toPut.length > 0) {
      await this.dexieTable.bulkPut(toPut);
    }
  }

  /**
   * Clear all rows
   */
  async clear(): Promise<void> {
    await this.dexieTable.clear();
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private unwrapResponse(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;

    // Check common wrapper keys
    if (payload.data && typeof payload.data === 'object' && payload.data[this.idField] !== undefined) {
      return payload.data;
    }
    if (payload.row && typeof payload.row === 'object' && payload.row[this.idField] !== undefined) {
      return payload.row;
    }

    // If payload itself has an ID, it's the entity
    if (payload[this.idField] !== undefined) {
      return payload;
    }

    return payload;
  }
}
