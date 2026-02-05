import { auth } from '@/firebase/firebaseConfig';
import { 
  SIMPLE_STORES, 
  INDEXED_STORES, 
  SPECIAL_KEYPATH_STORES 
} from '../tableRegistry';

// Current database version - increment when schema changes
const CURRENT_DB_VERSION = '1.18.0';
const DB_VERSION_KEY = 'indexeddb_version';

// Type union for all store names
type SimpleStoreName = typeof SIMPLE_STORES[number];
type IndexedStoreName = keyof typeof INDEXED_STORES;
type SpecialStoreName = keyof typeof SPECIAL_KEYPATH_STORES;
type AllStoreName = SimpleStoreName | IndexedStoreName | SpecialStoreName;

// ============================================================================
// DB CLASS
// ============================================================================

export class DB {
  static db: IDBDatabase;
  static inited = false;
  private static nuking = false;
  private static deleting = false;
  private static initPromise: Promise<boolean> | null = null;
  private static storeQueues: Map<string, Promise<any>> = new Map();

  private static runExclusive<T>(storeName: string, fn: () => Promise<T>): Promise<T> {
    const tail = DB.storeQueues.get(storeName) || Promise.resolve();
    const next = tail.catch(() => {}).then(fn);
    DB.storeQueues.set(storeName, next.catch(() => {}));
    return next;
  }

  static async init(uid?: string): Promise<boolean> {
    if (DB.inited) return true;
    if (DB.initPromise) {
      const ok = await DB.initPromise.catch(() => false);
      if (DB.inited && DB.db) return true;
      if (uid && !ok) {
        // Retry initialization with the explicit uid
      } else {
        return ok;
      }
    }

    DB.initPromise = (async () => {
      const userID = await DB.waitForUID(uid);
      if (!userID) {
        try { console.warn('DB.init: no user id available after waiting'); } catch {}
        DB.initPromise = null;
        return false as any;
      }

      try {
        console.log('DB.init: starting', {
          uid: userID,
          secureContext: (globalThis as any).isSecureContext,
          hasIndexedDB: typeof indexedDB !== 'undefined',
          locationProtocol: (globalThis as any).location?.protocol,
        });
      } catch {}

      // Check stored version against current version
      const storedVersion = localStorage.getItem(DB_VERSION_KEY);
      const shouldResetDatabase = storedVersion !== CURRENT_DB_VERSION;

      if (shouldResetDatabase && storedVersion) {
        console.log(
          `DB.init: Version changed from ${storedVersion} to ${CURRENT_DB_VERSION}, resetting database`,
          userID
        );
        await DB.deleteDatabase(userID);
      }

      localStorage.setItem(DB_VERSION_KEY, CURRENT_DB_VERSION);

      const request = indexedDB.open(userID, 1);

      const db = await new Promise<IDBDatabase>((resolve, _reject) => {
        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          try { console.log('DB.init: onupgradeneeded'); } catch {}
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create simple stores (keyPath: 'id', no indexes)
          for (const name of SIMPLE_STORES) {
            if (!db.objectStoreNames.contains(name)) {
              db.createObjectStore(name, { keyPath: 'id' });
            }
          }
          
          // Create stores with indexes
          for (const [name, config] of Object.entries(INDEXED_STORES)) {
            if (!db.objectStoreNames.contains(name)) {
              const store = db.createObjectStore(name, { keyPath: config.keyPath });
              for (const idx of config.indexes) {
                store.createIndex(idx.name, idx.keyPath, { unique: idx.unique ?? false });
              }
            }
          }
          
          // Create stores with special keyPaths
          for (const [name, config] of Object.entries(SPECIAL_KEYPATH_STORES)) {
            if (!db.objectStoreNames.contains(name)) {
              db.createObjectStore(name, { keyPath: config.keyPath });
            }
          }
        };

        request.onerror = () => {
          console.error('DB.init: Error opening database:', request.error);
          _reject(request.error as any);
        };
        request.onblocked = () => {
          console.warn('DB.init: open request blocked - another tab/window may be holding the database open');
        };
        request.onsuccess = () => {
          try { console.log('DB.init: open success'); } catch {}
          resolve(request.result);
        };
      });

      DB.db = db;
      try {
        DB.db.onversionchange = () => {
          try { console.warn('DB.onversionchange: closing DB connection'); } catch {}
          try { DB.db?.close(); } catch {}
          DB.inited = false;
          DB.deleting = false;
        };
      } catch {}
      DB.inited = true;
      DB.deleting = false;
      try { console.log('DB.init: DB assigned and inited set to true'); } catch {}
      DB.initPromise = null as any;
      return true as any;
    })();

