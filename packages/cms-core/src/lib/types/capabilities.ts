// types/capabilities.ts
//
// Capability-based access control.
//
// Roles are per-organization rows in `cms_roles`, each mapping a role name to
// a set of capability strings. Four built-in roles are seeded for every org
// (owner/admin/editor/viewer); additional custom roles are purely additive.
//
// Authorization checks consult an auth-scoped capability set that is resolved
// once per request (see RolesService + handleAuthHook) so `hasCapability` is
// a synchronous set-membership check in request handlers and UI code.

import type { Auth } from './auth';
import type { OrganizationRole } from './organization';

/**
 * Flat, serializable permission primitives.
 *
 * Append-only: removing or renaming a value silently weakens every call site.
 * If a capability is no longer needed, leave the string and stop granting it.
 */
export type Capability =
	// Documents
	| 'document.read'
	| 'document.create'
	| 'document.update'
	| 'document.delete'
	| 'document.publish'
	| 'document.unpublish'
	// Assets
	| 'asset.read'
	| 'asset.upload'
	| 'asset.delete'
	// Organization management
	| 'member.invite'
	| 'member.remove'
	| 'member.changeRole'
	| 'apiKey.manage'
	| 'role.manage'
	| 'org.settings';
// Note: organization deletion is NOT a delegable capability — it's an
// ownership-only action, enforced by a hardcoded `membership.role === 'owner'`
// check in the DELETE /organizations/[id] handler. No `org.delete` cap exists
// so it can't be granted to custom roles or picked in the role editor.

/**
 * Enumerate every capability. Useful for owner seeding and validation.
 */
export const ALL_CAPABILITIES: readonly Capability[] = [
	'document.read',
	'document.create',
	'document.update',
	'document.delete',
	'document.publish',
	'document.unpublish',
	'asset.read',
	'asset.upload',
	'asset.delete',
	'member.invite',
	'member.remove',
	'member.changeRole',
	'apiKey.manage',
	'role.manage',
	'org.settings'
] as const;

/**
 * Built-in role names. These are the guaranteed defaults every org receives.
 * Custom role names are any other string.
 */
export const BUILTIN_ROLE_NAMES: readonly OrganizationRole[] = [
	'owner',
	'admin',
	'editor',
	'viewer'
];

/**
 * Seed data for the four built-in roles.
 *
 * This is the **default floor** — the set of capabilities a freshly-created
 * org starts with. Once seeded, rows live in `cms_roles` and can be edited by
 * admins (via future Roles UI). Custom roles live alongside these.
 *
 * Also acts as the defense-in-depth fallback: if a role lookup misses (e.g.
 * a row got deleted out-of-band for a built-in name), the checker falls back
 * to this map rather than locking the org out.
 */
export const BUILTIN_ROLE_SEED: Record<
	OrganizationRole,
	{ description: string; capabilities: readonly Capability[] }
> = {
	viewer: {
		description: 'Read-only access to documents and assets.',
		capabilities: ['document.read', 'asset.read']
	},
	editor: {
		description: 'Create, edit, and publish content.',
		capabilities: [
			'document.read',
			'document.create',
			'document.update',
			'document.delete',
			'document.publish',
			'document.unpublish',
			'asset.read',
			'asset.upload',
			'asset.delete'
		]
	},
	admin: {
		description: 'All content permissions plus member and settings management.',
		capabilities: [
			'document.read',
			'document.create',
			'document.update',
			'document.delete',
			'document.publish',
			'document.unpublish',
			'asset.read',
			'asset.upload',
			'asset.delete',
			'member.invite',
			'member.remove',
			'member.changeRole',
			'apiKey.manage',
			'role.manage',
			'org.settings'
		]
	},
	owner: {
		description: 'Full access including organization deletion.',
		capabilities: ALL_CAPABILITIES
	}
};

/**
 * A persisted role row (per organization).
 */
