# Migration Guide: Redux to Dexie useLiveQuery

## Overview

We're replacing Redux generic slices with Dexie's `useLiveQuery` for data fetching. This gives us:
- Automatic reactivity (no manual dispatch needed)
- Data stays in IndexedDB until queried (no memory bloat)
- Simpler API

## The New API

```typescript
import { useLiveQuery, collections } from '@/store/dexie';
```

## Migration Patterns

### Pattern 1: Simple useSelector → useLiveQuery

**Before:**
```typescript
const statuses = useSelector((state: RootState) => state.statuses.value) || [];
```

**After:**
```typescript
const statuses = useLiveQuery(() => collections.statuses.getAll()) || [];
```

### Pattern 2: useSelector with filter → useLiveQuery with where()

**Before:**
```typescript
const allTasks = useSelector((state: RootState) => state.tasks.value) || [];
const workspaceTasks = allTasks.filter(t => t.workspace_id === workspaceId);
```

**After:**
```typescript
const workspaceTasks = useLiveQuery(
  () => collections.tasks.query()
    .where('workspace_id').equals(workspaceId)
    .toArray(),
  [workspaceId]  // Re-run when workspaceId changes
) || [];
```

### Pattern 3: useSelector with find → useLiveQuery with get()

**Before:**
```typescript
const allCategories = useSelector((state: RootState) => state.categories.value) || [];
const category = allCategories.find(c => c.id === categoryId);
```

**After:**
```typescript
const category = useLiveQuery(
  () => collections.categories.get(categoryId),
  [categoryId]
);
```

### Pattern 4: Multiple useSelectors → Single useLiveQuery

**Before:**
```typescript
const statuses = useSelector((s: RootState) => s.statuses.value) || [];
const categories = useSelector((s: RootState) => s.categories.value) || [];
const task = tasks.find(t => t.id === taskId);
const status = statuses.find(s => s.id === task?.status_id);
const category = categories.find(c => c.id === task?.category_id);
```

**After:**
```typescript
const data = useLiveQuery(async () => {
  const task = await collections.tasks.get(taskId);
  if (!task) return null;
  
  const [status, category] = await Promise.all([
    collections.statuses.get(task.status_id),
    collections.categories.get(task.category_id),
  ]);
  
  return { task, status, category };
}, [taskId]);

const { task, status, category } = data || {};
```

### Pattern 5: dispatch(addAsync) → collections.add()

**Before:**
```typescript
const dispatch = useDispatch();

const handleCreate = async () => {
  await dispatch(genericActions.statuses.addAsync({
    name: 'New Status',
    workspace_id: workspaceId,
  })).unwrap();
};
```

**After:**
```typescript
const handleCreate = async () => {
  await collections.statuses.add({
    name: 'New Status',
    workspace_id: workspaceId,
  });
  // UI updates automatically via useLiveQuery - no dispatch needed
};
```

### Pattern 6: dispatch(updateAsync) → collections.update()

**Before:**
```typescript
await dispatch(genericActions.tasks.updateAsync({
  id: taskId,
  updates: { title: 'Updated Title' }
})).unwrap();
```

**After:**
```typescript
await collections.tasks.update(taskId, { title: 'Updated Title' });
```

### Pattern 7: dispatch(removeAsync) → collections.delete()

**Before:**
```typescript
await dispatch(genericActions.statuses.removeAsync(statusId)).unwrap();
```

**After:**
```typescript
await collections.statuses.delete(statusId);
```

### Pattern 8: Loading states

**Before:**
```typescript
const { value: tasks, loading } = useSelector((state: RootState) => state.tasks);
if (loading) return <Spinner />;
```

**After:**
```typescript
const tasks = useLiveQuery(() => collections.tasks.getAll());
// useLiveQuery returns undefined while loading
if (tasks === undefined) return <Spinner />;
```

Or use a wrapper pattern:
```typescript
const tasks = useLiveQuery(() => collections.tasks.getAll()) ?? [];
// Empty array while loading, then real data
```

