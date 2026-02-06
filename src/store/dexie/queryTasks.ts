/**
 * Query tasks helper - Migrated from TasksCache.queryTasks()
 * 
 * Uses Dexie's indexed queries to avoid loading all tasks into memory.
 * Only loads the tasks that match the primary filter, then applies
 * additional filters in JS.
 */

import { db } from './db';
import type { Collection } from 'dexie';

// Task type (minimal, can be expanded)
interface Task {
  id: number;
  workspace_id?: number;
  status_id?: number;
  priority_id?: number;
  category_id?: number;
  team_id?: number;
  template_id?: number;
  spot_id?: number;
  user_id?: number;
  user_ids?: number[];
  name?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  tag_ids?: number[];
  [key: string]: any;
}

export interface QueryTasksParams {
  // Primary filters (use Dexie indexes)
  workspace_id?: string | number;
  status_id?: string | number;
  category_id?: string | number;
  
  // Secondary filters (applied in JS after indexed query)
  priority_id?: string | number;
  team_id?: string | number;
  template_id?: string | number;
  spot_id?: string | number;
  
  // Search and dates
  search?: string;
  date_from?: string;
  date_to?: string;
  updated_after?: string;
  
  // AG Grid filter/sort models
  filterModel?: Record<string, any>;
  sortModel?: Array<{ colId: string; sort: 'asc' | 'desc' }>;
  
  // Sorting (simple)
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  
  // Pagination
  startRow?: number;
  endRow?: number;
  page?: number;
  per_page?: number;
  
  // Special flags
  shared_with_me?: boolean;
  
  // Lookup maps for search (passed from caller)
  __statusMap?: Record<number, { name?: string }>;
  __priorityMap?: Record<number, { name?: string }>;
  __spotMap?: Record<number, { name?: string }>;
  __userMap?: Record<number, { name?: string; email?: string }>;
  __tagMap?: Record<number, { name?: string }>;
  __taskTags?: Array<{ task_id: number; tag_id: number }>;
}

export interface QueryTasksResult {
  rows?: Task[];
  data?: Task[];
  rowCount?: number;
  total?: number;
  current_page?: number;
  per_page?: number;
  last_page?: number;
  from?: number;
  to?: number;
}

/**
 * Query tasks with filtering, sorting, and pagination.
 * 
 * Uses Dexie indexes for primary filter to minimize data loaded into memory.
 * The strategy is:
 * 1. Use the most selective indexed filter first (workspace_id, status_id, or category_id)
 * 2. Load only those tasks from IndexedDB
 * 3. Apply remaining filters in JS
 */
