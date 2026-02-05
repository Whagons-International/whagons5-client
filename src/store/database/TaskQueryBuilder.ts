/**
 * SQL Query Builder for Tasks.
 * 
 * Translates TasksCache query parameters into efficient SQL queries.
 * Supports:
 * - Simple filters (workspace_id, status_id, etc.)
 * - AG Grid filterModel (set filters, text filters, date filters)
 * - Multi-column sorting
 * - Pagination (both API-style and AG Grid-style)
 * - Full-text search
 */

export interface TaskQueryParams {
  // Simple filters
  workspace_id?: number | string;
  status_id?: number | string;
  priority_id?: number | string;
  team_id?: number | string;
  category_id?: number | string;
  spot_id?: number | string;
  template_id?: number | string;
  
  // Search
  search?: string;
  
  // Date filters
  date_from?: string;
  date_to?: string;
  updated_after?: string;
  
  // AG Grid filterModel
  filterModel?: Record<string, FilterModelEntry>;
  
  // Sorting
  sortModel?: Array<{ colId: string; sort: 'asc' | 'desc' }>;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  
  // Pagination (AG Grid style)
  startRow?: number;
  endRow?: number;
  
  // Pagination (API style)
  per_page?: number;
  page?: number;
  
  // Table selection
  shared_with_me?: boolean;
}

export interface FilterModelEntry {
  filterType?: 'set' | 'text' | 'number' | 'date';
  type?: string; // 'equals', 'contains', 'lessThan', etc.
  filter?: any;
  filterTo?: any;
  dateFrom?: string;
  dateTo?: string;
  values?: any[];
  operator?: 'AND' | 'OR';
  conditions?: FilterModelEntry[];
}

/**
 * Escape a value for SQL.
 */
function escapeValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  // String - escape single quotes
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * SQL Query Builder for Tasks.
 */
export class TaskQueryBuilder {
  private tableName: string;
  private conditions: string[] = [];
  private orderClauses: string[] = [];
  private limitValue?: number;
  private offsetValue?: number;

  constructor(sharedWithMe: boolean = false) {
    this.tableName = sharedWithMe ? 'shared_tasks' : 'tasks';
  }

  /**
   * Add a simple equality filter.
   */
  addFilter(column: string, value: any): this {
    if (value !== undefined && value !== null && value !== '') {
      const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
      if (Number.isFinite(numValue)) {
        this.conditions.push(`${column} = ${numValue}`);
      } else {
        this.conditions.push(`${column} = ${escapeValue(value)}`);
      }
    }
    return this;
  }

