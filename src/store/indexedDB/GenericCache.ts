import { DB } from "../database";
import { api } from "@/store/api/internalApi";

type IdType = number | string;

export interface GenericCacheOptions {
	/** Server table name (e.g., 'wh_tasks') */
	table: string;
	/** REST resource path (e.g., '/tasks') */
	endpoint?: string;
	/** IndexedDB object store name (e.g., 'tasks') */
	store: string;
	/** Row primary key field, defaults to 'id' */
	idField?: string;
}

/**
 * Generic cache for entity rows stored in IndexedDB.
 * Supports basic CRUD used by RTL publications and sync stream.
 */
export class GenericCache {
	private readonly table: string;
	private readonly endpoint?: string;
	private readonly store: string;
	private readonly idField: string;

	constructor(options: GenericCacheOptions) {
		this.table = options.table;
		this.endpoint = options.endpoint;
		this.store = options.store;
		this.idField = options.idField ?? "id";
	}

	// Public getter for table name (needed by cache registry)
	public getTableName(): string {
		return this.table;
	}

	private getId(row: any): IdType {
		return row?.[this.idField];
	}

	/**
	 * Some endpoints return an envelope like:
	 *   { data: {...} } or { row: {...} } or { invitation: {...}, invitation_link: "..." }
	 * This ensures we persist the actual entity row (must contain idField).
	 */
	private unwrapSingleEntity(payload: any): any {
		const maxDepth = 4;
		const seen = new Set<any>();

		const find = (node: any, depth: number): any => {
			if (!node || typeof node !== 'object') return null;
			if (seen.has(node)) return null;
			seen.add(node);

			// If it already looks like a row (has id), keep it.
			if (node?.[this.idField] !== undefined && node?.[this.idField] !== null) return node;
			if (depth <= 0) return null;

			// Common wrapper keys first
			const preferredKeys = ['data', 'row', 'invitation', 'result', 'item'];
			for (const k of preferredKeys) {
				if (Object.prototype.hasOwnProperty.call(node, k)) {
					const hit = find((node as any)[k], depth - 1);
					if (hit) return hit;
				}
			}

			// Otherwise traverse object properties (skip arrays)
			for (const key of Object.keys(node)) {
				const val = (node as any)[key];
				if (!val || typeof val !== 'object') continue;
				if (Array.isArray(val)) continue;
				const hit = find(val, depth - 1);
				if (hit) return hit;
			}

			return null;
		};

		return find(payload, maxDepth) ?? payload;
	}

	async add(row: any): Promise<void> {
		if (!DB.inited) await DB.init();

		const idVal = this.getId(row);
		// If row is soft-deleted, ensure it's removed from local cache instead of added
		if (row && Object.prototype.hasOwnProperty.call(row, 'deleted_at') && row.deleted_at != null) {
			try {
				await DB.delete(this.store, idVal as any);
				return;
			} catch (error) {
				console.warn(`GenericCache.add: attempted to remove soft-deleted row in ${this.store} but failed`, { error, idVal });
				return;
			}
		}
		if (idVal === undefined || idVal === null) {
			console.error(`GenericCache.add: Row missing ID field '${this.idField}'`, row);
			return;
		}

		try {
			await DB.put(this.store, row);
		} catch (error) {
			console.error(`GenericCache.add: Failed to add to ${this.store}`, {
				error,
				row,
				idVal,
				store: this.store
			});
			throw error;
		}
	}

	async update(_id: IdType, row: any): Promise<void> {
		if (!DB.inited) await DB.init();
		try {
			// If row is soft-deleted, remove from local cache instead of updating
			if (row && Object.prototype.hasOwnProperty.call(row, 'deleted_at') && row.deleted_at != null) {
				const idVal = this.getId(row) ?? _id;
				await DB.delete(this.store, idVal as any);
				return;
			}
			await DB.put(this.store, row);
		} catch (e) {
			console.error(`GenericCache.update: failed for ${this.store}`, { error: e, _id, row });
			throw e;
		}
	}

	async remove(id: IdType): Promise<void> {
		if (!DB.inited) await DB.init();
		await DB.delete(this.store, id as any);
	}

	// --- Remote CRUD helpers ---
	/**
	 * Create on server and return created row (tries common REST response shapes)
	 */
	async createRemote(row: any): Promise<any> {
		// Local-only store (no API endpoint)
		if (!this.endpoint) {
			return row;
		}
		try {
			const resp = await api.post(this.endpoint, row);
			
			const result = this.unwrapSingleEntity(resp.data);
			if (!result) {
				console.error(`[GenericCache:${this.store}] createRemote: No data in response`, resp.data);
				throw new Error(`Server response missing data for ${this.store}`);
			}
			return result;
		} catch (error: any) {
			console.error(`[GenericCache:${this.store}] createRemote error:`, {
				message: error?.message,
				response: error?.response?.data,
				status: error?.response?.status,
				endpoint: this.endpoint,
				payload: row
			});
			throw error;
		}
	}

	/**
	 * Update on server and return updated row (tries common REST response shapes)
	 */
	async updateRemote(id: IdType, updates: any): Promise<any> {
		// Local-only store (no API endpoint)
		if (!this.endpoint) {
			return { ...(updates ?? {}), [this.idField]: id };
		}
		const resp = await api.patch(`${this.endpoint}/${id}`, updates);
		return (resp.data?.data ?? resp.data?.row ?? resp.data);
	}

	/**
	 * Delete on server
	 */
	async deleteRemote(id: IdType): Promise<boolean> {
		// Local-only store (no API endpoint)
		if (!this.endpoint) {
			return true;
		}
		await api.delete(`${this.endpoint}/${id}`);
		return true;
	}

	async getAll(): Promise<any[]> {
		if (!DB.inited) await DB.init();
		const rows = await DB.getAll(this.store);
		return rows;
	}

	async fetchAll(params: Record<string, any> = {}): Promise<boolean> {
		// Local-only store (no API endpoint)
		if (!this.endpoint) {
			return true;
		}
		try {
			const resp = await api.get(this.endpoint, { params });
			
			const rows = (resp.data?.rows ?? resp.data?.data ?? resp.data) as any[];
			
			if (!Array.isArray(rows)) {
				console.error(`[GenericCache:${this.store}] Response is not an array:`, typeof rows, rows);
				return false;
			}
			
			// Only proceed with pruning/updating if we got a successful response (200-299)
			if (resp.status < 200 || resp.status >= 300) {
				console.warn(`[GenericCache:${this.store}] Non-success status code: ${resp.status}, skipping update`);
				return false;
			}
			
			if (!DB.inited) await DB.init();
			// Signal hydration start/end to coordinate readers
			const end = (DB as any).startHydration?.(this.store) || (() => {});
			try {
				// Determine if this fetch is partial (has filters). If partial, avoid pruning
				// local rows not present in the response to prevent race conditions.
				const isPartialFetch = params && Object.keys(params).length > 0;
				if (!isPartialFetch) {
					// Full fetch: prune local rows that are no longer present in server response
					const existing = await this.getAll();
					const fetchedIdSet = new Set<any>(rows.map((r) => this.getId(r)));
					for (const localRow of existing) {
						const idVal = this.getId(localRow);
						if (!fetchedIdSet.has(idVal)) {
							try { await DB.delete(this.store, idVal as any); } catch {}
						}
					}
				}
				await DB.bulkPut(this.store, rows);
			} finally {
				end();
			}
			return true;
		} catch (e) {
			console.error(`[GenericCache:${this.store}] fetchAll error:`, this.endpoint, e);
			return false;
		}
	}
}
