# Store Architecture

## Overview

The application uses a **3-tier caching strategy**:

```
API Server → IndexedDB (Local Cache) → Redux Store → React Components
```

**Key benefits:**
- Offline support with local data
- Sub-millisecond access to cached data
- Real-time updates via WebSocket
- Persistence across sessions

## Directory Structure

```
store/
├── tableRegistry.ts        # Single source of truth for all tables
├── genericSlices.ts        # Auto-generated Redux slices (60+ tables)
├── genericSliceFactory.ts  # Factory for creating generic slices
├── DataManager.ts          # Sync stream orchestration
├── store.ts                # Redux store configuration
├── types.ts                # TypeScript interfaces (manual, TODO: generate from OpenAPI)
│
├── reducers/               # Custom slices (special cases only)
│   ├── tasksSlice.ts           # Tasks with pivot_changes handling
│   ├── rolesSlice.ts           # Roles (not a wh_* table, fetched directly)
│   ├── uiStateSlice.ts         # UI state (filters, grouping)
│   ├── whiteboardSlice.ts      # Client-only Excalidraw data
│   ├── tenantAvailabilitySlice.ts  # Tenant availability with TTL cache
│   ├── notificationPreferencesSlice.ts
│   └── notificationThunks.ts
│
├── indexedDB/              # IndexedDB layer
│   ├── DB.ts                   # Core IndexedDB wrapper
│   ├── GenericCache.ts         # CRUD cache for 60+ tables
│   ├── CacheRegistry.ts        # Routes WebSocket changes to caches
│   ├── TasksCache.ts           # Tasks with local query engine
│   ├── AvatarCache.ts          # Avatar blob caching
│   └── WhiteboardCache.ts      # Whiteboard data (keyed by workspaceId)
│
├── realTimeListener/       # WebSocket for real-time updates
│   └── RTL.ts
│
├── eventEmiters/           # Event system for UI updates
│   └── taskEvents.ts
│
└── actions/                # Standalone action creators
    ├── approvalDecisions.ts
    └── kpiCards.ts
```

## Adding a New Table

### 1. Edit `tableRegistry.ts` (single source of truth)

```typescript
// In SIMPLE_STORES (or INDEXED_STORES if indexes needed):
'your_entities',

// In GENERIC_SLICE_STORES:
'your_entities',
```

### 2. Bump version in `DB.ts`

```typescript
const CURRENT_DB_VERSION = '1.19.0';
```

**That's it!** Everything else is auto-generated:
- Redux slice with `getFromIndexedDB`, `fetchFromAPI`, `addAsync`, `updateAsync`, `removeAsync`
- GenericCache instance
- CacheRegistry entry for WebSocket updates
- Event emission system

### Naming Convention (auto-derived from store name)

| Store Name | Table | Endpoint | Slice Name |
|------------|-------|----------|------------|
| `your_entities` | `wh_your_entities` | `/your-entities` | `yourEntities` |

For exceptions, add to `SPECIAL_TABLE_NAMES` in `tableRegistry.ts`.

## Usage in Components

```typescript
import { useSelector, useDispatch } from 'react-redux';
import { genericActions } from '@/store/genericSlices';

const MyComponent = () => {
  const dispatch = useDispatch();
  const { value, loading, error } = useSelector(state => state.yourEntities);

  // CRUD operations (with optimistic updates)
  dispatch(genericActions.yourEntities.addAsync(newItem));
  dispatch(genericActions.yourEntities.updateAsync({ id: 1, updates: {...} }));
  dispatch(genericActions.yourEntities.removeAsync(1));

  return <div>{value.map(item => <span key={item.id}>{item.name}</span>)}</div>;
};
```

## Data Flow

### Initial Load

```
User Authenticates
  → DataManager.bootstrapAndSync()
  → GET /api/bootstrap (tenant context)
  → GET /api/sync/stream (NDJSON streaming)
  → Data written to IndexedDB caches
  → Redux store hydrated from IndexedDB
  → Components render via useSelector
```

### Real-Time Updates

```
PostgreSQL Trigger (INSERT/UPDATE/DELETE)
  → pg_notify()
  → whagonsRTE (Go WebSocket server)
  → RTL.ts receives message
  → CacheRegistry routes to appropriate cache
  → IndexedDB updated
  → syncReduxForTable() refreshes Redux
  → Components re-render
```

## Special Cases

### TasksCache (Local Query Engine)

Tasks have a custom cache with advanced features:

1. **Dual store management** - `tasks` + `shared_tasks` stores
2. **In-memory cache with 10s TTL** - Avoids hitting IndexedDB repeatedly
3. **Local query engine** - Filter, sort, paginate offline
4. **Full-text search** - Searches task fields + related entities
5. **AG Grid filterModel support** - Direct integration with grid

### Roles Slice

Roles are NOT a `wh_*` table and don't use the sync stream. They're fetched directly from API early in the boot process:

```typescript
// In DataManager.loadCoreFromIndexedDB():
await this.dispatch(fetchRoles()); // Direct API call, not sync stream
```

### UI State Slice

Pure client-side UI state (filters, grouping, presets). Not persisted to backend.

## Event System

Listen for data changes:

```typescript
import { genericEvents, genericEventNames } from '@/store/genericSlices';

useEffect(() => {
  const unsubscribe = genericEvents.on(
    genericEventNames.workspaces.UPDATED,
    (data) => console.log('Workspace updated:', data)
  );
  return unsubscribe;
}, []);
```

Event types: `CREATED`, `UPDATED`, `DELETED`, `BULK_UPDATE`, `CACHE_INVALIDATE`

## Performance Notes

- **Lazy loading**: Data loaded only when accessed
- **Incremental sync**: Cursor-based sync fetches only changes
- **Priority tables**: Core tables synced to Redux first for faster UI
- **Batched tasks**: Task records batched (200 at a time) during sync
- **In-memory cache**: TasksCache keeps recent queries in memory

## Files to Edit When Adding Features

| Change | Files |
|--------|-------|
| New table | `tableRegistry.ts`, bump version in `DB.ts` |
| Table with indexes | Add to `INDEXED_STORES` in `tableRegistry.ts` |
| Custom slice logic | Create file in `reducers/` |
| Custom cache logic | Create file in `indexedDB/` |
| New event type | Extend `GenericEvents.getEvents()` in `genericSliceFactory.ts` |
