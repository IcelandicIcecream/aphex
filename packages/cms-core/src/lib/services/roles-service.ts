// services/roles-service.ts
//
// Resolves an org + role name to a concrete capability set, with a TTL cache
// and a built-in fallback so a missing row never locks an org out.

import type { CacheAdapter } from '../cache/index';
import type { DatabaseAdapter } from '../db/index';
import {
	BUILTIN_ROLE_SEED,
	BUILTIN_ROLE_NAMES,
	type Capability,
	type Role
} from '../types/capabilities';
import type { OrganizationRole } from '../types/organization';
import { cmsLogger } from '../utils/logger';

/**
 * RolesService — caches per-org role capability lookups.
 *
 * Mirrors HierarchyService's shape so both services share cache and
 * in-flight deduplication patterns.
 */
export class RolesService {
	private static DEFAULT_TTL = 30; // 30 seconds — roles change infrequently but should pick up edits quickly.
	private inflight = new Map<string, Promise<Capability[]>>();

	constructor(
		private db: DatabaseAdapter,
		private cache: CacheAdapter | null = null,
		private ttl: number = RolesService.DEFAULT_TTL
	) {}

	/**
	 * Resolve the capability list for `(organizationId, roleName)`.
	 *
	 * Fallback order:
	 *   1. Cache hit.
	 *   2. DB lookup for the `(org, name)` row.
	 *   3. Built-in seed if the name matches a built-in.
	 *   4. Empty list — unknown role → no capabilities.
	 */
	async getCapabilities(organizationId: string, roleName: string): Promise<Capability[]> {
		const key = cacheKey(organizationId, roleName);

		if (this.cache) {
			const cached = await this.cache.get<Capability[]>(key);
			if (cached) return cached;
		}

		const existing = this.inflight.get(key);
		if (existing) return existing;

		const promise = this.resolveFromDb(organizationId, roleName).then(async (caps) => {
			if (this.cache) await this.cache.set(key, caps, this.ttl);
			this.inflight.delete(key);
			return caps;
		});

		this.inflight.set(key, promise);
		return promise;
	}

	/** List every role defined for an organization. */
	async listRoles(organizationId: string): Promise<Role[]> {
		return this.db.listRoles(organizationId);
	}

	/** Idempotent — safe to call on every request if you want. */
	async ensureBuiltins(organizationId: string): Promise<void> {
		await this.db.seedBuiltinRoles(organizationId);
	}

	/** Invalidate cache entries for a single role. Call after mutation. */
	async invalidate(organizationId: string, roleName?: string): Promise<void> {
		if (!this.cache) return;
		if (roleName) {
			await this.cache.delete(cacheKey(organizationId, roleName));
			return;
		}
		await this.cache.invalidateByPrefix(`roles:${organizationId}:`);
	}

	// ---- internals -----------------------------------------------------------

	private async resolveFromDb(organizationId: string, roleName: string): Promise<Capability[]> {
		const row = await this.db.findRoleByName(organizationId, roleName);
		if (row) {
			cmsLogger.debug(
				'[RBAC]',
				`Resolved role "${roleName}" in org=${organizationId} via DB (${row.capabilities.length} caps)`
			);
			return row.capabilities;
		}

		// Defense in depth: if a built-in row went missing (e.g. not yet seeded
		// on a pre-existing org), fall back to the hard-coded seed so the app
		// stays functional until `ensureBuiltins` runs.
		if ((BUILTIN_ROLE_NAMES as readonly string[]).includes(roleName)) {
			cmsLogger.warn(
				'[RBAC]',
				`Role "${roleName}" not found in org=${organizationId} — using BUILTIN_ROLE_SEED fallback. Run ensureBuiltins.`
			);
			return [...BUILTIN_ROLE_SEED[roleName as OrganizationRole].capabilities];
		}

		cmsLogger.warn(
			'[RBAC]',
			`Unknown role "${roleName}" in org=${organizationId} — granting no capabilities`
		);
		return [];
	}
}

function cacheKey(organizationId: string, roleName: string): string {
	return `roles:${organizationId}:${roleName}`;
}
