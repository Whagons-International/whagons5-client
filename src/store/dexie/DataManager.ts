/**
 * DataManager - Handles data sync using Dexie
 * 
 * Replaces the old DataManager that used DuckDB/IndexedDB/Redux.
 * Now just streams data directly into Dexie tables.
 */

import { db } from './db';
import { getCollectionByTable } from './collections';
import { auth } from '@/firebase/firebaseConfig';
import { api as apiClient } from '../api/internalApi';
import { ApiLoadingTracker } from '@/api/apiLoadingTracker';

export class DataManager {
  /**
   * Bootstrap and sync all data from the server
   */
  async bootstrapAndSync(): Promise<void> {
    console.log('[Dexie] bootstrapAndSync() starting...');
    
    // Ensure Dexie is open
    if (!db.isOpen()) {
      await db.open();
    }
    console.log('[Dexie] DB ready');

    // Call bootstrap endpoint to establish tenant context
    try {
      await apiClient.get('/bootstrap');
    } catch (error) {
      console.warn('[Dexie] bootstrap failed', error);
    }

    // Check cursor and last sync
    const cursorKey = this.getCursorKey();
    const cursor = cursorKey ? localStorage.getItem(cursorKey) : null;
    const lastSyncKey = this.getLastSyncKey();
    const lastSyncAt = lastSyncKey ? Number(localStorage.getItem(lastSyncKey) || 0) : 0;

    console.log('[Dexie] Sync state:', {
      cursor: cursor ? `${cursor.substring(0, 30)}...` : null,
      lastSyncAt,
      timeSinceLastSync: lastSyncAt ? `${Math.round((Date.now() - lastSyncAt) / 1000)}s ago` : 'never',
    });

    // Check if we have local data
    let hasLocalData = false;
    try {
      const [workspaces, teams, categories] = await Promise.all([
        db.table('workspaces').count(),
        db.table('teams').count(),
        db.table('categories').count(),
      ]);
      hasLocalData = workspaces > 0 || teams > 0 || categories > 0;
      console.log('[Dexie] Local data check:', { hasLocalData, workspaces, teams, categories });
    } catch (error) {
      console.warn('[Dexie] failed to check local data', error);
    }

    // Skip sync if recent sync with local data
    const shouldSkipSync = hasLocalData && !!cursor && lastSyncAt > 0 && Date.now() - lastSyncAt < 30_000;
    
    if (shouldSkipSync) {
      console.log('[Dexie] Skipping sync (recent sync with local data)');
      return;
    }

    // Run sync stream
    console.log('[Dexie] Starting sync stream...', cursor ? 'with cursor' : 'full sync');
    const didSync = await this.syncStream(cursor || undefined);
    
    if (didSync && lastSyncKey) {
      localStorage.setItem(lastSyncKey, String(Date.now()));
    }
    console.log('[Dexie] bootstrapAndSync() complete');
  }

  private getCursorKey(): string | null {
    const tenant = localStorage.getItem('whagons-subdomain') || '';
    const uid = auth.currentUser?.uid || 'anon';
    return `wh_sync_cursor:${tenant}:${uid}`;
  }

  private getLastSyncKey(): string | null {
    const tenant = localStorage.getItem('whagons-subdomain') || '';
    const uid = auth.currentUser?.uid || 'anon';
    return `wh_sync_last_completed:${tenant}:${uid}`;
  }