  /**
   * Add a search filter across multiple text columns.
   */
  addSearch(term: string): this {
    if (term && term.trim()) {
      const searchTerm = term.toLowerCase().replace(/'/g, "''");
      this.conditions.push(`(
        LOWER(COALESCE(name, '')) LIKE '%${searchTerm}%' OR 
        LOWER(COALESCE(description, '')) LIKE '%${searchTerm}%' OR
        CAST(id AS VARCHAR) LIKE '%${term}%'
      )`);
    }
    return this;
  }

  /**
   * Add a date range filter.
   */
  addDateRange(column: string, from?: string, to?: string): this {
    if (from) {
      this.conditions.push(`${column} >= ${escapeValue(from)}`);
    }
    if (to) {
      this.conditions.push(`${column} <= ${escapeValue(to)}`);
    }
    return this;
  }

  /**
   * Add AG Grid filterModel conditions.
   */
  addFilterModel(filterModel: Record<string, FilterModelEntry>): this {
    for (const [column, filter] of Object.entries(filterModel)) {
      const condition = this.buildFilterCondition(column, filter);
      if (condition) {
        this.conditions.push(condition);
      }
    }
    return this;
  }

  /**
   * Build SQL condition for a single filter entry.
   */
  private buildFilterCondition(column: string, filter: FilterModelEntry): string | null {
    // Handle complex filters with operator and conditions
    if (filter.operator && filter.conditions && Array.isArray(filter.conditions)) {
      const subConditions = filter.conditions
        .map(cond => this.buildFilterCondition(column, cond))
        .filter(Boolean);
      
      if (subConditions.length === 0) return null;
      
      const operator = filter.operator.toUpperCase() === 'OR' ? ' OR ' : ' AND ';
      return `(${subConditions.join(operator)})`;
    }

    // Handle set filter (AG Grid Set Filter)
    if (filter.filterType === 'set') {
      return this.buildSetFilter(column, filter.values || []);
    }

    // Handle text filter
    if (filter.filterType === 'text') {
      return this.buildTextFilter(column, filter);
    }

    // Handle number filter
    if (filter.filterType === 'number') {
      return this.buildNumberFilter(column, filter);
    }

    // Handle date filter
    if (filter.filterType === 'date') {
      return this.buildDateFilter(column, filter);
    }

    return null;
  }

  /**
   * Build SQL for set filter (IN clause).
   */
  private buildSetFilter(column: string, values: any[]): string | null {
    if (!values || values.length === 0) return null;

    // Handle null values specially
    const hasNull = values.some(v => v === null || v === undefined || v === 'null' || v === 'undefined');
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== 'null' && v !== 'undefined');

    const parts: string[] = [];

    if (nonNullValues.length > 0) {
      // Normalize values to numbers if possible
      const escapedValues = nonNullValues.map(v => {
        const num = Number(v);
        return Number.isFinite(num) ? num : escapeValue(v);
      });
      parts.push(`${column} IN (${escapedValues.join(', ')})`);
    }

    if (hasNull) {
      parts.push(`${column} IS NULL`);
    }

    if (parts.length === 0) return null;
    return parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`;
  }

  /**
   * Build SQL for text filter.
   */
  private buildTextFilter(column: string, filter: FilterModelEntry): string | null {
    const { type, filter: filterValue } = filter;
    if (!filterValue && type !== 'blank' && type !== 'notBlank') return null;

    const escapedValue = filterValue ? String(filterValue).toLowerCase().replace(/'/g, "''") : '';

    switch (type) {
      case 'contains':
        return `LOWER(COALESCE(${column}, '')) LIKE '%${escapedValue}%'`;
      case 'notContains':
        return `LOWER(COALESCE(${column}, '')) NOT LIKE '%${escapedValue}%'`;
      case 'equals':
        return `LOWER(COALESCE(${column}, '')) = '${escapedValue}'`;
      case 'notEqual':
        return `LOWER(COALESCE(${column}, '')) != '${escapedValue}'`;
      case 'startsWith':
        return `LOWER(COALESCE(${column}, '')) LIKE '${escapedValue}%'`;
      case 'endsWith':
        return `LOWER(COALESCE(${column}, '')) LIKE '%${escapedValue}'`;
      case 'blank':
        return `(${column} IS NULL OR TRIM(${column}) = '')`;
      case 'notBlank':
        return `(${column} IS NOT NULL AND TRIM(${column}) != '')`;
      default:
        return null;
    }
  }

  /**
   * Build SQL for number filter.
   */
  private buildNumberFilter(column: string, filter: FilterModelEntry): string | null {
    const { type, filter: filterValue, filterTo } = filter;
    const num = parseFloat(filterValue);
    if (!Number.isFinite(num) && type !== 'inRange') return null;

    switch (type) {
      case 'equals':
        return `${column} = ${num}`;
      case 'notEqual':
        return `${column} != ${num}`;
      case 'lessThan':
        return `${column} < ${num}`;
      case 'lessThanOrEqual':
        return `${column} <= ${num}`;
      case 'greaterThan':
        return `${column} > ${num}`;
      case 'greaterThanOrEqual':
        return `${column} >= ${num}`;
      case 'inRange':
        const max = parseFloat(filterTo);
        if (!Number.isFinite(num) || !Number.isFinite(max)) return null;
        return `(${column} >= ${num} AND ${column} <= ${max})`;
      default:
        return null;
    }
  }

  /**
   * Build SQL for date filter.
   */
  private buildDateFilter(column: string, filter: FilterModelEntry): string | null {
    const { type, filter: filterValue, dateFrom, dateTo } = filter;
    const dateValue = filterValue || dateFrom;
    
    switch (type) {
      case 'equals':
      case 'dateIs':
        if (!dateValue) return null;
        return `DATE(${column}) = DATE(${escapeValue(dateValue)})`;
      case 'notEqual':
      case 'dateIsNot':
        if (!dateValue) return null;
        return `DATE(${column}) != DATE(${escapeValue(dateValue)})`;
      case 'lessThan':
      case 'dateBefore':
        if (!dateValue) return null;
        return `${column} < ${escapeValue(dateValue)}`;
      case 'greaterThan':
      case 'dateAfter':
        if (!dateValue) return null;
        return `${column} > ${escapeValue(dateValue)}`;
      case 'inRange':
        if (!dateFrom || !dateTo) return null;
        return `(${column} >= ${escapeValue(dateFrom)} AND ${column} <= ${escapeValue(dateTo)})`;
      default:
        return null;
    }
  }

  /**
   * Add sorting clauses.
   */
  addSorting(sortModel: Array<{ colId: string; sort: string }>): this {
    for (const { colId, sort } of sortModel) {
      const direction = sort.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      // Handle nulls - put them at the end
      this.orderClauses.push(`${colId} ${direction} NULLS LAST`);
    }
    return this;
  }

  /**
   * Set pagination (AG Grid style: startRow/endRow).
   */
  setPagination(startRow?: number, endRow?: number): this {
    if (startRow !== undefined && endRow !== undefined) {
      this.offsetValue = startRow;
      this.limitValue = endRow - startRow;
    }
    return this;
  }

  /**
   * Set pagination (API style: page/per_page).
   */
  setPagePagination(page?: number, perPage?: number): this {
    if (page !== undefined && perPage !== undefined) {
      this.offsetValue = (page - 1) * perPage;
      this.limitValue = perPage;
    }
    return this;
  }

  /**
   * Build the final SQL queries.
   */
  build(): { sql: string; countSql: string } {
    // WHERE clause
    let whereClause = '';
    if (this.conditions.length > 0) {
      whereClause = `WHERE ${this.conditions.join(' AND ')}`;
    }

    // ORDER BY clause
    let orderClause = '';
    if (this.orderClauses.length > 0) {
      orderClause = `ORDER BY ${this.orderClauses.join(', ')}`;
    } else {
      // Default: created_at desc, id desc
      orderClause = 'ORDER BY created_at DESC NULLS LAST, id DESC';
    }

    // LIMIT/OFFSET clause
    let limitClause = '';
    if (this.limitValue !== undefined) {
      limitClause = `LIMIT ${this.limitValue}`;
      if (this.offsetValue !== undefined && this.offsetValue > 0) {
        limitClause += ` OFFSET ${this.offsetValue}`;
      }
    }

    const sql = `SELECT * FROM ${this.tableName} ${whereClause} ${orderClause} ${limitClause}`.trim();
    const countSql = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`.trim();

    return { sql, countSql };
  }
}