export interface Role {
	id: string;
	organizationId: string;
	name: string;
	description: string | null;
	capabilities: Capability[];
	isBuiltIn: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface NewRole {
	organizationId: string;
	name: string;
	description?: string | null;
	capabilities: Capability[];
	isBuiltIn?: boolean;
}

/**
 * Build the four built-in role rows for a newly-created organization.
 * Used by migration, org-creation, and the runtime seeder.
 */
export function buildBuiltinRoleRows(organizationId: string): NewRole[] {
	return BUILTIN_ROLE_NAMES.map((name) => ({
		organizationId,
		name,
		description: BUILTIN_ROLE_SEED[name].description,
		capabilities: [...BUILTIN_ROLE_SEED[name].capabilities],
		isBuiltIn: true
	}));
}

/**
 * Instance roles that override everything else.
 *
 * `super_admin` and `admin` on the user profile receive the full capability
 * set regardless of their per-org role. Keeps the "break glass" path usable
 * even if an admin accidentally locks their own role down.
 */
const INSTANCE_ROLE_OVERRIDES = new Set(['super_admin', 'admin']);

/**
 * Check whether an Auth already has a capability.
 *
 * Expects `auth.capabilities` to have been populated by the auth hook via
 * RolesService. If absent (e.g. legacy call site), falls back to the built-in
 * seed for the org role so behavior remains safe.
 */
export function hasCapability(auth: Auth, capability: Capability): boolean {
	return resolveCapabilities(auth).has(capability);
}

/**
 * Resolve the effective capability set for an Auth.
 *
 * Precedence:
 *   1. `auth.capabilities` (pre-resolved by the auth hook) — authoritative.
 *   2. Instance-role override (super_admin/admin) → all capabilities.
 *   3. API keys → derived from `read`/`write` scopes.
 *   4. Session fallback → built-in seed for the org role.
 *   5. Partial session → empty set.
 */
export function resolveCapabilities(auth: Auth): ReadonlySet<Capability> {
	if (auth.type === 'partial_session') return EMPTY;

	// Authoritative source once hydrated by the auth hook.
	if ('capabilities' in auth && Array.isArray(auth.capabilities)) {
		return new Set(auth.capabilities);
	}

	if (auth.type === 'session' && INSTANCE_ROLE_OVERRIDES.has(auth.user.role)) {
		return new Set(ALL_CAPABILITIES);
	}

	if (auth.type === 'api_key') {
		// Explicit capability allowlist wins — lets operators issue keys scoped
		// to exactly what they need (e.g. a key that can only publish one
		// collection). Falls back to the coarse read/write mapping otherwise
		// for keys issued before the capability model existed.
		if (Array.isArray(auth.capabilities) && auth.capabilities.length > 0) {
			return new Set(auth.capabilities);
		}
		const caps = new Set<Capability>(['document.read', 'asset.read']);
		if (auth.permissions.includes('write')) {
			caps.add('document.create');
			caps.add('document.update');
			caps.add('document.delete');
			caps.add('document.publish');
			caps.add('document.unpublish');
			caps.add('asset.upload');
			caps.add('asset.delete');
		}
		return caps;
	}

	// Session without pre-resolved capabilities → seed fallback.
	const builtin = BUILTIN_ROLE_SEED[auth.organizationRole as OrganizationRole];
	return builtin ? new Set(builtin.capabilities) : EMPTY;
}

/**
 * Resolve the effective organization role name for an Auth, honoring
 * instance-role overrides. Returns the role name as a string — built-in or
 * custom — or `null` for partial sessions and API keys.
 *
 * Used by schema-level access lists: an allowlist like
 * `['admin','owner','Testing']` is matched literally against this value, so
 * custom role names participate just like built-ins do.
 */
export function effectiveOrganizationRole(auth: Auth): string | null {
	if (auth.type !== 'session') return null;
	if (INSTANCE_ROLE_OVERRIDES.has(auth.user.role)) return 'owner';
	return auth.organizationRole ?? null;
}

const EMPTY: ReadonlySet<Capability> = new Set<Capability>();

/**
 * Shape of the RBAC payload exposed to the client by the admin layout's
 * server load. Mirror this in `App.PageData` so Svelte pages can read
 * `$page.data.rbac` without casting to `any`.
 */
export interface RbacPayload {
	/** Current organization role name (built-in or custom). `null` for none. */
	role: string | null;
	/** Capabilities resolved for this session. Safe to treat as read-only. */
	capabilities: Capability[];
}
