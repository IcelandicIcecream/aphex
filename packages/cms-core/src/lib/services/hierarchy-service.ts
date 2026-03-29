import type { CacheAdapter } from '../cache/index';
import type { DatabaseAdapter } from '../db/index';

/**
 * HierarchyService — caches organization parent→child lookups
 * using the shared CacheAdapter.
 *
 * Lives in cms-core so every adapter (PostgreSQL, SQLite, MongoDB)
 * benefits from the same caching without reimplementing it.
 */
export class HierarchyService {
	private static DEFAULT_TTL = 60; // 60 seconds
	private inflight = new Map<string, Promise<string[]>>();

	constructor(
		private db: DatabaseAdapter,
		private cache: CacheAdapter | null = null,
		private ttl: number = HierarchyService.DEFAULT_TTL
	) {}

	async getChildOrganizations(parentOrganizationId: string): Promise<string[]> {
		if (!this.db.hierarchyEnabled) {
			return [];
		}

		const key = `hierarchy:${parentOrganizationId}`;

		// Check cache first
		if (this.cache) {
			const cached = await this.cache.get<string[]>(key);
			if (cached) return cached;
		}

		// Deduplicate concurrent requests — if a fetch is already in flight
		// for this org, wait for that instead of hitting the DB again
		const existing = this.inflight.get(key);
		if (existing) return existing;

		const promise = this.db.getChildOrganizations(parentOrganizationId).then(async (ids) => {
			if (this.cache) {
				await this.cache.set(key, ids, this.ttl);
			}
			this.inflight.delete(key);
			return ids;
		});

		this.inflight.set(key, promise);
		return promise;
	}

	/**
	 * Get the parent org ID plus all its child org IDs.
	 * Convenience for building filterOrganizationIds arrays.
	 */
	async getOrgIdsWithChildren(organizationId: string): Promise<string[]> {
		const childIds = await this.getChildOrganizations(organizationId);
		return childIds.length > 0 ? [organizationId, ...childIds] : [organizationId];
	}

	async invalidate(parentOrganizationId: string): Promise<void> {
		if (this.cache) {
			await this.cache.delete(`hierarchy:${parentOrganizationId}`);
		}
	}

	async flush(): Promise<void> {
		if (this.cache) {
			await this.cache.invalidateByPrefix('hierarchy:');
		}
	}
}
