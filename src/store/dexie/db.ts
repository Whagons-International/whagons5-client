/**
 * Dexie Database Definition
 */

import Dexie, { Table } from 'dexie';
import {
  SIMPLE_STORES,
  INDEXED_STORES,
  SPECIAL_KEYPATH_STORES,
} from '../tableRegistry';

// Database version - bump when schema changes
const DB_VERSION = 1;

/**
 * Build Dexie schema string from our registry
 */
function buildSchema(): Record<string, string> {
  const schema: Record<string, string> = {};

  // Simple stores: just primary key 'id'
  for (const store of SIMPLE_STORES) {
    schema[store] = 'id';
  }

  // Indexed stores: primary key + indexes
  for (const [store, def] of Object.entries(INDEXED_STORES)) {
    const parts = [def.keyPath];
    for (const idx of def.indexes) {
      if (idx.unique) {
        parts.push(`&${idx.keyPath}`);
      } else {
        parts.push(idx.keyPath);
      }
    }
    schema[store] = parts.join(', ');
  }

  // Special keypath stores
  for (const [store, def] of Object.entries(SPECIAL_KEYPATH_STORES)) {
    schema[store] = def.keyPath;
  }

  // Add common indexes for frequently queried tables
  schema['tasks'] = 'id, workspace_id, status_id, category_id, user_id, created_at, updated_at';
  schema['statuses'] = 'id, workspace_id, category_id';
  schema['categories'] = 'id, workspace_id';
  schema['users'] = 'id, email';
  schema['teams'] = 'id, workspace_id';
  schema['tags'] = 'id, workspace_id';
  schema['spots'] = 'id, workspace_id, spot_type_id';
  schema['task_users'] = 'id, task_id, user_id';
  schema['task_tags'] = 'id, task_id, tag_id';

  // Local-only caches
  schema['tenant_availability'] = 'tenantName';
  schema['avatars'] = 'key';

  return schema;
}

/**
 * The Dexie database class
 */
class WhagonsDB extends Dexie {
  constructor() {
    super('whagons');
    const schema = buildSchema();
    this.version(DB_VERSION).stores(schema);
  }

  getTable<T = any>(storeName: string): Table<T> {
    return this.table(storeName);
  }
}

// Single database instance
export const db = new WhagonsDB();

/**
 * Clear all data (for logout)
 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });
  console.log('[Dexie] Cleared all data');
}

// Re-export Dexie utilities
export { liveQuery } from 'dexie';
export { useLiveQuery } from 'dexie-react-hooks';