    await DB.initPromise;
    return DB.inited;
  }

  public static async whenReady(timeoutMs: number = 5000): Promise<boolean> {
    if (DB.inited && DB.db) return true;
    const start = Date.now();
    while (!(DB.inited && DB.db)) {
      if (DB.initPromise) {
        try { await DB.initPromise; } catch {}
      } else {
        await new Promise((r) => setTimeout(r, 10));
      }
      if (DB.inited && DB.db) return true;
      if (Date.now() - start > timeoutMs) {
        try { console.warn('DB.whenReady: timed out waiting for DB readiness'); } catch {}
        return false;
      }
    }
    return true;
  }

  private static async waitForUID(prefUid?: string, timeoutMs: number = 15000): Promise<string | null> {
    if (prefUid) return prefUid;
    const start = Date.now();
    let current: string | undefined | null = auth.currentUser?.uid;
    while (!current) {
      await new Promise((r) => setTimeout(r, 20));
      current = auth.currentUser?.uid;
      if (current) break;
      if (Date.now() - start > timeoutMs) return null;
    }
    return current as string;
  }

  public static async deleteDatabase(userID: string): Promise<void> {
    DB.deleting = true;
    sessionStorage.clear();

    // Clear all cache initialization flags from localStorage
    if (auth.currentUser?.uid) {
      const userId = auth.currentUser.uid;
      const flagPrefixes = ['workspaceCache', 'teamsCache', 'categoriesCache', 'tasksCache'];
      for (const prefix of flagPrefixes) {
        localStorage.removeItem(`${prefix}Initialized-${userId}`);
        localStorage.removeItem(`${prefix}LastUpdated-${userId}`);
      }
      console.log(`Cleared all cache flags for user ${userId}`);
    }

    // Close existing connection
    if (DB.inited && DB.db) {
      try {
        DB.db.close();
        console.log('Closed existing database connection');
      } catch (err) {
        console.error('Error closing database connection:', err);
      }
      DB.inited = false;
      DB.db = undefined as unknown as IDBDatabase;
    }

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('Database deletion timed out after 5 seconds');
        DB.deleting = false;
        resolve();
      }, 5000);

      try {
        const request = indexedDB.deleteDatabase(userID);

        request.onsuccess = () => {
          clearTimeout(timeout);
          console.log('Database successfully deleted');
          DB.deleting = false;
          resolve();
        };

        request.onerror = () => {
          clearTimeout(timeout);
          console.error('Error deleting database:', request.error);
          DB.deleting = false;
          resolve();
        };

        request.onblocked = () => {
          console.warn('Database deletion blocked - connections still open');
        };
      } catch (err) {
        clearTimeout(timeout);
        console.error('Exception during database deletion:', err);
        DB.deleting = false;
        resolve();
      }
    });
  }

  public static getStoreRead(name: AllStoreName, mode: IDBTransactionMode = 'readonly') {
    if (DB.deleting) throw new Error('DB deletion in progress');
    if (!DB.inited) throw new Error('DB not initialized');
    if (!DB.db) throw new Error('DB not initialized');
    return DB.db.transaction(name, mode).objectStore(name);
  }

  public static getStoreWrite(name: AllStoreName, mode: IDBTransactionMode = 'readwrite') {
    if (!DB.inited) throw new Error('DB not initialized');
    if (!DB.db) throw new Error('DB not initialized');
    return DB.db.transaction(name, mode).objectStore(name);
  }

  private static toKey(key: number | string): number | string {
    const n = Number(key);
    return isNaN(n) ? key : n;
  }

  public static async getAll(storeName: string): Promise<any[]> {
    return DB.runExclusive(storeName, async () => {
      if (DB.nuking) {
        console.warn('[DB] getAll skipped during nuking');
        return [] as any[];
      }
      if (DB.deleting) {
        console.warn('[DB] getAll skipped during deletion');
        return [] as any[];
      }
      if (!DB.inited) await DB.init();
      if (!DB.inited || !DB.db) {
        console.warn(`[DB] getAll: DB not initialized for ${storeName}`);
        return [] as any[];
      }

      let rows: any[];
      try {
        const tx = DB.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName as any);
        rows = await new Promise<any[]>((resolve, reject) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error as any);
        });
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error as any);
          tx.onabort = () => reject(tx.error as any);
        });
      } catch (error: any) {
        if (error?.name === 'InvalidStateError' || error?.message?.includes('connection is closing')) {
          console.warn(`[DB] getAll: InvalidStateError for ${storeName}, retrying after DB reinit`);
          DB.inited = false;
          DB.db = undefined as unknown as IDBDatabase;
          await new Promise(resolve => setTimeout(resolve, 100));
          await DB.init();
          if (!DB.inited || !DB.db || DB.deleting) {
            console.warn(`[DB] getAll: DB not ready after retry for ${storeName}`);
            return [] as any[];
          }
          const tx = DB.db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName as any);
          rows = await new Promise<any[]>((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error as any);
          });
          await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error as any);
            tx.onabort = () => reject(tx.error as any);
          });
        } else {
          throw error;
        }
      }
      
      return rows.filter((r) => r != null);
    });
  }

  public static async get(storeName: string, key: number | string): Promise<any | null> {
    return DB.runExclusive(storeName, async () => {
      if (DB.nuking) {
        console.warn('[DB] get skipped during nuking');
        return null;
      }
      if (DB.deleting) {
        console.warn('[DB] get skipped during deletion');
        return null;
      }
      if (!DB.inited) await DB.init();
      if (!DB.inited || !DB.db) {
        console.warn(`[DB] get: DB not initialized for ${storeName}`);
        return null;
      }
      
      let rec: any;
      try {
        const tx = DB.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName as any);
        rec = await new Promise<any>((resolve, reject) => {
          const req = store.get(DB.toKey(key));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error as any);
        });
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error as any);
          tx.onabort = () => reject(tx.error as any);
        });
      } catch (error: any) {
        if (error?.name === 'InvalidStateError' || error?.message?.includes('connection is closing')) {
          console.warn(`[DB] get: InvalidStateError for ${storeName}, retrying after DB reinit`);
          DB.inited = false;
          DB.db = undefined as unknown as IDBDatabase;
          await new Promise(resolve => setTimeout(resolve, 100));
          await DB.init();
          if (!DB.inited || !DB.db || DB.deleting) {
            console.warn(`[DB] get: DB not ready after retry for ${storeName}`);
            return null;
          }
          const tx = DB.db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName as any);
          rec = await new Promise<any>((resolve, reject) => {
            const req = store.get(DB.toKey(key));
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error as any);
          });
          await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error as any);
            tx.onabort = () => reject(tx.error as any);
          });
        } else {
          throw error;
        }
      }
      if (!rec) return null;
      return rec;
    });
  }

  public static async put(storeName: string, row: any): Promise<void> {
    const rowCopy = row ? JSON.parse(JSON.stringify(row)) : null;

    return DB.runExclusive(storeName, async () => {
      if (DB.deleting) {
        console.warn('[DB] put skipped during deletion');
        return;
      }
      if (!DB.inited) await DB.init();

      if (!rowCopy) {
        console.error(`DB.put: Row copy is null/undefined for ${storeName}`, { originalRow: row });
        throw new Error(`Cannot put null/undefined row to ${storeName}`);
      }

      const payload: any = rowCopy;

      try {
        const tx = DB.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName as any);
        const putRequest = store.put(payload);

        putRequest.onerror = (event) => {
          console.error(`DB.put: IndexedDB put request failed for ${storeName}`, {
            error: putRequest.error,
            event,
            payload,
            storeName
          });
        };
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error as any);
          tx.onabort = () => reject(tx.error as any);
        });
      } catch (error: any) {
        if (error?.name === 'InvalidStateError' || error?.message?.includes('connection is closing')) {
          console.warn(`[DB] put: InvalidStateError for ${storeName}, retrying after DB reinit`);
          DB.inited = false;
          DB.db = undefined as unknown as IDBDatabase;
          await new Promise(resolve => setTimeout(resolve, 100));
          await DB.init();
          if (!DB.inited || !DB.db || DB.deleting) {
            console.warn(`[DB] put: DB not ready after retry for ${storeName}`);
            return;
          }
          const tx = DB.db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName as any);
          const putRequest = store.put(payload);
          putRequest.onerror = (event) => {
            console.error(`DB.put: IndexedDB put request failed for ${storeName}`, {
              error: putRequest.error,
              event,
              payload,
              storeName
            });
          };
          await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error as any);
            tx.onabort = () => reject(tx.error as any);
          });
        } else {
          throw error;
        }
      }
    });
  }

  public static async bulkPut(storeName: string, rows: any[]): Promise<void> {
    return DB.runExclusive(storeName, async () => {
      if (DB.deleting) {
        console.warn('[DB] bulkPut skipped during deletion');
        return;
      }
      if (!DB.inited) await DB.init();

      const payloads: any[] = rows;
      try {
        const tx = DB.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName as any);
        for (const p of payloads) store.put(p);
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error as any);
          tx.onabort = () => reject(tx.error as any);
        });
      } catch (error: any) {
        if (error?.name === 'InvalidStateError' || error?.message?.includes('connection is closing')) {
          console.warn(`[DB] bulkPut: InvalidStateError for ${storeName}, retrying after DB reinit`);
          DB.inited = false;
          DB.db = undefined as unknown as IDBDatabase;
          await new Promise(resolve => setTimeout(resolve, 100));
          await DB.init();
          if (!DB.inited || !DB.db || DB.deleting) {
            console.warn(`[DB] bulkPut: DB not ready after retry for ${storeName}`);
            return;
          }
          const tx = DB.db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName as any);
          for (const p of payloads) store.put(p);
          await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error as any);
            tx.onabort = () => reject(tx.error as any);
          });
        } else {
          throw error;
        }
      }
    });
  }

  public static async delete(storeName: string, key: number | string): Promise<void> {
    return DB.runExclusive(storeName, async () => {
      if (!DB.inited) await DB.init();
      if (!DB.inited || !DB.db) {
        throw new Error('DB not initialized');
      }
      
      const tx = DB.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName as any);
      const deleteRequest = store.delete(DB.toKey(key));
      
      deleteRequest.onerror = (event) => {
        console.error(`DB.delete: IndexedDB delete request failed for ${storeName}`, {
          error: deleteRequest.error,
          event,
          key,
          storeName
        });
      };
      
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error as any);
        tx.onabort = () => reject(tx.error as any);
      });
    });
  }

  public static async clear(storeName: string): Promise<void> {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('wh-debug-db') === 'true') {
      console.log(`[DB] Clearing IndexedDB store: ${storeName}`);
    }
    return DB.runExclusive(storeName, async () => {
      if (!DB.inited) await DB.init();
      if (!DB.inited || !DB.db) {
        throw new Error('DB not initialized');
      }
      
      const tx = DB.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName as any);
      const clearRequest = store.clear();
      
      clearRequest.onerror = (event) => {
        console.error(`DB.clear: IndexedDB clear request failed for ${storeName}`, {
          error: clearRequest.error,
          event,
          storeName
        });
      };
      
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error as any);
        tx.onabort = () => reject(tx.error as any);
      });
    });
  }
}
