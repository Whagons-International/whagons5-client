/**
 * Hook for imperative handle methods (exposed via ref)
 */

import { useImperativeHandle } from 'react';
import { WorkspaceTableHandle } from '../types';

export function useImperativeHandleMethods(
  ref: React.ForwardedRef<WorkspaceTableHandle>,
  opts: {
    gridRef: React.RefObject<any>;
    applyFilterModelToGrid: (opts: { api: any; model: any; onFiltersChanged?: (active: boolean) => void; onAfterApplied?: () => void }) => void;
    refreshGrid: () => void;
    onFiltersChanged?: (active: boolean) => void;
  }
) {
  const { gridRef, applyFilterModelToGrid, refreshGrid, onFiltersChanged } = opts;

  useImperativeHandle(ref, () => ({
    clearFilters: () => {
      const api = gridRef.current?.api;
      if (!api || api.isDestroyed?.()) return;
      applyFilterModelToGrid({
        api,
        model: null,
        onFiltersChanged,
        onAfterApplied: refreshGrid,
      });
    },
    hasFilters: () => {
      try {
        const api = gridRef.current?.api;
        if (!api || api.isDestroyed?.()) return false;
        return !!api.isAnyFilterPresent?.();
      } catch { return false; }
    },
    setFilterModel: (model: any) => {
      const api = gridRef.current?.api;
      if (!api || api.isDestroyed?.()) return;
      applyFilterModelToGrid({
        api,
        model,
        onFiltersChanged,
        onAfterApplied: refreshGrid,
      });
    },
    getFilterModel: () => {
      try {
        const api = gridRef.current?.api;
        if (!api || api.isDestroyed?.()) return {};
        // AG Grid's filter model is the single source of truth for the UI & modal
        return api.getFilterModel?.() || {};
      } catch { return {}; }
    },
    clearSelection: () => {
      try {
        const api = gridRef.current?.api;
        if (!api || api.isDestroyed?.()) return;
        api.deselectAll?.();
      } catch {
        // ignore
      }
    },
  }), [refreshGrid, onFiltersChanged, gridRef, applyFilterModelToGrid]);
}
