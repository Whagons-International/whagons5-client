/**
 * Task Creation Preferences - localStorage utilities for tracking
 * favorites and recent selections in task creation dialogs.
 * 
 * Data is stored per-workspace to support different workflows.
 */

export type FieldType = 'templates' | 'categories' | 'priorities' | 'spots' | 'users' | 'tags';

export interface TaskCreationHistory {
  favorites: Record<FieldType, number[]>;
  recent: Record<FieldType, number[]>;
  lastUpdated: string;
}

const STORAGE_KEY_PREFIX = 'wh_task_creation_history_';
const MAX_RECENT_ITEMS = 5;

/**
 * Get the localStorage key for a workspace
 */
function getStorageKey(workspaceId: number): string {
  return `${STORAGE_KEY_PREFIX}${workspaceId}`;
}

/**
 * Create empty history structure
 */
function createEmptyHistory(): TaskCreationHistory {
  return {
    favorites: {
      templates: [],
      categories: [],
      priorities: [],
      spots: [],
      users: [],
      tags: [],
    },
    recent: {
      templates: [],
      categories: [],
      priorities: [],
      spots: [],
      users: [],
      tags: [],
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get task creation history for a workspace
 */
export function getTaskCreationHistory(workspaceId: number): TaskCreationHistory {
  try {
    const key = getStorageKey(workspaceId);
    const stored = localStorage.getItem(key);
    if (!stored) return createEmptyHistory();
    
    const parsed = JSON.parse(stored);
    
    // Ensure all fields exist (migration safety)
    const history = createEmptyHistory();
    if (parsed.favorites) {
      for (const field of Object.keys(history.favorites) as FieldType[]) {
        if (Array.isArray(parsed.favorites[field])) {
          history.favorites[field] = parsed.favorites[field];
        }
      }
    }
    if (parsed.recent) {
      for (const field of Object.keys(history.recent) as FieldType[]) {
        if (Array.isArray(parsed.recent[field])) {
          history.recent[field] = parsed.recent[field].slice(0, MAX_RECENT_ITEMS);
        }
      }
    }
    if (parsed.lastUpdated) {
      history.lastUpdated = parsed.lastUpdated;
    }
    
    return history;
  } catch {
    return createEmptyHistory();
  }
}

/**
 * Save task creation history for a workspace
 */
export function saveTaskCreationHistory(workspaceId: number, history: TaskCreationHistory): void {
  try {
    const key = getStorageKey(workspaceId);
    history.lastUpdated = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(history));
  } catch (e) {
    console.warn('[TaskCreationPreferences] Failed to save history:', e);
  }
}

/**
 * Track a selection - adds to recent list
 */
export function trackSelection(workspaceId: number, field: FieldType, id: number): void {
  if (!id || !Number.isFinite(id)) return;
  
  const history = getTaskCreationHistory(workspaceId);
  
  // Remove if already exists, then add to front
  const recent = history.recent[field].filter(x => x !== id);
  recent.unshift(id);
  
  // Keep only MAX_RECENT_ITEMS
  history.recent[field] = recent.slice(0, MAX_RECENT_ITEMS);
  
  saveTaskCreationHistory(workspaceId, history);
}

/**
 * Track multiple selections at once (e.g., for multi-select fields)
 */
export function trackSelections(workspaceId: number, field: FieldType, ids: number[]): void {
  if (!ids || ids.length === 0) return;
  
  const history = getTaskCreationHistory(workspaceId);
  
  // Add each id to recent (most recent first)
  let recent = [...history.recent[field]];
  for (const id of ids) {
    if (!id || !Number.isFinite(id)) continue;
    recent = recent.filter(x => x !== id);
    recent.unshift(id);
  }
  
  // Keep only MAX_RECENT_ITEMS
  history.recent[field] = recent.slice(0, MAX_RECENT_ITEMS);
  
  saveTaskCreationHistory(workspaceId, history);
}

/**
 * Toggle favorite status for an item
 */
export function toggleFavorite(workspaceId: number, field: FieldType, id: number): boolean {
  if (!id || !Number.isFinite(id)) return false;
  
  const history = getTaskCreationHistory(workspaceId);
  const favorites = history.favorites[field];
  const index = favorites.indexOf(id);
  
  let isFavorite: boolean;
  if (index >= 0) {
    // Remove from favorites
    favorites.splice(index, 1);
    isFavorite = false;
  } else {
    // Add to favorites
    favorites.push(id);
    isFavorite = true;
  }
  
  saveTaskCreationHistory(workspaceId, history);
  return isFavorite;
}

/**
 * Check if an item is favorited
 */
export function isFavorite(workspaceId: number, field: FieldType, id: number): boolean {
  const history = getTaskCreationHistory(workspaceId);
  return history.favorites[field].includes(id);
}

/**
 * Get favorites for a field
 */
export function getFavorites(workspaceId: number, field: FieldType): number[] {
  const history = getTaskCreationHistory(workspaceId);
  return [...history.favorites[field]];
}

/**
 * Get recent selections for a field
 */
export function getRecent(workspaceId: number, field: FieldType): number[] {
  const history = getTaskCreationHistory(workspaceId);
  return [...history.recent[field]];
}

/**
 * Clear all history for a workspace
 */
export function clearHistory(workspaceId: number): void {
  try {
    const key = getStorageKey(workspaceId);
    localStorage.removeItem(key);
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all task creation history across all workspaces
 */
export function clearAllHistory(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // Ignore errors
  }
}
