/**
 * Zustand store for workspace UI state (filters, search, grouping)
 * Replaces Redux selectors for workspace table filters
 */

import { create } from 'zustand';

export type GroupByOption = 'none' | 'spot_id' | 'status_id' | 'priority_id';

export interface FilterPreset {
  id: string;
  name: string;
  model: Record<string, any>;
  isQuick?: boolean;
}

interface WorkspaceUIState {
  // Filter state
  filterModel: Record<string, any> | null;
  searchText: string;
  groupBy: GroupByOption;
  collapseGroups: boolean;
  
  // Presets
  quickPresets: FilterPreset[];
  allPresets: FilterPreset[];
  
  // Actions
  setFilterModel: (model: Record<string, any> | null) => void;
  setSearchText: (text: string) => void;
  setGroupBy: (groupBy: GroupByOption) => void;
  setCollapseGroups: (collapse: boolean) => void;
  setQuickPresets: (presets: FilterPreset[]) => void;
  setAllPresets: (presets: FilterPreset[]) => void;
  addPreset: (preset: FilterPreset) => void;
  removePreset: (id: string) => void;
  reset: () => void;
}

const initialState = {
  filterModel: null,
  searchText: '',
  groupBy: 'none' as GroupByOption,
  collapseGroups: false,
  quickPresets: [] as FilterPreset[],
  allPresets: [] as FilterPreset[],
};

export const useWorkspaceUIStore = create<WorkspaceUIState>((set) => ({
  ...initialState,
  
  setFilterModel: (model) => set({ filterModel: model }),
  setSearchText: (text) => set({ searchText: text }),
  setGroupBy: (groupBy) => set({ groupBy }),
  setCollapseGroups: (collapse) => set({ collapseGroups: collapse }),
  setQuickPresets: (presets) => set({ quickPresets: presets }),
  setAllPresets: (presets) => set({ allPresets: presets }),
  
  addPreset: (preset) => set((state) => ({
    allPresets: [...state.allPresets, preset],
    quickPresets: preset.isQuick 
      ? [...state.quickPresets, preset]
      : state.quickPresets,
  })),
  
  removePreset: (id) => set((state) => ({
    allPresets: state.allPresets.filter(p => p.id !== id),
    quickPresets: state.quickPresets.filter(p => p.id !== id),
  })),
  
  reset: () => set(initialState),
}));