  private async resetAndResync(): Promise<void> {
    console.log('[Dexie] Resetting database and resyncing...');
    
    // Clear cursor
    const cursorKey = this.getCursorKey();
    if (cursorKey) {
      localStorage.removeItem(cursorKey);
    }

    // Delete all data from all tables
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
      }
    });

    // Resync
    await this.syncStream();
  }

  private async syncStream(cursor?: string): Promise<boolean> {
    ApiLoadingTracker.increment();
    
    // Build URL with tenant subdomain
    const subdomain = localStorage.getItem('whagons-subdomain') || '';
    const isDev = import.meta.env.VITE_DEVELOPMENT === 'true';
    const protocol = isDev ? 'http' : 'https';
    const apiHost = import.meta.env.VITE_API_URL || 'localhost:8000';
    const baseUrl = `${protocol}://${subdomain}${apiHost}/api`;
    
    const authHeader = (apiClient.defaults.headers.common as any)?.Authorization as string | undefined;
    const headers: HeadersInit = {
      Accept: 'application/x-ndjson, application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const url = cursor 
      ? `${baseUrl}/sync/stream?cursor=${encodeURIComponent(cursor)}` 
      : `${baseUrl}/sync/stream`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    // Batch buffers for efficient writes
    const batches: Map<string, any[]> = new Map();
    const BATCH_SIZE = 200;
    let batchFlushTimer: ReturnType<typeof setTimeout> | null = null;

    // Snapshot tracking for pivot tables
    const activeSnapshots = new Map<string, Set<string | number>>();
    const cursorKey = this.getCursorKey();

    const flushBatches = async () => {
      if (batchFlushTimer) {
        clearTimeout(batchFlushTimer);
        batchFlushTimer = null;
      }

      const entries = Array.from(batches.entries());
      batches.clear();

      for (const [storeName, rows] of entries) {
        if (rows.length === 0) continue;
        
        try {
          // Separate deletes (soft-deleted) from upserts
          const toDelete = rows.filter(r => r.deleted_at != null);
          const toUpsert = rows.filter(r => r.deleted_at == null);

          if (toDelete.length > 0) {
            const ids = toDelete.map(r => r.id).filter(id => id != null);
            if (ids.length > 0) {
              await db.table(storeName).bulkDelete(ids);
            }
          }

          if (toUpsert.length > 0) {
            await db.table(storeName).bulkPut(toUpsert);
          }

          console.log(`[Dexie] Flushed ${storeName}: ${toUpsert.length} upserts, ${toDelete.length} deletes`);
        } catch (error) {
          console.error(`[Dexie] Failed to flush ${storeName}:`, error);
        }
      }
    };

    const scheduleBatchFlush = () => {
      if (batchFlushTimer) return;
      batchFlushTimer = setTimeout(() => {
        void flushBatches();
      }, 100);
    };

    const addToBatch = (storeName: string, row: any) => {
      if (!batches.has(storeName)) {
        batches.set(storeName, []);
      }
      batches.get(storeName)!.push(row);

      if (batches.get(storeName)!.length >= BATCH_SIZE) {
        void flushBatches();
      } else {
        scheduleBatchFlush();
      }
    };

    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include',
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 400) {
          await this.resetAndResync();
          return true;
        }
        throw new Error(`Sync stream failed: ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let needsResync = false;
      let doneReceived = false;

      const handleLine = async (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        let msg: any;
        try {
          msg = JSON.parse(trimmed);
        } catch {
          console.warn('[Dexie] failed to parse sync line');
          return;
        }

        // Handle meta messages
        if (msg.type === 'meta') {
          const requires = Array.isArray(msg.requires_resync) ? msg.requires_resync : [];
          if (requires.includes('visibility')) {
            needsResync = true;
          }
          return;
        }

        // Handle cursor checkpoints
        if (msg.type === 'checkpoint' && cursorKey && msg.cursor) {
          localStorage.setItem(cursorKey, msg.cursor);
          return;
        }

        // Handle done message
        if (msg.type === 'done' && cursorKey && msg.next_cursor) {
          console.log('[Dexie] Received done message, saving cursor');
          localStorage.setItem(cursorKey, msg.next_cursor);
          doneReceived = true;
          return;
        }

        // Handle snapshot start (for pivot tables)
        if (msg.type === 'snapshot_start' && msg.entity) {
          activeSnapshots.set(msg.entity, new Set());
          return;
        }

        // Handle snapshot end (delete rows not in snapshot)
        if (msg.type === 'snapshot_end' && msg.entity) {
          const snapshotIds = activeSnapshots.get(msg.entity);
          if (snapshotIds) {
            activeSnapshots.delete(msg.entity);
            
            // Flush any pending batches for this entity first
            await flushBatches();

            // Find the store name from table name (e.g., 'wh_user_team' -> 'user_teams')
            const storeName = this.tableToStore(msg.entity);
            if (storeName) {
              try {
                const allRows = await db.table(storeName).toArray();
                const toDelete = allRows
                  .filter((row: any) => !snapshotIds.has(row.id) && !snapshotIds.has(String(row.id)))
                  .map((row: any) => row.id);
                
                if (toDelete.length > 0) {
                  await db.table(storeName).bulkDelete(toDelete);
                  console.log(`[Dexie] Snapshot cleanup ${storeName}: deleted ${toDelete.length} rows`);
                }
              } catch (error) {
                console.warn(`[Dexie] snapshot cleanup failed for ${msg.entity}`, error);
              }
            }
          }
          return;
        }

        // Handle data messages (upsert/delete)
        const table = msg.entity;
        const id = msg.id;
        if (!table || id == null) return;

        // Track IDs for active snapshots
        const snapshotSet = activeSnapshots.get(table);
        if (snapshotSet) {
          snapshotSet.add(id);
        }

        // Find store name from table name
        const storeName = this.tableToStore(table);
        if (!storeName) {
          return;
        }

        if (msg.type === 'delete') {
          addToBatch(storeName, { id, deleted_at: new Date().toISOString() });
        } else if (msg.type === 'upsert') {
          const record = msg.record;
          if (record) {
            addToBatch(storeName, record);
          }
        }
      };

      // Read stream
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        
        for (const line of lines) {
          await handleLine(line);
        }
        
        if (doneReceived) {
          try {
            await reader.cancel();
          } catch {}
          break;
        }
      }

      // Handle remaining buffer
      if (buffer.trim()) {
        await handleLine(buffer);
      }

      // Final flush
      console.log('[Dexie] Stream complete, final flush');
      await flushBatches();

      // Handle resync if needed
      if (needsResync) {
        await this.resetAndResync();
        return true;
      }

      // Log final counts
      try {
        const [tasks, workspaces, users] = await Promise.all([
          db.table('tasks').count(),
          db.table('workspaces').count(),
          db.table('users').count(),
        ]);
        console.log('[Dexie] Final counts:', { tasks, workspaces, users });
      } catch {}

      return true;
    } finally {
      if (batchFlushTimer) clearTimeout(batchFlushTimer);
      clearTimeout(timeout);
      try { controller.abort(); } catch {}
      ApiLoadingTracker.decrement();
    }
  }

  /**
   * Convert backend table name to Dexie store name
   * e.g., 'wh_tasks' -> 'tasks', 'wh_user_team' -> 'user_teams'
   */
  private tableToStore(tableName: string): string | null {
    // Remove 'wh_' prefix
    if (!tableName.startsWith('wh_')) {
      return null;
    }
    const storeName = tableName.slice(3); // Remove 'wh_'

    // Check if this store exists in Dexie
    try {
      db.table(storeName);
      return storeName;
    } catch {
      // Try common variations
      // e.g., 'user_team' -> 'user_teams'
      const variations = [
        storeName,
        storeName + 's',           // user_team -> user_teams
        storeName.replace(/_s$/, ''), // task_users -> task_user (unlikely)
      ];

      for (const variant of variations) {
        try {
          db.table(variant);
          return variant;
        } catch {}
      }

      console.warn(`[Dexie] No store found for table: ${tableName}`);
      return null;
    }
  }

  /**
   * Clear all data and reset sync state
   */
  async reset(): Promise<void> {
    const cursorKey = this.getCursorKey();
    if (cursorKey) {
      localStorage.removeItem(cursorKey);
    }
    
    const lastSyncKey = this.getLastSyncKey();
    if (lastSyncKey) {
      localStorage.removeItem(lastSyncKey);
    }

    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
      }
    });
  }
}

// Singleton instance
let dataManagerInstance: DataManager | null = null;

export function getDataManager(): DataManager {
  if (!dataManagerInstance) {
    dataManagerInstance = new DataManager();
  }
  return dataManagerInstance;
}
