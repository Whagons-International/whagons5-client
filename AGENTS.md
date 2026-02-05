# Agents: Frontend Data Flow, Caching, and State Management

This document explains the generic architecture and lifecycle applied across the frontend application, detailing how Redux, IndexedDB caching, real-time listeners, and event-driven updates work together to provide a seamless user experience. This complements the backend AGENTS.md by explaining the client-side data management patterns.

## Overview

- **API Integration**: RESTful endpoints with optimistic updates and error handling
- **Redux Store**: Global state management with async thunks for data operations
- **Generic Slice Factory**: Automated Redux slice creation for simple CRUD operations
- **IndexedDB Caching**: Persistent local storage with intelligent synchronization
- **Real-Time Updates**: WebSocket-based change propagation from backend publications
- **Event Emitters**: Decoupled communication between cache layer and Redux store
- **Sync Stream**: NDJSON-based cursor synchronization for data hydration

## Request → State Lifecycle

1. **User Interaction**
   - User performs action (create, update, delete, filter, search)
   - Redux action dispatched with optimistic updates

2. **Optimistic Updates**
   - UI immediately reflects changes in Redux store
   - Temporary IDs/states used for pending operations

3. **API Communication**
   - HTTP request sent to backend API
   - Success: Real data replaces optimistic updates
   - Failure: Rollback to previous state

4. **Cache Synchronization**
   - IndexedDB updated with authoritative data
   - Event emitters notify other components of changes

5. **Real-Time Propagation**
   - WebSocket receives database change notifications
   - Cache updated automatically in background
   - Redux store refreshed from updated cache

## Architecture Pattern

The application uses a **3-tier caching strategy**:

```
API Server → IndexedDB (Local Cache) → Redux Store → React Components
```

### Benefits of this approach:
- **Offline support**: Data available even without internet connection
- **Performance**: Sub-millisecond local access to frequently used data
- **Synchronization**: Smart updates only when data changes
- **Persistence**: Data survives app refreshes, browser crashes, and sessions
- **Real-time updates**: Automatic synchronization across multiple clients

## Data Flow Patterns

### 1. Initial Load (User Authentication)

```typescript
User Authenticates → AuthProvider
  → DataManager.bootstrapAndSync()
  → Sync stream hydrates all caches
  → Redux store populated from IndexedDB
  → Components render with data
```

**Detailed Flow:**
1. User authenticates via Firebase
2. AuthProvider detects auth state change
3. DataManager calls `/api/bootstrap` for tenant context
4. Sync stream (`/api/sync/stream`) sends NDJSON with all table data
5. Data written to IndexedDB caches
6. Redux store hydrated from IndexedDB
7. Components receive data via `useSelector` hooks

### 2. Sync Stream Architecture

**Location**: `src/store/DataManager.ts`

The sync stream provides efficient data hydration:

```typescript
DataManager.bootstrapAndSync() → 
  GET /api/sync/stream (NDJSON) →
  Parse each line as JSON →
  Route to appropriate cache →
  Update Redux when tables touched
```

**Features:**
- **Cursor-based sync**: Remembers last position for incremental updates
- **Snapshot support**: Handles pivot tables without `updated_clock` columns
- **Priority tables**: Core tables synced to Redux first for faster UI
- **Batched tasks**: Task records batched for performance

### 3. Cache Initialization

**GenericCache** (All 60+ tables):

```typescript
GenericCache → Auto-initialized on first access → No explicit init needed
```

- **Auto-initialization**: Generic caches initialize themselves when first accessed
- **Simple CRUD**: `add()`, `update()`, `remove()`, `getAll()`, `fetchAll()`
- **Remote operations**: `createRemote()`, `updateRemote()`, `deleteRemote()`
- **Soft-delete aware**: Automatically removes rows with `deleted_at` set

**⚡ Performance Benefits:**
- **Immediate app start**: No waiting for cache initializations
- **Lazy loading**: Data loads only when components need it
- **Reduced memory**: Only active data kept in memory
- **Better UX**: App starts instantly while data loads in background

### Generic Slice Factory

**Location**: `src/store/genericSliceFactory.ts`, `src/store/genericSlices.ts`

**Purpose**: Eliminate boilerplate code for simple CRUD tables by automatically generating Redux slices, caches, and registrations.

**Benefits:**
- **95% Reduction in Boilerplate**: From 4,000+ lines to ~200 lines
- **Automatic Integration**: Cache registry, store registration, and AuthProvider initialization
- **Type Safety**: Full TypeScript support with proper interfaces
- **Consistency**: All generic slices follow the same patterns
- **Event System**: Built-in event emission for UI updates
- **Generic CRUD Actions**: `addAsync`, `updateAsync`, `removeAsync` for all tables

**How to Add a New Table (1 File + Version Bump):**
```typescript
// 1. Add store name to tableRegistry.ts (single source of truth)
// In SIMPLE_STORES (or INDEXED_STORES if indexes needed):
'your_entities',

// In GENERIC_SLICE_STORES:
'your_entities',

// 2. Bump version in DB.ts
const CURRENT_DB_VERSION = '1.19.0';
```

