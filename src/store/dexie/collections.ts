/**
 * Collections - Auto-generated Collection instances for all tables
 * 
 * Usage:
 *   import { collections, useLiveQuery } from '@/store/dexie';
 *   
 *   // Reactive query
 *   const tasks = useLiveQuery(() => 
 *     collections.tasks.query()
 *       .where('workspace_id').equals(workspaceId)
 *       .toArray()
 *   , [workspaceId]);
 *   
 *   // Optimistic CRUD
 *   await collections.tasks.add({ title: 'New', workspace_id: 1 });
 *   await collections.tasks.update(123, { title: 'Updated' });
 *   await collections.tasks.delete(123);
 */

import { Collection, CollectionConfig } from './Collection';
import {
  GENERIC_SLICE_STORES,
  SIMPLE_STORES,
  INDEXED_STORES,
  getTableName,
  getEndpoint,
  toCamelCase,
} from '../tableRegistry';

// Get all store names (union of all registry arrays)
const ALL_STORES = [
  ...new Set([
    ...SIMPLE_STORES,
    ...Object.keys(INDEXED_STORES),
    ...GENERIC_SLICE_STORES,
  ])
];

// Type for collection names (camelCase versions of store names)
type StoreNames = typeof ALL_STORES[number];
type CamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<CamelCase<U>>}`
  : S;

type Collections = {
  [K in StoreNames as CamelCase<K>]: Collection;
};

/**
 * Create a Collection from a store name
 */
function createCollectionFromStore(storeName: string): Collection {
  const config: CollectionConfig = {
    store: storeName,
    table: getTableName(storeName),
    endpoint: getEndpoint(storeName),
  };
  return new Collection(config);
}

/**
 * Create all collections
 */
function createAllCollections(): Collections {
  const result: Record<string, Collection> = {};

  for (const storeName of ALL_STORES) {
    const camelName = toCamelCase(storeName);
    result[camelName] = createCollectionFromStore(storeName);
  }

  return result as Collections;
}

/**
 * All collections, keyed by camelCase name
 */
export const collections = createAllCollections();

/**
 * Get a collection by snake_case store name
 */
export function getCollection(storeName: string): Collection | undefined {
  const camelName = toCamelCase(storeName);
  return (collections as Record<string, Collection>)[camelName];
}

/**
 * Get a collection by backend table name (e.g., 'wh_tasks')
 */
export function getCollectionByTable(tableName: string): Collection | undefined {
  for (const storeName of ALL_STORES) {
    if (getTableName(storeName) === tableName) {
      return getCollection(storeName);
    }
  }
  return undefined;
}

/**
 * Create a custom collection (for tables not in the registry)
 */
export function createCollection<T extends Record<string, any> = any>(
  config: CollectionConfig
): Collection<T> {
  return new Collection<T>(config);
}

// =============================================================================
// Integration with sync stream / RTL
// =============================================================================

/**
 * Handle incoming data from sync stream
 */
export async function handleSyncData(
  tableName: string,
  rows: any | any[]
): Promise<void> {
  const collection = getCollectionByTable(tableName);
  if (!collection) {
    console.warn(`[collections] No collection for table: ${tableName}`);
    return;
  }

  if (Array.isArray(rows)) {
    await collection.bulkPut(rows);
  } else {
    await collection.put(rows);
  }
}

/**
 * Handle RTL mutation (real-time from WebSocket)
 */
export async function handleRTLMutation(
  tableName: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  row: any
): Promise<void> {
  const collection = getCollectionByTable(tableName);
  if (!collection) return;

  switch (operation) {
    case 'INSERT':
    case 'UPDATE':
      await collection.put(row);
      break;
    case 'DELETE':
      if (row?.id != null) {
        try {
          // Direct delete from Dexie table (no API call - already deleted on server)
          const { db } = await import('./db');
          await db.table(collection.store).delete(row.id);
        } catch {}
      }
      break;
  }
}

// =============================================================================
// Convenience exports for common collections
// =============================================================================

export const tasks = collections.tasks;
export const statuses = collections.statuses;
export const categories = collections.categories;
export const workspaces = collections.workspaces;
export const users = collections.users;
export const teams = collections.teams;
export const tags = collections.tags;
export const priorities = collections.priorities;
export const spots = collections.spots;