export async function queryTasks(params: QueryTasksParams = {}): Promise<QueryTasksResult> {
  try {
    const table = db.table<Task>('tasks');
    
    // Determine which indexed filter to use as primary
    // Priority: workspace_id > status_id > category_id (most to least selective typically)
    let collection: Collection<Task>;
    let primaryFilterApplied = false;
    
    const wsId = params.workspace_id != null 
      ? (typeof params.workspace_id === 'string' ? parseInt(params.workspace_id, 10) : Number(params.workspace_id))
      : null;
    const statusId = params.status_id != null
      ? (typeof params.status_id === 'string' ? parseInt(params.status_id, 10) : Number(params.status_id))
      : null;
    const categoryId = params.category_id != null
      ? (typeof params.category_id === 'string' ? parseInt(params.category_id, 10) : Number(params.category_id))
      : null;

    // Check if filterModel overrides these
    const filterModelKeys = params.filterModel ? new Set(Object.keys(params.filterModel)) : new Set();
    
    // Use indexed query for primary filter
    if (wsId != null && Number.isFinite(wsId) && !params.shared_with_me) {
      collection = table.where('workspace_id').equals(wsId);
      primaryFilterApplied = true;
    } else if (statusId != null && Number.isFinite(statusId) && !filterModelKeys.has('status_id')) {
      collection = table.where('status_id').equals(statusId);
      primaryFilterApplied = true;
    } else if (categoryId != null && Number.isFinite(categoryId)) {
      collection = table.where('category_id').equals(categoryId);
      primaryFilterApplied = true;
    } else {
      // No indexed filter available - will need to scan all
      collection = table.toCollection();
    }

    // Apply secondary filters using Dexie's .and() for efficiency
    // These run during the IndexedDB cursor iteration, not after loading all data
    collection = collection.and(task => {
      // Status filter (if not used as primary and not in filterModel)
      if (statusId != null && Number.isFinite(statusId) && !filterModelKeys.has('status_id') && !primaryFilterApplied) {
        if (task.status_id !== statusId) return false;
      }
      
      // Workspace filter (if not used as primary)
      if (wsId != null && Number.isFinite(wsId) && !params.shared_with_me && primaryFilterApplied) {
        // Already filtered by workspace_id index
      } else if (wsId != null && Number.isFinite(wsId) && !params.shared_with_me) {
        if (task.workspace_id !== wsId) return false;
      }
      
      // Priority filter
      if (params.priority_id != null && !filterModelKeys.has('priority_id')) {
        const priorityId = typeof params.priority_id === 'string' 
          ? parseInt(params.priority_id, 10) 
          : Number(params.priority_id);
        if (Number.isFinite(priorityId) && task.priority_id !== priorityId) return false;
      }
      
      // Team filter
      if (params.team_id != null) {
        const teamId = typeof params.team_id === 'string' 
          ? parseInt(params.team_id, 10) 
          : Number(params.team_id);
        if (Number.isFinite(teamId) && task.team_id !== teamId) return false;
      }
      
      // Template filter
      if (params.template_id != null) {
        const templateId = typeof params.template_id === 'string' 
          ? parseInt(params.template_id, 10) 
          : Number(params.template_id);
        if (Number.isFinite(templateId) && task.template_id !== templateId) return false;
      }
      
      // Spot filter
      if (params.spot_id != null && !filterModelKeys.has('spot_id')) {
        const spotId = typeof params.spot_id === 'string' 
          ? parseInt(params.spot_id, 10) 
          : Number(params.spot_id);
        if (Number.isFinite(spotId) && task.spot_id !== spotId) return false;
      }
      
      // Date filters
      if (params.date_from) {
        const dateFrom = new Date(params.date_from);
        if (new Date(task.created_at || 0) < dateFrom) return false;
      }
      if (params.date_to) {
        const dateTo = new Date(params.date_to);
        if (new Date(task.created_at || 0) > dateTo) return false;
      }
      if (params.updated_after) {
        const updatedAfter = new Date(params.updated_after);
        if (new Date(task.updated_at || 0) <= updatedAfter) return false;
      }
      
      return true;
    });

    // Execute query - at this point we load matching tasks into memory
    let tasks = await collection.toArray();

    // Build task tag map if needed for search or filterModel
    let taskTagMap: Record<number, number[]> | null = null;
    const buildTaskTagMap = () => {
      if (taskTagMap) return taskTagMap;
      const taskTagsParam = params.__taskTags || [];
      const m: Record<number, number[]> = {};
      for (const tt of taskTagsParam) {
        const taskId = Number(tt.task_id);
        const tagId = Number(tt.tag_id);
        if (!Number.isFinite(taskId) || !Number.isFinite(tagId)) continue;
        if (!m[taskId]) m[taskId] = [];
        m[taskId].push(tagId);
      }
      taskTagMap = m;
      return m;
    };

    // Apply search filter (needs lookup maps)
    if (params.search) {
      const searchTerm = String(params.search).toLowerCase();
      const statusMap = params.__statusMap || {};
      const priorityMap = params.__priorityMap || {};
      const spotMap = params.__spotMap || {};
      const userMap = params.__userMap || {};
      const tagMap = params.__tagMap || {};
      const ttMap = buildTaskTagMap();

      tasks = tasks.filter(t => {
        if (String(t.id).includes(searchTerm)) return true;
        if (t.name && t.name.toLowerCase().includes(searchTerm)) return true;
        if (t.description && t.description.toLowerCase().includes(searchTerm)) return true;
        
        const st = statusMap[t.status_id!];
        if (st?.name && st.name.toLowerCase().includes(searchTerm)) return true;
        
        const pr = priorityMap[t.priority_id!];
        if (pr?.name && pr.name.toLowerCase().includes(searchTerm)) return true;
        
        if (t.spot_id != null) {
          const sp = spotMap[t.spot_id];
          if (sp?.name && sp.name.toLowerCase().includes(searchTerm)) return true;
        }
        
        if (Array.isArray(t.user_ids) && t.user_ids.length > 0) {
          for (const uid of t.user_ids) {
            const u = userMap[uid];
            const uname = u?.name || u?.email;
            if (uname && uname.toLowerCase().includes(searchTerm)) return true;
          }
        }
        
        const tagIds = ttMap[t.id];
        if (tagIds && tagIds.length > 0) {
          for (const tagId of tagIds) {
            const tag = tagMap[tagId];
            if (tag?.name && tag.name.toLowerCase().includes(searchTerm)) return true;
          }
        }
        
        return false;
      });
    }

    // Apply AG Grid filterModel
    if (params.filterModel && Object.keys(params.filterModel).length > 0) {
      // Inject tag_ids if needed
      if (params.filterModel.tag_ids && params.__taskTags && params.__taskTags.length > 0) {
        const ttMap = buildTaskTagMap();
        tasks = tasks.map(t => ({ ...t, tag_ids: ttMap[t.id] || [] }));
      }
      tasks = applyFilterModel(tasks, params.filterModel);
    }

    // Apply sorting
    const sortModel = params.sortModel 
      || (params.sort_by ? [{ colId: params.sort_by, sort: params.sort_direction || 'desc' as const }] : null)
      || [{ colId: 'created_at', sort: 'desc' as const }, { colId: 'id', sort: 'desc' as const }];
    
    tasks = applySorting(tasks, sortModel);

    // Apply pagination
    if (params.per_page && params.page) {
      const perPage = parseInt(String(params.per_page)) || 15;
      const page = parseInt(String(params.page)) || 1;
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      
      return {
        data: tasks.slice(startIndex, endIndex),
        current_page: page,
        per_page: perPage,
        total: tasks.length,
        last_page: Math.ceil(tasks.length / perPage),
        from: startIndex + 1,
        to: Math.min(endIndex, tasks.length)
      };
    } else if (params.startRow !== undefined && params.endRow !== undefined) {
      const startRow = parseInt(String(params.startRow));
      const endRow = parseInt(String(params.endRow));
      
      return {
        rows: tasks.slice(startRow, endRow),
        rowCount: tasks.length
      };
    } else {
      return {
        rows: tasks,
        rowCount: tasks.length
      };
    }
  } catch (error) {
    console.error('[queryTasks] Error:', error);
    throw error;
  }
}

