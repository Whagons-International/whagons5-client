import { TasksCache } from "./TasksCache";
import { isTaskVisibleForUser } from "@/hooks/useSpotVisibility";
import { getSpotVisibilityState } from "../spotVisibilityState";

// Import generic caches (handles all CRUD tables except tasks)
import { genericCaches } from "../genericSlices";
// Import Redux store and actions
import { store } from "../store";
import { genericInternalActions } from "../genericSlices";
import { getTasksFromIndexedDB } from "../reducers/tasksSlice";

import { Logger } from '@/utils/logger';
/**
 * Check if a task is visible to the current user based on spot assignments.
 * Reads auth user info from the module-level spot visibility state
 * (updated by AuthProvider) and spots from the Redux store.
 */
function isTaskVisibleForCurrentUser(task: any): boolean {
	const state = store.getState();
	const { userSpots, isAdmin } = getSpotVisibilityState();
	const allSpots = (state as any)?.spots?.value ?? [];
	return isTaskVisibleForUser(task, userSpots, isAdmin, allSpots);
}

type CacheHandler = {
	add: (row: any) => Promise<void>;
	update: (id: number | string, row: any) => Promise<void>;
	remove: (id: number | string) => Promise<void>;
	getAll: () => Promise<any[]>;
};

const cacheByTable: Record<string, CacheHandler> = {
	// Only custom cache with advanced features (tasks)
	// Spot-based visibility: skip adding/updating tasks the user shouldn't see
	wh_tasks: {
		add: async (row) => {
			if (!isTaskVisibleForCurrentUser(row)) return;
			await TasksCache.addTask(row);
		},
		update: async (id, row) => {
			if (!isTaskVisibleForCurrentUser(row)) {
				// Task moved to a spot the user can't see — remove it locally
				await TasksCache.deleteTask(String(id));
				return;
			}
			await TasksCache.updateTask(String(id), row);
		},
		remove: (id) => TasksCache.deleteTask(String(id)),
		getAll: () => TasksCache.getTasks(),
	},

	// All other tables (30+ tables) handled by generic caches
	...Object.entries(genericCaches).reduce((acc, [_key, cache]) => ({
		...acc,
		[cache.getTableName()]: {
			add: (row: any) => cache.add(row),
			update: (id: number | string, row: any) => cache.update(id, row),
			remove: (id: number | string) => cache.remove(id),
			getAll: () => cache.getAll(),
		},
	}), {}),
};

// Sync handlers: re-load Redux slice state from IndexedDB
type SyncHandler = () => Promise<void>;

const syncByTable: Record<string, SyncHandler> = {
	// Tasks use custom thunk
	wh_tasks: async () => { await store.dispatch(getTasksFromIndexedDB()); },

	// All other tables handled by generic slices
	...Object.entries(genericCaches).reduce((acc, [key, cache]) => {
		const tableName = cache.getTableName();
		const actions = genericInternalActions[key as keyof typeof genericInternalActions];
		if (actions && (actions as any).getFromIndexedDB) {
			return {
				...acc,
				[tableName]: async () => { await store.dispatch((actions as any).getFromIndexedDB()); },
			};
		}
		return acc;
	}, {}),
};

export function getCacheForTable(table: string): CacheHandler | null {
	return cacheByTable[table] ?? null;
}

export async function syncReduxForTable(table: string): Promise<void> {
	const sync = syncByTable[table];
	if (sync) {
		try {
			await sync();
		} catch (error) {
			Logger.error('cache', 'CacheRegistry: Error syncing Redux for table:', table, error);
		}
	} else {
		Logger.warn('cache', 'CacheRegistry: No sync handler found for table:', table);
	}
}


