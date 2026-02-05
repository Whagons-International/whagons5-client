import { combineReducers } from "@reduxjs/toolkit";
import { createGenericSlices, GenericEvents } from "./genericSliceFactory";
import type { GenericSliceActions } from "./genericSliceFactory";
import { 
  GENERIC_SLICE_STORES, 
  toCamelCase, 
  getTableName, 
  getEndpoint 
} from "./tableRegistry";

// ============================================================================
// BUILD CONFIGURATIONS FROM TABLE REGISTRY
// ============================================================================
// The table registry (tableRegistry.ts) is the single source of truth.
// We derive everything from the snake_case store names defined there.

const genericSliceConfigs = GENERIC_SLICE_STORES.map(store => ({
  name: toCamelCase(store),      // 'spot_custom_fields' → 'spotCustomFields'
  table: getTableName(store),    // 'spot_custom_fields' → 'wh_spot_custom_fields'
  endpoint: getEndpoint(store),  // 'spot_custom_fields' → '/spot-custom-fields'
  store,                         // 'spot_custom_fields' (unchanged)
}));

// Create all generic slices at once
export const genericSlices = createGenericSlices(genericSliceConfigs);

// ============================================================================
// EXPORTS - All derived via loops
// ============================================================================

// Export individual caches for CacheRegistry
export const genericCaches = genericSlices.caches;

// Combine all reducers
export const genericReducers = combineReducers(genericSlices.reducers);

// Export event system for generic slices
export { GenericEvents as genericEvents } from './genericSliceFactory';

// Auto-generate eventNames from the slices
export const genericEventNames = Object.fromEntries(
  GENERIC_SLICE_STORES.map(store => {
    const name = toCamelCase(store);
    return [name, genericSlices.slices[name].eventNames];
  })
) as Record<string, { CREATED: string; UPDATED: string; DELETED: string; BULK_UPDATE: string; CACHE_INVALIDATE: string }>;

// Export actions for each slice
type PublicGenericSliceActions<T = any> = Omit<GenericSliceActions<T>, "getFromIndexedDB" | "fetchFromAPI">;

function publicActions<T>(actions: GenericSliceActions<T>): PublicGenericSliceActions<T> {
  const { getFromIndexedDB: _getFromIndexedDB, fetchFromAPI: _fetchFromAPI, ...rest } = actions as any;
  return rest;
}

/**
 * Internal-only actions (store layer).
 * Includes `getFromIndexedDB` and `fetchFromAPI` for login hydration/repair flows.
 */
export const genericInternalActions = Object.fromEntries(
  GENERIC_SLICE_STORES.map(store => {
    const name = toCamelCase(store);
    return [name, genericSlices.slices[name].actions];
  })
) as Record<string, GenericSliceActions>;

/**
 * Public actions (UI layer).
 * Intentionally excludes `getFromIndexedDB` and `fetchFromAPI` to prevent ad-hoc hydration/fetching.
 */
export const genericActions = Object.fromEntries(
  GENERIC_SLICE_STORES.map(store => {
    const name = toCamelCase(store);
    return [name, publicActions(genericSlices.slices[name].actions)];
  })
) as Record<string, PublicGenericSliceActions>;