/**
 * Apply AG Grid filterModel
 */
function applyFilterModel(tasks: Task[], filterModel: Record<string, any>): Task[] {
  return tasks.filter(task => {
    for (const [column, filterDetails] of Object.entries(filterModel)) {
      if (!taskMatchesFilter(task, column, filterDetails)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Check if task matches a filter
 */
function taskMatchesFilter(task: Task, column: string, filterDetails: any): boolean {
  const taskValue = task[column];
  
  // Handle compound conditions (AND/OR)
  if (filterDetails.operator && filterDetails.conditions && Array.isArray(filterDetails.conditions)) {
    const operator = filterDetails.operator.toUpperCase();
    const results = filterDetails.conditions.map((condition: any) => 
      evaluateCondition(taskValue, condition)
    );
    return operator === 'OR' ? results.some((r: boolean) => r) : results.every((r: boolean) => r);
  }
  
  return evaluateCondition(taskValue, filterDetails);
}

/**
 * Evaluate a single filter condition
 */
function evaluateCondition(value: any, condition: any): boolean {
  const { filterType, type, filter, values } = condition;

  // Set filter (multi-select)
  if (filterType === 'set') {
    const selected = Array.isArray(values) ? values : [];
    if (selected.length === 0) return true;
    
    // Handle null/undefined
    if (value === null || value === undefined) {
      return selected.some(v => v === null || v === undefined || v === 'null' || v === 'undefined');
    }
    
    // Normalize selected values to numbers where possible
    const selectedNums = selected
      .map(v => v === null || v === undefined ? null : Number(v))
      .filter(n => n !== null && Number.isFinite(n));
    const selectedStrs = selected.map(v => 
      v === null ? 'null' : v === undefined ? 'undefined' : String(v)
    );

    // Handle array values (like user_ids, tag_ids)
    if (Array.isArray(value)) {
      return value.some(v => {
        const vNum = Number(v);
        if (Number.isFinite(vNum) && selectedNums.includes(vNum)) return true;
        return selectedStrs.includes(String(v));
      });
    }

    // Single value
    const valueNum = Number(value);
    if (Number.isFinite(valueNum) && selectedNums.includes(valueNum)) return true;
    return selectedStrs.includes(String(value));
  }

  // Text filter
  if (filterType === 'text') {
    const strValue = String(value || '').toLowerCase();
    const filterStr = String(filter || '').toLowerCase();
    
    switch (type) {
      case 'contains': return strValue.includes(filterStr);
      case 'notContains': return !strValue.includes(filterStr);
      case 'equals': return strValue === filterStr;
      case 'notEqual': return strValue !== filterStr;
      case 'startsWith': return strValue.startsWith(filterStr);
      case 'endsWith': return strValue.endsWith(filterStr);
      case 'blank': return !value || strValue.trim() === '';
      case 'notBlank': return value && strValue.trim() !== '';
      default: return true;
    }
  }

  // Number filter
  if (filterType === 'number') {
    const numValue = Number(value);
    const filterNum = Number(filter);
    
    if (!Number.isFinite(numValue)) return type === 'blank';
    
    switch (type) {
      case 'equals': return numValue === filterNum;
      case 'notEqual': return numValue !== filterNum;
      case 'lessThan': return numValue < filterNum;
      case 'lessThanOrEqual': return numValue <= filterNum;
      case 'greaterThan': return numValue > filterNum;
      case 'greaterThanOrEqual': return numValue >= filterNum;
      case 'inRange': return numValue >= filterNum && numValue <= Number(condition.filterTo);
      case 'blank': return !Number.isFinite(numValue);
      case 'notBlank': return Number.isFinite(numValue);
      default: return true;
    }
  }

  // Date filter
  if (filterType === 'date') {
    const dateValue = value ? new Date(value) : null;
    const filterDate = filter ? new Date(filter) : null;
    
    if (!dateValue || isNaN(dateValue.getTime())) return type === 'blank';
    if (!filterDate || isNaN(filterDate.getTime())) return true;
    
    // Compare dates only (ignore time)
    const dv = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
    const fd = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
    
    switch (type) {
      case 'equals': return dv.getTime() === fd.getTime();
      case 'notEqual': return dv.getTime() !== fd.getTime();
      case 'lessThan': return dv < fd;
      case 'greaterThan': return dv > fd;
      case 'inRange':
        const filterTo = condition.filterTo ? new Date(condition.filterTo) : null;
        if (!filterTo) return true;
        const ft = new Date(filterTo.getFullYear(), filterTo.getMonth(), filterTo.getDate());
        return dv >= fd && dv <= ft;
      case 'blank': return !dateValue;
      case 'notBlank': return !!dateValue;
      default: return true;
    }
  }

  return true;
}

/**
 * Apply sorting to tasks
 */
function applySorting(tasks: Task[], sortModel: Array<{ colId: string; sort: 'asc' | 'desc' }>): Task[] {
  if (!sortModel || sortModel.length === 0) return tasks;
  
  const sorted = [...tasks];
  sorted.sort((a, b) => {
    for (const { colId, sort: direction } of sortModel) {
      const aVal = a[colId];
      const bVal = b[colId];
      
      let comparison = 0;
      
      // Handle nulls
      if (aVal === null || aVal === undefined) {
        comparison = (bVal === null || bVal === undefined) ? 0 : 1;
      } else if (bVal === null || bVal === undefined) {
        comparison = -1;
      } 
      // Compare numbers
      else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      }
      // Compare dates (string format)
      else if (colId.includes('_at') || colId === 'due_date') {
        comparison = new Date(aVal).getTime() - new Date(bVal).getTime();
      }
      // Compare strings
      else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      
      if (comparison !== 0) {
        return direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
  
  return sorted;
}

/**
 * Get a single task by ID
 */
export async function getTask(id: number | string): Promise<Task | undefined> {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return db.table<Task>('tasks').get(numId);
}

/**
 * Get tasks count for a workspace
 */
export async function getTaskCount(workspaceId?: number | string): Promise<number> {
  if (workspaceId != null) {
    const wsId = typeof workspaceId === 'string' ? parseInt(workspaceId, 10) : workspaceId;
    return db.table('tasks').where('workspace_id').equals(wsId).count();
  }
  return db.table('tasks').count();
}

/**
 * Get tasks by status (uses index)
 */
export async function getTasksByStatus(statusId: number): Promise<Task[]> {
  return db.table<Task>('tasks').where('status_id').equals(statusId).toArray();
}

/**
 * Get tasks by workspace (uses index)
 */
export async function getTasksByWorkspace(workspaceId: number): Promise<Task[]> {
  return db.table<Task>('tasks').where('workspace_id').equals(workspaceId).toArray();
}