## Dexie Query Methods

The `collections.X.query()` returns a Dexie Table with these methods:

```typescript
// Get all
collections.tasks.query().toArray()

// Filter by indexed field
collections.tasks.query().where('workspace_id').equals(1).toArray()

// Filter by multiple values
collections.tasks.query().where('status_id').anyOf([1, 2, 3]).toArray()

// Range queries
collections.tasks.query().where('created_at').above('2024-01-01').toArray()

// Compound filters (AND)
collections.tasks.query()
  .where('workspace_id').equals(1)
  .and(task => task.status_id === 2)
  .toArray()

// Sorting
collections.tasks.query().orderBy('created_at').toArray()
collections.tasks.query().orderBy('created_at').reverse().toArray()

// Limit
collections.tasks.query().limit(10).toArray()

// Count
collections.tasks.query().where('status_id').equals(1).count()

// First match
collections.tasks.query().where('id').equals(123).first()
```

## Available Collections

All collections are available via `collections.X` where X is camelCase:

- `collections.tasks`
- `collections.statuses`
- `collections.categories`
- `collections.workspaces`
- `collections.users`
- `collections.teams`
- `collections.tags`
- `collections.priorities`
- `collections.spots`
- ... and all other tables from tableRegistry

## Important Notes

1. **Dependencies array**: Always include variables used in the query in the deps array:
   ```typescript
   useLiveQuery(() => collections.tasks.query().where('workspace_id').equals(workspaceId).toArray(), [workspaceId])
   ```

2. **Null safety**: `useLiveQuery` returns `undefined` while loading. Use `|| []` or `?? []` for arrays.

3. **No dispatch needed**: After mutations (`add`, `update`, `delete`), the UI updates automatically.

4. **Async queries**: The query function can be async and do multiple operations.

5. **Keep Redux for UI state**: Redux still handles modals, selections, form state, etc. Only data tables move to Dexie.

## Migrating TasksCache.queryTasks()

For components that use `TasksCache.queryTasks()`, use the new `queryTasks` from Dexie:

**Before:**
```typescript
import { TasksCache } from '@/store/indexedDB/TasksCache';

const result = await TasksCache.queryTasks({
  workspace_id: workspaceId,
  status_id: statusId,
  startRow: 0,
  endRow: 50,
  sortModel: [{ colId: 'created_at', sort: 'desc' }],
});
const tasks = result.rows;
const totalCount = result.rowCount;
```

**After:**
```typescript
import { queryTasks } from '@/store/dexie';

const result = await queryTasks({
  workspace_id: workspaceId,
  status_id: statusId,
  startRow: 0,
  endRow: 50,
  sortModel: [{ colId: 'created_at', sort: 'desc' }],
});
const tasks = result.rows;
const totalCount = result.rowCount;
```

The API is identical - just change the import!

**Additional helpers available:**
```typescript
import { getTask, getTaskCount, getTasksByStatus, getTasksByWorkspace } from '@/store/dexie';

// Get single task
const task = await getTask(taskId);

// Count tasks in workspace (uses index - fast!)
const count = await getTaskCount(workspaceId);

// Get all tasks with a specific status (uses index)
const doneTasks = await getTasksByStatus(doneStatusId);

// Get all tasks in workspace (uses index)
const workspaceTasks = await getTasksByWorkspace(workspaceId);
```

## Files to Migrate

Search for these patterns to find files needing migration:
- `useSelector.*state\.\w+\.value`
- `genericActions\.\w+\.(addAsync|updateAsync|removeAsync)`
- `dispatch.*getFromIndexedDB`
- `TasksCache.queryTasks` → `queryTasks` from `@/store/dexie`
- `TasksCache.getTask` → `getTask` from `@/store/dexie`

## Testing

After migrating a component:
1. Verify data loads correctly
2. Verify create/update/delete operations work
3. Verify UI updates reactively when data changes
4. Check there are no console errors