/**
 * Build a task query from TasksCache params.
 * This is a convenience function that mirrors TasksCache.queryTasks() parameters.
 */
export function buildTaskQuery(params: TaskQueryParams): { sql: string; countSql: string } {
  const builder = new TaskQueryBuilder(!!params.shared_with_me);

  // Check which columns are handled by filterModel to avoid double-filtering
  const filterModelKeys = params.filterModel 
    ? new Set(Object.keys(params.filterModel)) 
    : new Set<string>();

  // Apply simple filters (skip if in filterModel)
  if (!params.shared_with_me && params.workspace_id) {
    builder.addFilter('workspace_id', params.workspace_id);
  }
  if (params.status_id && !filterModelKeys.has('status_id')) {
    builder.addFilter('status_id', params.status_id);
  }
  if (params.priority_id && !filterModelKeys.has('priority_id')) {
    builder.addFilter('priority_id', params.priority_id);
  }
  if (params.team_id) {
    builder.addFilter('team_id', params.team_id);
  }
  if (params.category_id) {
    builder.addFilter('category_id', params.category_id);
  }
  if (params.spot_id && !filterModelKeys.has('spot_id')) {
    builder.addFilter('spot_id', params.spot_id);
  }
  if (params.template_id) {
    builder.addFilter('template_id', params.template_id);
  }

  // Apply search
  if (params.search) {
    builder.addSearch(params.search);
  }

  // Apply date filters
  if (params.date_from || params.date_to) {
    builder.addDateRange('created_at', params.date_from, params.date_to);
  }
  if (params.updated_after) {
    builder.addDateRange('updated_at', params.updated_after, undefined);
  }

  // Apply filterModel
  if (params.filterModel) {
    builder.addFilterModel(params.filterModel);
  }

  // Apply sorting
  if (params.sortModel && Array.isArray(params.sortModel) && params.sortModel.length > 0) {
    builder.addSorting(params.sortModel);
  } else if (params.sort_by) {
    builder.addSorting([{ 
      colId: params.sort_by, 
      sort: params.sort_direction || 'desc' 
    }]);
  }

  // Apply pagination
  if (params.startRow !== undefined && params.endRow !== undefined) {
    builder.setPagination(params.startRow, params.endRow);
  } else if (params.page !== undefined && params.per_page !== undefined) {
    builder.setPagePagination(params.page, params.per_page);
  }

  return builder.build();
}