**Naming Convention (auto-derived from store name):**
- `your_entities` → table: `wh_your_entities`, endpoint: `/your-entities`, slice: `yourEntities`
- For exceptions, add to `SPECIAL_TABLE_NAMES` in tableRegistry.ts

**That's it!** The factory automatically creates:
- Redux slice with `getFromIndexedDB`, `fetchFromAPI`, `addAsync`, `updateAsync`, `removeAsync` actions
- GenericCache instance with real-time updates
- Cache registry entry for database change notifications
- Store reducer registration
- Event emission system for UI updates

**Usage in Components:**
```typescript
import { genericActions } from '@/store/genericSlices';

const data = useSelector(state => state.yourEntities);

// CRUD operations (optimistic updates built-in)
dispatch(genericActions.yourEntities.addAsync(newItem));
dispatch(genericActions.yourEntities.updateAsync({ id: 1, updates: {...} }));
dispatch(genericActions.yourEntities.removeAsync(1));

// Listen for events (for custom components)
useEffect(() => {
  const unsubscribe = genericActions.yourEntities.events.on(
    genericActions.yourEntities.eventNames.UPDATED,
    (data) => {
      console.log('Entity updated:', data);
    }
  );
  return unsubscribe;
}, []);
```

### 4. Component Integration

Components access data through Redux selectors:

```typescript
const { value: tasks, loading, error } = useSelector((state: RootState) => state.tasks);
```

## Caching Strategies

### Custom Cache Classes

**Location**: `src/store/indexedDB/TasksCache.ts`

**Features:**
- **Local Query Engine**: Filter, sort, paginate offline (mirrors backend API)
- **Event Emitters**: Notify Redux of cache changes
- **Bulk Operations**: Efficient batch inserts/deletes
- **Smart Synchronization**: Incremental updates

**Example - TasksCache.queryTasks():**
```typescript
// Supports complex queries offline
const results = await TasksCache.queryTasks({
  workspace_id: 1,
  status_id: 2,
  search: 'urgent',
  sortModel: [{ colId: 'created_at', sort: 'desc' }],
  startRow: 0,
  endRow: 50
});
```

### GenericCache

**Location**: `src/store/indexedDB/GenericCache.ts`

**Features:**
- **Generic CRUD**: Reusable for simple entities
- **Batch Operations**: Efficient bulk insert/update/delete
- **Soft-delete Support**: Auto-removes deleted rows
- **Envelope Unwrapping**: Handles various API response shapes

**Configuration Example:**
```typescript
const statusesCache = new GenericCache({
  table: 'wh_statuses',      // Backend table name
  endpoint: '/statuses',     // API endpoint
  store: 'statuses',         // IndexedDB store name
});
```

### Cache Registry

**Location**: `src/store/indexedDB/CacheRegistry.ts`

Routes database change notifications to appropriate cache handlers:

```typescript
const cacheByTable: Record<string, CacheHandler> = {
  'wh_tasks': {
    add: (row) => TasksCache.addTask(row),
    update: (id, row) => TasksCache.updateTask(String(id), row),
    remove: (id) => TasksCache.deleteTask(String(id))
  },
  'wh_statuses': {
    add: (row) => statusesCache.add(row),
    update: (id, row) => statusesCache.update(id, row),
    remove: (id) => statusesCache.remove(id)
  }
  // ... other tables auto-registered by generic slice factory
};
```

## Real-Time Updates

### RealTimeListener (RTL)

**Location**: `src/store/realTimeListener/RTL.ts`

**Features:**
- **WebSocket Connection**: Native WebSocket to whagonsRTE server
- **Auto-Reconnection**: Exponential backoff retry logic
- **Multi-tenant Support**: Subdomain-aware connection routing
- **Change Routing**: Maps database notifications to cache updates

**Connection Flow:**
```typescript
// Smart connection with server availability check
await rtl.smartConnectAndHold();

// Listen for database changes
rtl.on('publication:received', (data) => {
  // Route to appropriate cache handler
  handleTablePublication(data);
});
```

**Message Types:**
- `database`: Change notifications from PostgreSQL publications
- `system`: Connection status and authentication
- `error`: Error handling and recovery

### Change Propagation

1. **Backend Trigger**: PostgreSQL `pg_notify()` on INSERT/UPDATE/DELETE
2. **whagonsRTE**: Go server receives notification, broadcasts to WebSocket clients
3. **RTL**: Receives message, routes to CacheRegistry
4. **Cache Update**: IndexedDB updated via appropriate cache handler
5. **Redux Sync**: `syncReduxForTable()` refreshes Redux from IndexedDB
6. **UI Refresh**: Components re-render via `useSelector`

## Redux Integration

### Async Thunks with Optimistic Updates

**Location**: `src/store/reducers/tasksSlice.ts`, `src/store/genericSliceFactory.ts`

**Pattern:**
```typescript
export const updateTaskAsync = createAsyncThunk(
  'tasks/updateTaskAsync',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      // API call with optimistic updates
      const response = await api.patch(`/tasks/${id}`, updates);
      await TasksCache.updateTask(id.toString(), response.data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

### Optimistic Update Flow

```typescript
// 1. Store previous state for rollback
state.previousState = [...state.value];

