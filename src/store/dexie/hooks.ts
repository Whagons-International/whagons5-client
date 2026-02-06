/**
 * Dexie React Hooks
 * 
 * These hooks provide a similar interface to the old Redux useSelector pattern,
 * making migration easier. They use useLiveQuery under the hood for reactivity.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

/**
 * Hook to get all rows from a Dexie table
 * 
 * Usage (replaces useSelector for data tables):
 *   // Before: const statuses = useSelector((s: RootState) => s.statuses.value);
 *   // After:
 *   const statuses = useTable('statuses');
 */
export function useTable<T = any>(storeName: string): T[] {
  const data = useLiveQuery(
    () => db.table<T>(storeName).toArray(),
    [storeName]
  );
  return data ?? [];
}

/**
 * Hook to get rows from a table with a simple filter
 * 
 * Usage:
 *   const workspaceTasks = useTableWhere('tasks', 'workspace_id', 123);
 */
export function useTableWhere<T = any>(
  storeName: string, 
  indexName: string, 
  value: any
): T[] {
  const data = useLiveQuery(
    () => db.table<T>(storeName).where(indexName).equals(value).toArray(),
    [storeName, indexName, value]
  );
  return data ?? [];
}

/**
 * Hook to get a single row by ID
 * 
 * Usage:
 *   const task = useTableGet('tasks', taskId);
 */
export function useTableGet<T = any>(
  storeName: string,
  id: string | number | undefined
): T | undefined {
  const data = useLiveQuery(
    () => id != null ? db.table<T>(storeName).get(id) : undefined,
    [storeName, id]
  );
  return data;
}

/**
 * Hook to count rows in a table
 */
export function useTableCount(storeName: string): number {
  const count = useLiveQuery(
    () => db.table(storeName).count(),
    [storeName]
  );
  return count ?? 0;
}

// Convenience hooks for common tables
export const useStatuses = () => useTable('statuses');
export const usePriorities = () => useTable('priorities');
export const useCategories = () => useTable('categories');
export const useWorkspaces = () => useTable('workspaces');
export const useUsers = () => useTable('users');
export const useTeams = () => useTable('teams');
export const useTags = () => useTable('tags');
export const useSpots = () => useTable('spots');
export const useTemplates = () => useTable('templates');
export const useCustomFields = () => useTable('custom_fields');
export const useNotifications = () => useTable('notifications');
