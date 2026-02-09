import { auth } from '@/firebase/firebaseConfig';


import { Logger } from '@/utils/logger';
// Current database version - increment when schema changes
const CURRENT_DB_VERSION = '1.23.0';
const DB_VERSION_KEY = 'indexeddb_version';

//static class to access the message cache
// Export the DB class
export class DB {
  static db: IDBDatabase;
  static inited = false;
  private static nuking = false;
  private static deleting = false; // Track when database deletion is in progress
  private static initPromise: Promise<boolean> | null = null;
  // Per-store operation queue to serialize actions over the same object store
  private static storeQueues: Map<string, Promise<any>> = new Map();

  private static runExclusive<T>(storeName: string, fn: () => Promise<T>): Promise<T> {
    const tail = DB.storeQueues.get(storeName) || Promise.resolve();
    const next = tail.catch(() => {}).then(fn);
    // Ensure the tail always advances even if next rejects
    DB.storeQueues.set(storeName, next.catch(() => {}));
    return next;
  }


  static async init(uid?: string): Promise<boolean> {
    if (DB.inited) return true;
    if (DB.initPromise) {
      // If a prior init started without a uid, wait for it; if it didn't complete, retry with provided uid
      const ok = await DB.initPromise.catch(() => false);
      if (DB.inited && DB.db) return true;
      if (uid && !ok) {
        // Retry initialization with the explicit uid
      } else {
        return ok;
      }
    }

    DB.initPromise = (async () => {
      // Wait for a user id if not provided
      const userID = await DB.waitForUID(uid);
      if (!userID) {
        try { Logger.warn('cache', 'DB.init: no user id available after waiting'); } catch {}
        DB.initPromise = null;
        return false as any;
      }

      try {
        Logger.info('cache', 'DB.init: starting', {
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
        Logger.info('cache', 
          `DB.init: Version changed from ${storedVersion} to ${CURRENT_DB_VERSION}, resetting database`,
          userID
        );
        await DB.deleteDatabase(userID);
      }

      // Store current version
      localStorage.setItem(DB_VERSION_KEY, CURRENT_DB_VERSION);

      const request = indexedDB.open(userID, 1);

      // Wrap in a Promise to await db setup
      const db = await new Promise<IDBDatabase>((resolve, _reject) => {
        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          try { Logger.info('cache', 'DB.init: onupgradeneeded'); } catch {}
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('workspaces')) {
            db.createObjectStore('workspaces', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('categories')) {
            db.createObjectStore('categories', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('tasks')) {
            db.createObjectStore('tasks', { keyPath: 'id' });
          }
          // Virtual workspace: tasks shared with the current user/teams
          if (!db.objectStoreNames.contains('shared_tasks')) {
            db.createObjectStore('shared_tasks', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('teams')) {
            db.createObjectStore('teams', { keyPath: 'id' });
          }
          // New reference tables used by RTL publications
          if (!db.objectStoreNames.contains('statuses')) {
            db.createObjectStore('statuses', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('cleaning_statuses')) {
            db.createObjectStore('cleaning_statuses', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('priorities')) {
            db.createObjectStore('priorities', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('spots')) {
            db.createObjectStore('spots', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('tags')) {
            db.createObjectStore('tags', { keyPath: 'id' });
          }
          // Custom fields and category custom fields (GenericCache-backed)
          if (!db.objectStoreNames.contains('custom_fields')) {
            db.createObjectStore('custom_fields', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('category_custom_fields')) {
            db.createObjectStore('category_custom_fields', {
              keyPath: 'id',
            });
          }

          // User management tables
          if (!db.objectStoreNames.contains('users')) {
            db.createObjectStore('users', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('roles')) {
            db.createObjectStore('roles', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('permissions')) {
            db.createObjectStore('permissions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('user_teams')) {
            db.createObjectStore('user_teams', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('user_permissions')) {
            db.createObjectStore('user_permissions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('role_permissions')) {
            db.createObjectStore('role_permissions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('task_users')) {
            db.createObjectStore('task_users', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('status_transitions')) {
            db.createObjectStore('status_transitions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('status_transition_groups')) {
            db.createObjectStore('status_transition_groups', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('status_transition_logs')) {
            db.createObjectStore('status_transition_logs', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('task_tags')) {
            db.createObjectStore('task_tags', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('task_shares')) {
            db.createObjectStore('task_shares', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('spot_types')) {
            db.createObjectStore('spot_types', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('slas')) {
            db.createObjectStore('slas', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('sla_policies')) {
            db.createObjectStore('sla_policies', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('sla_alerts')) {
            db.createObjectStore('sla_alerts', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('sla_escalation_levels')) {
            db.createObjectStore('sla_escalation_levels', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('category_priorities')) {
            db.createObjectStore('category_priorities', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('forms')) {
            db.createObjectStore('forms', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('invitations')) {
            db.createObjectStore('invitations', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('task_logs')) {
            db.createObjectStore('task_logs', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('templates')) {
            db.createObjectStore('templates', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('messages')) {
            db.createObjectStore('messages', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('job_positions')) {
            db.createObjectStore('job_positions', { keyPath: 'id' });
          }

          

          // Approvals
          if (!db.objectStoreNames.contains('approvals')) {
            db.createObjectStore('approvals', { keyPath: 'id' });
          }
          // Approval approvers
          if (!db.objectStoreNames.contains('approval_approvers')) {
            db.createObjectStore('approval_approvers', { keyPath: 'id' });
          }
          // Task approval instances
          if (!db.objectStoreNames.contains('task_approval_instances')) {
            db.createObjectStore('task_approval_instances', { keyPath: 'id' });
          }

          // Broadcasts & Acknowledgments
          if (!db.objectStoreNames.contains('broadcasts')) {
            db.createObjectStore('broadcasts', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('broadcast_acknowledgments')) {
            const store = db.createObjectStore('broadcast_acknowledgments', { keyPath: 'id' });
            store.createIndex('broadcast_id', 'broadcast_id', { unique: false });
            store.createIndex('user_id', 'user_id', { unique: false });
            store.createIndex('status', 'status', { unique: false });
          }

          // Plugin System
          if (!db.objectStoreNames.contains('plugins')) {
            const store = db.createObjectStore('plugins', { keyPath: 'id' });
            store.createIndex('slug', 'slug', { unique: true });
            store.createIndex('is_enabled', 'is_enabled', { unique: false });
          }
          if (!db.objectStoreNames.contains('plugin_routes')) {
            const store = db.createObjectStore('plugin_routes', { keyPath: 'id' });
            store.createIndex('plugin_id', 'plugin_id', { unique: false });
          }
          
          // KPI Cards
          if (!db.objectStoreNames.contains('kpi_cards')) {
            const store = db.createObjectStore('kpi_cards', { keyPath: 'id' });
            store.createIndex('workspace_id', 'workspace_id', { unique: false });
            store.createIndex('user_id', 'user_id', { unique: false });
            store.createIndex('is_enabled', 'is_enabled', { unique: false });
            store.createIndex('position', 'position', { unique: false });
          }

          // Working Hours Plugin
          if (!db.objectStoreNames.contains('country_configs')) {
            const store = db.createObjectStore('country_configs', { keyPath: 'id' });
            store.createIndex('country_code', 'country_code', { unique: true });
          }
          if (!db.objectStoreNames.contains('overtime_rules')) {
            const store = db.createObjectStore('overtime_rules', { keyPath: 'id' });
            store.createIndex('country_config_id', 'country_config_id', { unique: false });
          }
          if (!db.objectStoreNames.contains('overtime_multipliers')) {
            const store = db.createObjectStore('overtime_multipliers', { keyPath: 'id' });
            store.createIndex('overtime_rule_id', 'overtime_rule_id', { unique: false });
          }
          if (!db.objectStoreNames.contains('holiday_calendars')) {
            const store = db.createObjectStore('holiday_calendars', { keyPath: 'id' });
            store.createIndex('country_config_id', 'country_config_id', { unique: false });
            store.createIndex('calendar_year', 'calendar_year', { unique: false });
          }
          if (!db.objectStoreNames.contains('holidays')) {
            const store = db.createObjectStore('holidays', { keyPath: 'id' });
            store.createIndex('holiday_calendar_id', 'holiday_calendar_id', { unique: false });
            store.createIndex('date', 'date', { unique: false });
          }
          if (!db.objectStoreNames.contains('working_schedules')) {
            const store = db.createObjectStore('working_schedules', { keyPath: 'id' });
            store.createIndex('is_default', 'is_default', { unique: false });
          }
          // working_schedule_days and working_schedule_breaks stores removed
          // Schedule day/break data is now stored in the JSON schedule_config column on working_schedules
          if (!db.objectStoreNames.contains('schedule_assignments')) {
            const store = db.createObjectStore('schedule_assignments', { keyPath: 'id' });
            store.createIndex('working_schedule_id', 'working_schedule_id', { unique: false });
            store.createIndex('assignable_type', 'assignable_type', { unique: false });
          }
          if (!db.objectStoreNames.contains('time_off_types')) {
            const store = db.createObjectStore('time_off_types', { keyPath: 'id' });
            store.createIndex('code', 'code', { unique: true });
          }
          if (!db.objectStoreNames.contains('time_off_requests')) {
            const store = db.createObjectStore('time_off_requests', { keyPath: 'id' });
            store.createIndex('user_id', 'user_id', { unique: false });
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('time_off_type_id', 'time_off_type_id', { unique: false });
          }
          if (!db.objectStoreNames.contains('time_off_approval_instances')) {
            const store = db.createObjectStore('time_off_approval_instances', { keyPath: 'id' });
            store.createIndex('time_off_request_id', 'time_off_request_id', { unique: false });
            store.createIndex('approver_user_id', 'approver_user_id', { unique: false });
            store.createIndex('status', 'status', { unique: false });
          }
          if (!db.objectStoreNames.contains('time_off_approval_decisions')) {
            const store = db.createObjectStore('time_off_approval_decisions', { keyPath: 'id' });
            store.createIndex('time_off_request_id', 'time_off_request_id', { unique: false });
            store.createIndex('decision', 'decision', { unique: false });
          }

          // Custom Fields & Values
          if (!db.objectStoreNames.contains('spot_custom_fields')) {
            db.createObjectStore('spot_custom_fields', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('template_custom_fields')) {
            db.createObjectStore('template_custom_fields', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('task_custom_field_values')) {
            db.createObjectStore('task_custom_field_values', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('spot_custom_field_values')) {
            db.createObjectStore('spot_custom_field_values', { keyPath: 'id' });
          }

          // Forms & Fields
          if (!db.objectStoreNames.contains('form_fields')) {
            db.createObjectStore('form_fields', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('form_versions')) {
            db.createObjectStore('form_versions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('task_forms')) {
            db.createObjectStore('task_forms', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('field_options')) {
            db.createObjectStore('field_options', { keyPath: 'id' });
          }

          // Activity & Logging
          if (!db.objectStoreNames.contains('session_logs')) {
            db.createObjectStore('session_logs', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('config_logs')) {
            db.createObjectStore('config_logs', { keyPath: 'id' });
          }

          // File Management
          if (!db.objectStoreNames.contains('task_attachments')) {
            db.createObjectStore('task_attachments', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('task_notes')) {
            db.createObjectStore('task_notes', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('task_recurrences')) {
            db.createObjectStore('task_recurrences', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('workspace_chat')) {
            db.createObjectStore('workspace_chat', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('workspace_resources')) {
            db.createObjectStore('workspace_resources', { keyPath: 'id' });
          }

          // Error Tracking
          if (!db.objectStoreNames.contains('exceptions')) {
            db.createObjectStore('exceptions', { keyPath: 'id' });
          }

          // Boards (Communication Boards)
          if (!db.objectStoreNames.contains('boards')) {
            db.createObjectStore('boards', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('board_members')) {
            db.createObjectStore('board_members', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('board_messages')) {
            db.createObjectStore('board_messages', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('board_attachments')) {
            db.createObjectStore('board_attachments', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('board_birthday_images')) {
            db.createObjectStore('board_birthday_images', { keyPath: 'id' });
          }

          // Workflows
          if (!db.objectStoreNames.contains('workflows')) {
            db.createObjectStore('workflows', { keyPath: 'id' });
          }

          // Documents & Protocols
          if (!db.objectStoreNames.contains('documents')) {
            const store = db.createObjectStore('documents', { keyPath: 'id' });
            store.createIndex('workspace_id', 'workspace_id', { unique: false });
            store.createIndex('document_type', 'document_type', { unique: false });
            store.createIndex('uuid', 'uuid', { unique: true });
          }
          if (!db.objectStoreNames.contains('document_associations')) {
            const store = db.createObjectStore('document_associations', { keyPath: 'id' });
            store.createIndex('document_id', 'document_id', { unique: false });
            store.createIndex('associable_type', 'associable_type', { unique: false });
          }
          if (!db.objectStoreNames.contains('document_acknowledgments')) {
            const store = db.createObjectStore('document_acknowledgments', { keyPath: 'id' });
            store.createIndex('document_id', 'document_id', { unique: false });
            store.createIndex('user_id', 'user_id', { unique: false });
          }

          // Asset Management Plugin
          if (!db.objectStoreNames.contains('asset_types')) {
            db.createObjectStore('asset_types', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('asset_items')) {
            const store = db.createObjectStore('asset_items', { keyPath: 'id' });
            store.createIndex('asset_type_id', 'asset_type_id', { unique: false });
            store.createIndex('spot_id', 'spot_id', { unique: false });
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('parent_id', 'parent_id', { unique: false });
          }
          if (!db.objectStoreNames.contains('asset_maintenance_schedules')) {
            const store = db.createObjectStore('asset_maintenance_schedules', { keyPath: 'id' });
            store.createIndex('asset_item_id', 'asset_item_id', { unique: false });
            store.createIndex('is_active', 'is_active', { unique: false });
          }
          if (!db.objectStoreNames.contains('asset_maintenance_logs')) {
            const store = db.createObjectStore('asset_maintenance_logs', { keyPath: 'id' });
            store.createIndex('asset_item_id', 'asset_item_id', { unique: false });
            store.createIndex('schedule_id', 'schedule_id', { unique: false });
          }
          if (!db.objectStoreNames.contains('asset_custom_fields')) {
            const store = db.createObjectStore('asset_custom_fields', { keyPath: 'id' });
            store.createIndex('asset_type_id', 'asset_type_id', { unique: false });
          }
          if (!db.objectStoreNames.contains('asset_custom_field_values')) {
            const store = db.createObjectStore('asset_custom_field_values', { keyPath: 'id' });
            store.createIndex('asset_item_id', 'asset_item_id', { unique: false });
            store.createIndex('field_id', 'field_id', { unique: false });
          }

          // QR Code Plugin
          if (!db.objectStoreNames.contains('qr_codes')) {
            const store = db.createObjectStore('qr_codes', { keyPath: 'id' });
            store.createIndex('uuid', 'uuid', { unique: true });
            store.createIndex('entity_type', 'entity_type', { unique: false });
            store.createIndex('is_active', 'is_active', { unique: false });
          }
          if (!db.objectStoreNames.contains('qr_scan_logs')) {
            const store = db.createObjectStore('qr_scan_logs', { keyPath: 'id' });
            store.createIndex('qr_code_id', 'qr_code_id', { unique: false });
            store.createIndex('user_id', 'user_id', { unique: false });
          }

          // Compliance Module
          if (!db.objectStoreNames.contains('compliance_standards')) {
            db.createObjectStore('compliance_standards', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('compliance_requirements')) {
            db.createObjectStore('compliance_requirements', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('compliance_mappings')) {
            db.createObjectStore('compliance_mappings', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('compliance_audits')) {
            db.createObjectStore('compliance_audits', { keyPath: 'id' });
          }

          // Schedule Management
          if (!db.objectStoreNames.contains('schedule_templates')) {
            db.createObjectStore('schedule_templates', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('schedule_template_days')) {
            db.createObjectStore('schedule_template_days', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('user_schedules')) {
            db.createObjectStore('user_schedules', { keyPath: 'id' });
          }

          // Notifications (client-side only)
          if (!db.objectStoreNames.contains('notifications')) {
            const store = db.createObjectStore('notifications', { keyPath: 'id' });
            store.createIndex('received_at', 'received_at', { unique: false });
            store.createIndex('viewed_at', 'viewed_at', { unique: false });
          }

          // Avatar image cache (base64 or blob references)
          if (!db.objectStoreNames.contains('avatars')) {
            db.createObjectStore('avatars', { keyPath: 'id' });
          }
          // Tenant availability cache (keyed by tenant name)
          if (!db.objectStoreNames.contains('tenant_availability')) {
            db.createObjectStore('tenant_availability', { keyPath: 'tenantName' });
          }

          // Whiteboards (Excalidraw data per workspace)
          if (!db.objectStoreNames.contains('whiteboards')) {
            db.createObjectStore('whiteboards', { keyPath: 'workspaceId' });
          }
        };

        request.onerror = () => {
          Logger.error('cache', 'DB.init: Error opening database:', request.error);
          _reject(request.error as any);
        };
        request.onblocked = () => {
          Logger.warn('cache', 'DB.init: open request blocked - another tab/window may be holding the database open');
        };
        request.onsuccess = () => {
          try { Logger.info('cache', 'DB.init: open success'); } catch {}
          resolve(request.result);
        };
      });

      DB.db = db;
      try {
        DB.db.onversionchange = () => {
          try { Logger.warn('cache', 'DB.onversionchange: closing DB connection'); } catch {}
          try { DB.db?.close(); } catch {}
          DB.inited = false;
          DB.deleting = false; // Reset deletion flag on version change
        };
      } catch {}
      DB.inited = true;
      DB.deleting = false; // Ensure deletion flag is cleared after successful init
      try { Logger.info('cache', 'DB.init: DB assigned and inited set to true'); } catch {}
      DB.initPromise = null as any;
      return true as any;
    })();

    await DB.initPromise;
    return DB.inited;
  }

  // Wait until DB.db is assigned and DB.inited is true. Used to avoid races on login.
  public static async whenReady(timeoutMs: number = 5000): Promise<boolean> {
    if (DB.inited && DB.db) return true;
    const start = Date.now();
    while (!(DB.inited && DB.db)) {
      if (DB.initPromise) {
        try { await DB.initPromise; } catch {}
      } else {
        // Let the event loop progress; avoid tight loop
        await new Promise((r) => setTimeout(r, 10));
      }
      if (DB.inited && DB.db) return true;
      if (Date.now() - start > timeoutMs) {
        try { Logger.warn('cache', 'DB.whenReady: timed out waiting for DB readiness'); } catch {}
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
    // Mark deletion as in progress to prevent operations during deletion
    DB.deleting = true;
    
    // Clear session storage for good measure
    sessionStorage.clear();

    // Clear all cache initialization flags from localStorage
    if (auth.currentUser?.uid) {
      const userId = auth.currentUser.uid;

      // Clear workspace cache flags
      localStorage.removeItem(`workspaceCacheInitialized-${userId}`);
      localStorage.removeItem(`workspaceCacheLastUpdated-${userId}`);

      // Clear teams cache flags
      localStorage.removeItem(`teamsCacheInitialized-${userId}`);
      localStorage.removeItem(`teamsCacheLastUpdated-${userId}`);

      // Clear categories cache flags
      localStorage.removeItem(`categoriesCacheInitialized-${userId}`);
      localStorage.removeItem(`categoriesCacheLastUpdated-${userId}`);

      // Clear tasks cache flags
      localStorage.removeItem(`tasksCacheInitialized-${userId}`);
      localStorage.removeItem(`tasksCacheLastUpdated-${userId}`);

      Logger.info('cache', `Cleared all cache flags for user ${userId}`);
    }

    // First close our own connection to the database if it exists
    if (DB.inited && DB.db) {
      try {
        DB.db.close();
        Logger.info('cache', 'Closed existing database connection');
      } catch (err) {
        Logger.error('cache', 'Error closing database connection:', err);
      }
      DB.inited = false;
      DB.db = undefined as unknown as IDBDatabase;
    }

    return new Promise<void>((resolve, _reject) => {
      // Create a timeout to prevent indefinite hanging
      const timeout = setTimeout(() => {
        Logger.warn('cache', 'Database deletion timed out after 5 seconds');
        DB.deleting = false; // Reset flag on timeout
        resolve(); // Resolve anyway to prevent hanging
      }, 5000);

      try {
        const request = indexedDB.deleteDatabase(userID);

        request.onsuccess = () => {
          clearTimeout(timeout);
          Logger.info('cache', 'Database successfully deleted');
          DB.deleting = false; // Reset flag on success
          resolve();
        };

        request.onerror = () => {
          clearTimeout(timeout);
          Logger.error('cache', 'Error deleting database:', request.error);
          DB.deleting = false; // Reset flag on error
          // Still resolve to prevent hanging
          resolve();
        };

        // Critical: Handle blocked events
        request.onblocked = () => {
          Logger.warn('cache', 'Database deletion blocked - connections still open');
          // We'll continue waiting for the timeout
        };
      } catch (err) {
        clearTimeout(timeout);
        Logger.error('cache', 'Exception during database deletion:', err);
        DB.deleting = false; // Reset flag on exception
        resolve(); // Resolve anyway to prevent hanging
      }
    });
  }

  

  public static getStoreRead(
    name:
      | 'workspaces'
      | 'categories'
      | 'tasks'
      | 'teams'
      | 'statuses'
      | 'priorities'
      | 'spots'
      | 'tags'
      | 'custom_fields'
      | 'category_custom_fields'
      | 'users'
      | 'roles'
      | 'permissions'
      | 'user_teams'
      | 'user_permissions'
      | 'role_permissions'

      | 'status_transitions'
      | 'task_users'
      | 'task_tags'
      | 'task_shares'
      | 'spot_types'
      | 'slas'
      | 'sla_policies'
      | 'sla_alerts'
      | 'category_priorities'
      | 'forms'
      | 'invitations'
      | 'task_logs'
      | 'templates'
      | 'messages'
      | 'job_positions'
      | 'status_transition_groups'
      | 'approval_approvers'
      | 'task_approval_instances'
      | 'time_off_approval_instances'
      | 'time_off_approval_decisions'
      | 'broadcasts'
      | 'broadcast_acknowledgments'
      | 'plugins'
      | 'plugin_routes'
      | 'schedule_templates'
      | 'schedule_template_days'
      | 'user_schedules'
      | 'spot_custom_fields'
      | 'template_custom_fields'
      | 'task_custom_field_values'
      | 'spot_custom_field_values'
      | 'form_fields'
      | 'form_versions'
      | 'task_forms'
      | 'field_options'
      | 'session_logs'
      | 'config_logs'
      | 'task_attachments'
      | 'task_notes'
      | 'task_recurrences'
      | 'workspace_chat'
      | 'workspace_resources'
      | 'exceptions'
      | 'board_attachments'
      | 'board_birthday_images'
      | 'avatars'
      | 'whiteboards',
    mode: IDBTransactionMode = 'readonly'
  ) {
    if (DB.deleting) throw new Error('DB deletion in progress');
    if (!DB.inited) throw new Error('DB not initialized');
    if (!DB.db) throw new Error('DB not initialized');
    return DB.db.transaction(name, mode).objectStore(name);
  }

  public static getStoreWrite(
    name:
      | 'workspaces'
      | 'categories'
      | 'tasks'
      | 'teams'
      | 'statuses'
      | 'priorities'
      | 'spots'
      | 'tags'
      | 'custom_fields'
      | 'category_custom_fields'
      | 'users'
      | 'roles'
      | 'permissions'
      | 'user_teams'
      | 'user_permissions'
      | 'role_permissions'

      | 'status_transitions'
      | 'task_users'
      | 'task_tags'
      | 'task_shares'
      | 'spot_types'
      | 'slas'
      | 'sla_policies'
      | 'sla_alerts'
      | 'category_priorities'
      | 'forms'
      | 'invitations'
      | 'task_logs'
      | 'templates'
      | 'messages'
      | 'job_positions'
      | 'status_transition_groups'
      | 'approval_approvers'
      | 'task_approval_instances'
      | 'time_off_approval_instances'
      | 'time_off_approval_decisions'
      | 'broadcasts'
      | 'broadcast_acknowledgments'
      | 'plugins'
      | 'plugin_routes'
      | 'schedule_templates'
      | 'schedule_template_days'
      | 'user_schedules'
      | 'spot_custom_fields'
      | 'template_custom_fields'
      | 'task_custom_field_values'
      | 'spot_custom_field_values'
      | 'form_fields'
      | 'form_versions'
      | 'task_forms'
      | 'field_options'
      | 'session_logs'
      | 'config_logs'
      | 'task_attachments'
      | 'task_notes'
      | 'task_recurrences'
      | 'workspace_chat'
      | 'workspace_resources'
      | 'exceptions'
      | 'board_attachments'
      | 'board_birthday_images'
      | 'avatars'
      | 'whiteboards',
    mode: IDBTransactionMode = 'readwrite'
  ) {
    if (!DB.inited) throw new Error('DB not initialized');
    if (!DB.db) throw new Error('DB not initialized');
    return DB.db.transaction(name, mode).objectStore(name);
  }

  private static toKey(key: number | string): number | string {
    // Most stores use numeric id; allow string keys for flexibility
    const n = Number(key);
    return isNaN(n) ? key : n;
  }

  public static async getAll(storeName: string): Promise<any[]> {
    return DB.runExclusive(storeName, async () => {
      if (DB.nuking) {
        Logger.warn('cache', '[DB] getAll skipped during nuking');
        return [] as any[];
      }
      if (DB.deleting) {
        Logger.warn('cache', '[DB] getAll skipped during deletion');
        return [] as any[];
      }
      if (!DB.inited) await DB.init();
      if (!DB.inited || !DB.db) {
        Logger.warn('cache', `[DB] getAll: DB not initialized for ${storeName}`);
        return [] as any[];
      }

      // Use an explicit transaction and await its completion to ensure read consistency
      // Catch InvalidStateError and retry once after ensuring DB is ready
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
        // Catch InvalidStateError specifically - DB connection is closing
        if (error?.name === 'InvalidStateError' || error?.message?.includes('connection is closing')) {
          Logger.warn('cache', `[DB] getAll: InvalidStateError for ${storeName}, retrying after DB reinit`);
          // Reset state
          DB.inited = false;
          DB.db = undefined as unknown as IDBDatabase;
          // Wait a bit for deletion/closure to complete
          await new Promise(resolve => setTimeout(resolve, 100));
          // Retry init and operation once
          await DB.init();
          if (!DB.inited || !DB.db || DB.deleting) {
            Logger.warn('cache', `[DB] getAll: DB not ready after retry for ${storeName}`);
            return [] as any[];
          }
          // Retry the transaction
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
          // Re-throw other errors
          throw error;
        }
      }
      
      return rows.filter((r) => r != null);
    });
  }

  public static async get(
    storeName: string,
    key: number | string
  ): Promise<any | null> {
    return DB.runExclusive(storeName, async () => {
      if (DB.nuking) {
        Logger.warn('cache', '[DB] get skipped during nuking');
        return null;
      }
      if (DB.deleting) {
        Logger.warn('cache', '[DB] get skipped during deletion');
        return null;
      }
      if (!DB.inited) await DB.init();
      if (!DB.inited || !DB.db) {
        Logger.warn('cache', `[DB] get: DB not initialized for ${storeName}`);
        return null;
      }
      // Use an explicit transaction and await its completion for consistent reads
      // Catch InvalidStateError and retry once after ensuring DB is ready
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
        // Catch InvalidStateError specifically - DB connection is closing
        if (error?.name === 'InvalidStateError' || error?.message?.includes('connection is closing')) {
          Logger.warn('cache', `[DB] get: InvalidStateError for ${storeName}, retrying after DB reinit`);
          // Reset state
          DB.inited = false;
          DB.db = undefined as unknown as IDBDatabase;
          // Wait a bit for deletion/closure to complete
          await new Promise(resolve => setTimeout(resolve, 100));
          // Retry init and operation once
          await DB.init();
          if (!DB.inited || !DB.db || DB.deleting) {
            Logger.warn('cache', `[DB] get: DB not ready after retry for ${storeName}`);
            return null;
          }
          // Retry the transaction
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
          // Re-throw other errors
          throw error;
        }
      }
      if (!rec) return null;
      return rec;
    });
  }

  public static async put(storeName: string, row: any): Promise<void> {
    // Defensive copy to prevent parameter corruption
    const rowCopy = row ? JSON.parse(JSON.stringify(row)) : null;

    return DB.runExclusive(storeName, async () => {
      if (DB.deleting) {
        Logger.warn('cache', '[DB] put skipped during deletion');
        return;
      }
      if (!DB.inited) await DB.init();

      // Debug: Log only if there's an issue
      if (!rowCopy) {
        Logger.info('cache', `DB.put: Received row parameter`, {
          storeName,
          originalRow: row,
          rowCopy,
          rowType: typeof row,
          rowCopyType: typeof rowCopy
        });
      }

      // Validate the row copy
      if (!rowCopy) {
        Logger.error('cache', `DB.put: Row copy is null/undefined for ${storeName}`, {
          originalRow: row,
          rowCopy
        });
        throw new Error(`Cannot put null/undefined row to ${storeName}`);
      }

      // Extra debug: pre-encrypt id visibility
      try {
        const dbg = localStorage.getItem('wh-debug-cache') === 'true';
        if (dbg) {
          Logger.info('cache', 'DB.put: pre-encrypt', {
            storeName,
            rowHasId: rowCopy && (rowCopy.id !== undefined && rowCopy.id !== null),
            rowId: rowCopy?.id,
            rowKeys: Object.keys(rowCopy || {}),
          });
        }
      } catch {}

      const payload: any = rowCopy;


      // Catch InvalidStateError and retry once after ensuring DB is ready
      try {
        const tx = DB.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName as any);
        // Debug: store keyPath visibility
        try {
          const dbg = localStorage.getItem('wh-debug-cache') === 'true';
          if (dbg) {
            const kp = (store as any)?.keyPath;
            Logger.info('cache', 'DB.put: target store', { storeName, keyPath: kp, payloadHasId: payload?.id !== undefined && payload?.id !== null, payloadId: payload?.id });
          }
        } catch {}
        const putRequest = store.put(payload);

        putRequest.onerror = (event) => {
          Logger.error('cache', `DB.put: IndexedDB put request failed for ${storeName}`, {
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
        // Catch InvalidStateError specifically - DB connection is closing
        if (error?.name === 'InvalidStateError' || error?.message?.includes('connection is closing')) {
          Logger.warn('cache', `[DB] put: InvalidStateError for ${storeName}, retrying after DB reinit`);
          // Reset state
          DB.inited = false;
          DB.db = undefined as unknown as IDBDatabase;
          // Wait a bit for deletion/closure to complete
          await new Promise(resolve => setTimeout(resolve, 100));
          // Retry init and operation once
          await DB.init();
          if (!DB.inited || !DB.db || DB.deleting) {
            Logger.warn('cache', `[DB] put: DB not ready after retry for ${storeName}`);
            return;
          }
          // Retry the transaction
          const tx = DB.db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName as any);
          const putRequest = store.put(payload);
          putRequest.onerror = (event) => {
            Logger.error('cache', `DB.put: IndexedDB put request failed for ${storeName}`, {
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
          // Re-throw other errors
          throw error;
        }
      }
    });
  }

  public static async bulkPut(storeName: string, rows: any[]): Promise<void> {
    return DB.runExclusive(storeName, async () => {
      if (DB.deleting) {
        Logger.warn('cache', '[DB] bulkPut skipped during deletion');
        return;
      }
      if (!DB.inited) await DB.init();

      const payloads: any[] = rows;
      // Catch InvalidStateError and retry once after ensuring DB is ready
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
        // Catch InvalidStateError specifically - DB connection is closing
        if (error?.name === 'InvalidStateError' || error?.message?.includes('connection is closing')) {
          Logger.warn('cache', `[DB] bulkPut: InvalidStateError for ${storeName}, retrying after DB reinit`);
          // Reset state
          DB.inited = false;
          DB.db = undefined as unknown as IDBDatabase;
          // Wait a bit for deletion/closure to complete
          await new Promise(resolve => setTimeout(resolve, 100));
          // Retry init and operation once
          await DB.init();
          if (!DB.inited || !DB.db || DB.deleting) {
            Logger.warn('cache', `[DB] bulkPut: DB not ready after retry for ${storeName}`);
            return;
          }
          // Retry the transaction
          const tx = DB.db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName as any);
          for (const p of payloads) store.put(p);
          await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error as any);
            tx.onabort = () => reject(tx.error as any);
          });
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    });
  }

  public static async delete(
    storeName: string,
    key: number | string
  ): Promise<void> {
    return DB.runExclusive(storeName, async () => {
      if (!DB.inited) await DB.init();
      if (!DB.inited || !DB.db) {
        throw new Error('DB not initialized');
      }
      
      const tx = DB.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName as any);
      const deleteRequest = store.delete(DB.toKey(key));
      
      deleteRequest.onerror = (event) => {
        Logger.error('cache', `DB.delete: IndexedDB delete request failed for ${storeName}`, {
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
    // Debug logging (can be enabled via localStorage.getItem('wh-debug-db') === 'true')
    if (typeof localStorage !== 'undefined' && localStorage.getItem('wh-debug-db') === 'true') {
      Logger.info('cache', `[DB] Clearing IndexedDB store: ${storeName}`);
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
        Logger.error('cache', `DB.clear: IndexedDB clear request failed for ${storeName}`, {
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
