export const WORKSPACE_TAB_PATHS = {
  grid: '',
  calendar: '/calendar',
  scheduler: '/scheduler',
  map: '/map',
  board: '/board',
  dashboard: '/dashboard',
  settings: '/settings',
} as const;

export type WorkspaceTabKey = keyof typeof WORKSPACE_TAB_PATHS;

export const DEFAULT_TAB_SEQUENCE: WorkspaceTabKey[] = [
  'grid',
  'calendar',
  'scheduler',
  'map',
  'board',
  'dashboard',
  'settings',
];

// Tabs that cannot be reordered
export const FIXED_TABS: WorkspaceTabKey[] = ['dashboard', 'settings'];

// Tabs always visible even if user hides others
export const ALWAYS_VISIBLE_TABS: WorkspaceTabKey[] = ['grid', 'dashboard', 'settings'];