// 2. Apply optimistic update immediately
const index = state.value.findIndex(task => task.id === id);
if (index !== -1) {
  state.value[index] = { ...state.value[index], ...updates };
}

// 3. On success: Keep optimistic update
// 4. On failure: Rollback to previousState
```

### Event-Driven Synchronization

**Location**: `src/store/eventEmiters/taskEvents.ts`, `src/store/genericSliceFactory.ts`

```typescript
// Cache notifies Redux of changes
TaskEvents.emit(TaskEvents.EVENTS.TASK_UPDATED, updatedTask);

// Components listen for cache events
useEffect(() => {
  const unsubscribe = TaskEvents.on(TaskEvents.EVENTS.TASK_UPDATED, (task) => {
    dispatch(updateTaskInRedux(task));
  });
  return unsubscribe;
}, []);
```

## Error Handling and Recovery

### Network Failure
- **Graceful Degradation**: Cached data remains available
- **Retry Logic**: Exponential backoff for failed requests
- **Offline Mode**: Full functionality using IndexedDB

### Authentication Issues
- **Session Recovery**: Automatic token refresh
- **Reconnection**: WebSocket reconnection on auth restore
- **Cache Reset**: Full resync after long disconnection

### Data Corruption
- **Cache Clearing**: Automatic reset on DB version mismatch
- **Rebuild Logic**: Complete cache reconstruction from sync stream
- **Version Tracking**: `CURRENT_DB_VERSION` triggers fresh start

## Performance Optimizations

### 1. Intelligent Caching
- **Lazy Loading**: Data loaded only when needed
- **Incremental Updates**: Only changed data transferred via WebSocket
- **Background Sync**: Updates happen transparently

### 2. Memory Management
- **IndexedDB**: Handles large datasets efficiently
- **Pagination**: Client-side pagination for large lists
- **Streaming**: Sync stream processes data incrementally

### 3. Query Optimization
- **Local Filtering**: Complex queries executed locally
- **Index Utilization**: IndexedDB indexes for fast lookups
- **Result Caching**: Frequently accessed query results cached

## Implementation Examples

### Adding a New Entity

To add a new cached entity following this pattern:

1. **Add store name to tableRegistry.ts** (single source of truth):
```typescript
// In SIMPLE_STORES (or INDEXED_STORES if indexes needed):
'my_entities',

// In GENERIC_SLICE_STORES:
'my_entities',
```

2. **Bump Version** (DB.ts):
```typescript
const CURRENT_DB_VERSION = '1.19.0';
```

3. **(Optional) Add to DataManager Core Keys** if needed at startup:
```typescript
const coreKeys = [
  // ... existing keys
  'myEntities',  // camelCase version
];
```

**Naming Convention (auto-derived from store name):**
- `my_entities` → table: `wh_my_entities`, endpoint: `/my-entities`, slice: `myEntities`
- For exceptions, add to `SPECIAL_TABLE_NAMES` in tableRegistry.ts

## Current Implementation Status

### **Simplified Architecture**

**After Recent Cleanup:**
- **~1,200 lines removed** from data layer
- **Single source of truth**: `tableRegistry.ts` defines all stores
- **Auto-derived naming**: table/endpoint/slice computed from snake_case store name
- **Both DB.ts and genericSlices.ts import from tableRegistry.ts**
- **Simplified GenericCache**: CRUD-only, no integrity hashing
- **Unified Events**: TaskEvents wraps GenericEvents
- **Loop-based exports**: No manual listing of eventNames, actions, etc.

### Custom Slice (Advanced Features)
- **Tasks Only**: Complete with local query engine, real-time updates, custom caching

### Generic Slices (Automated CRUD)
- **60+ Tables Using Generic Factory**: All simple CRUD operations
- **Zero Boilerplate**: All slices generated from single-line configuration
- **Full Real-Time Support**: Automatic cache registry integration
- **Type Safety**: Complete TypeScript integration
- **Automatic Cache Management**: No manual cache setup required
- **Lazy Loading**: Auto-initialize on first access for optimal performance

### Real-Time Features
- **WebSocket Connection**: Production-ready with reconnection logic
- **Change Notifications**: Automatic cache updates from database changes
- **Multi-tenant Support**: Subdomain-aware connection routing

## Example References

- **Redux Store**: `src/store/store.ts`
- **Table Registry**: `src/store/tableRegistry.ts` (single source of truth)
- **Generic Slice Factory**: `src/store/genericSliceFactory.ts`, `src/store/genericSlices.ts`
- **Custom Caches**: `TasksCache.ts`, `GenericCache.ts`
- **Cache Registry**: `CacheRegistry.ts` (routes database changes to caches)
- **Real-Time Updates**: `RTL.ts`, `taskEvents.ts`
- **Data Manager**: `DataManager.ts` (sync stream orchestration)
- **IndexedDB Wrapper**: `DB.ts` (store definitions and operations)
- **Authentication Integration**: `AuthProvider.tsx`

This architecture provides a robust, scalable foundation for data management in the Whagons application, ensuring excellent performance, offline capability, and real-time synchronization across all client instances.
