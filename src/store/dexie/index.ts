/**
 * Dexie-based Data Layer
 * 
 * This module replaces Redux + DuckDB/IndexedDB with a simpler stack:
 * - Dexie for IndexedDB access
 * - useLiveQuery for reactive queries (automatic re-render on data change)
 * - Collection wrappers for optimistic CRUD
 * 
 * Usage:
 * 
 *   import { useLiveQuery, collections } from '@/store/dexie';
 *   
 *   function TaskList({ workspaceId }) {
 *     // Reactive query - re-renders when data changes
 *     const tasks = useLiveQuery(
 *       () => collections.tasks.query()
 *         .where('workspace_id').equals(workspaceId)
 *         .toArray(),
 *       [workspaceId]
 *     );
 *     
 *     // Optimistic CRUD
 *     const handleAdd = async () => {
 *       await collections.tasks.add({ 
 *         title: 'New Task', 
 *         workspace_id: workspaceId 
 *       });
 *       // UI updates automatically via useLiveQuery
 *     };
 *     
 *     if (!tasks) return <Loading />;
 *     return <ul>{tasks.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
 *   }
 * 
 *   // Direct Dexie access for complex queries
 *   import { db } from '@/store/dexie';
 *   
 *   const count = await db.table('tasks')
 *     .where('workspace_id').equals(1)
 *     .and(t => t.status_id === 2)
 *     .count();
 */

// Database
export { db, liveQuery, clearAllData } from './db';

// React hooks (re-exported from dexie-react-hooks)
export { useLiveQuery } from 'dexie-react-hooks';

// Collection class
export { Collection, type CollectionConfig } from './Collection';

// Pre-built collections
export {
  collections,
  getCollection,
  getCollectionByTable,
  createCollection,
  handleSyncData,
  handleRTLMutation,
  // Convenience exports
  tasks,
  statuses,
  categories,
  workspaces,
  users,
  teams,
  tags,
  priorities,
  spots,
} from './collections';

// Data sync
export { DataManager, getDataManager } from './DataManager';

// RTL integration
export { handleRTLPublication, setupRTLDexieHandler } from './rtlHandler';

// Task query helpers (replaces TasksCache.queryTasks)
export { 
  queryTasks, 
  getTask, 
  getTaskCount,
  getTasksByStatus,
  getTasksByWorkspace,
  type QueryTasksParams,
  type QueryTasksResult,
} from './queryTasks';

// React hooks (replacements for Redux useSelector)
export {
  useTable,
  useTableWhere,
  useTableGet,
  useTableCount,
  // Convenience hooks
  useStatuses,
  usePriorities,
  useCategories,
  useWorkspaces,
  useUsers,
  useTeams,
  useTags,
  useSpots,
  useTemplates,
  useCustomFields,
  useNotifications,
} from './hooks';

// Tenant availability hook
export { useTenantAvailability } from './useTenantAvailability';
