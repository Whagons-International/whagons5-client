import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  FieldType,
  getTaskCreationHistory,
  trackSelection as trackSelectionUtil,
  trackSelections as trackSelectionsUtil,
  toggleFavorite as toggleFavoriteUtil,
  isFavorite as isFavoriteUtil,
  getFavorites as getFavoritesUtil,
  getRecent as getRecentUtil,
  TaskCreationHistory,
} from '@/utils/taskCreationPreferences';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

export interface GroupedOptions {
  favorites: ComboboxOption[];
  recent: ComboboxOption[];
  all: ComboboxOption[];
}

/**
 * Hook to manage task creation history (favorites & recent) for a workspace
 */
export function useTaskCreationHistory(workspaceId: number | null | undefined) {
  // State to trigger re-renders when history changes
  const [historyVersion, setHistoryVersion] = useState(0);

  // Load history on mount and when workspace changes
  const history = useMemo<TaskCreationHistory | null>(() => {
    if (!workspaceId) return null;
    // historyVersion is used to trigger recalculation when history changes
    void historyVersion;
    return getTaskCreationHistory(workspaceId);
  }, [workspaceId, historyVersion]);

  // Reset version when workspace changes
  useEffect(() => {
    setHistoryVersion(0);
  }, [workspaceId]);

  /**
   * Track a single selection (adds to recent)
   */
  const trackSelection = useCallback(
    (field: FieldType, id: number) => {
      if (!workspaceId) return;
      trackSelectionUtil(workspaceId, field, id);
      setHistoryVersion(v => v + 1);
    },
    [workspaceId]
  );

  /**
   * Track multiple selections at once
   */
  const trackSelections = useCallback(
    (field: FieldType, ids: number[]) => {
      if (!workspaceId) return;
      trackSelectionsUtil(workspaceId, field, ids);
      setHistoryVersion(v => v + 1);
    },
    [workspaceId]
  );

  /**
   * Toggle favorite status for an item
   */
  const toggleFavorite = useCallback(
    (field: FieldType, id: number): boolean => {
      if (!workspaceId) return false;
      const result = toggleFavoriteUtil(workspaceId, field, id);
      setHistoryVersion(v => v + 1);
      return result;
    },
    [workspaceId]
  );

  /**
   * Check if an item is favorited
   */
  const isFavorite = useCallback(
    (field: FieldType, id: number): boolean => {
      if (!workspaceId) return false;
      return isFavoriteUtil(workspaceId, field, id);
    },
    [workspaceId]
  );

  /**
   * Get favorites for a field
   */
  const getFavorites = useCallback(
    (field: FieldType): number[] => {
      if (!workspaceId) return [];
      return getFavoritesUtil(workspaceId, field);
    },
    [workspaceId]
  );

  /**
   * Get recent selections for a field
   */
  const getRecent = useCallback(
    (field: FieldType): number[] => {
      if (!workspaceId) return [];
      return getRecentUtil(workspaceId, field);
    },
    [workspaceId]
  );

  /**
   * Build grouped options for a combobox
   * Returns favorites, recent (excluding favorites), and all options
   */
  const getGroupedOptions = useCallback(
    <T extends { id: number; name?: string }>(
      field: FieldType,
      allItems: T[],
      labelFn?: (item: T) => string,
      descriptionFn?: (item: T) => string | undefined
    ): GroupedOptions => {
      if (!workspaceId || !allItems?.length) {
        return { favorites: [], recent: [], all: [] };
      }

      const favoriteIds = getFavoritesUtil(workspaceId, field);
      const recentIds = getRecentUtil(workspaceId, field);

      const itemMap = new Map(allItems.map(item => [item.id, item]));
      const getLabel = labelFn || ((item: T) => item.name || `Item ${item.id}`);
      const getDescription = descriptionFn || (() => undefined);

      const toOption = (item: T): ComboboxOption => ({
        value: String(item.id),
        label: getLabel(item),
        description: getDescription(item),
      });

      // Favorites - only include items that exist in allItems
      const favorites = favoriteIds
        .map(id => itemMap.get(id))
        .filter((item): item is T => !!item)
        .map(toOption);

      // Recent - exclude favorites, only include items that exist
      const recentExcludingFavorites = recentIds
        .filter(id => !favoriteIds.includes(id))
        .map(id => itemMap.get(id))
        .filter((item): item is T => !!item)
        .map(toOption);

      // All options
      const all = allItems.map(toOption);

      return {
        favorites,
        recent: recentExcludingFavorites,
        all,
      };
    },
    [workspaceId]
  );

  /**
   * Build grouped options for multi-select (users, tags)
   * Similar to getGroupedOptions but for number[] values
   */
  const getGroupedMultiOptions = useCallback(
    <T extends { id: number; name?: string }>(
      field: FieldType,
      allItems: T[],
      labelFn?: (item: T) => string
    ): GroupedOptions => {
      return getGroupedOptions(field, allItems, labelFn);
    },
    [getGroupedOptions]
  );

  return {
    // State
    history,
    workspaceId,

    // Actions
    trackSelection,
    trackSelections,
    toggleFavorite,

    // Queries
    isFavorite,
    getFavorites,
    getRecent,

    // Helpers
    getGroupedOptions,
    getGroupedMultiOptions,
  };
}

export type UseTaskCreationHistoryReturn = ReturnType<typeof useTaskCreationHistory>;
