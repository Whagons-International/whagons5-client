/**
 * RTL Handler for Dexie
 * 
 * Handles real-time publication messages from the WebSocket and writes to Dexie.
 * Since Dexie's useLiveQuery automatically reacts to changes, no Redux sync needed.
 */

import { db } from './db';

// Map table names to store names (e.g., 'wh_tasks' -> 'tasks')
function tableToStore(tableName: string): string | null {
  if (!tableName.startsWith('wh_')) {
    return null;
  }
  
  const storeName = tableName.slice(3);
  
  // Check if store exists
  try {
    db.table(storeName);
    return storeName;
  } catch {
    // Try with 's' suffix
    const plural = storeName + 's';
    try {
      db.table(plural);
      return plural;
    } catch {}
  }
  
  return null;
}

/**
 * Handle a publication message from RTL
 */
export async function handleRTLPublication(data: {
  table?: string;
  operation?: string;
  new_data?: any;
  old_data?: any;
}): Promise<void> {
  const { table, operation, new_data, old_data } = data;
  
  if (!table) return;
  
  const storeName = tableToStore(table);
  if (!storeName) {
    // Unknown table - ignore
    return;
  }

  const op = operation?.toUpperCase();

  try {
    switch (op) {
      case 'INSERT':
        if (new_data && new_data.id != null) {
          // Check for soft-delete
          if (new_data.deleted_at != null) {
            await db.table(storeName).delete(new_data.id);
          } else {
            await db.table(storeName).put(new_data);
          }
        }
        break;

      case 'UPDATE':
        if (new_data && new_data.id != null) {
          // Check for soft-delete
          if (new_data.deleted_at != null) {
            await db.table(storeName).delete(new_data.id);
          } else {
            await db.table(storeName).put(new_data);
          }
        }
        break;

      case 'DELETE':
        if (old_data && old_data.id != null) {
          await db.table(storeName).delete(old_data.id);
        }
        break;
    }
  } catch (error) {
    console.error(`[Dexie RTL] Error handling ${op} for ${table}:`, error);
  }
}

/**
 * Integrate with RTL instance
 * Call this when setting up RTL to wire up the publication handler
 */
export function setupRTLDexieHandler(rtl: { on: (event: string, handler: (data: any) => void) => () => void }): () => void {
  return rtl.on('publication:received', (data) => {
    handleRTLPublication(data).catch(err => {
      console.error('[Dexie RTL] Publication handler error:', err);
    });
  });
}
