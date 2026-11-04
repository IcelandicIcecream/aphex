// types/auth.ts
import type { CMSUser } from './user';
import type { OrganizationRole } from './organization';

/** A second factor the sign-in challenge can offer. */
export type TwoFactorMethod = 'totp' | 'email';

/**
 * Auth-provider feature flags the admin UI branches on, surfaced from the
 * host's auth config through `CMSConfig.auth.features` to `CMSInstances`.
 *
 * Auth itself stays host-owned (ports & adapters — see `AuthProvider`); this is
 * only the small set of *facts* the core admin needs to decide which controls to
 * render (e.g. whether to show the TOTP setup or the account-deletion zone). It
 * lets settings panels live in core without reaching into app-only auth config.
 */
export interface AuthFeatures {
	/** Second factors offered at sign-in. Email also requires an email adapter. */
	twoFactorMethods: TwoFactorMethod[];
	/** Whether a user may delete their own account (Account → Danger zone). */
	allowAccountDeletion: boolean;
	/** Whether a verified email is required before sign-in. */
	requireEmailVerification: boolean;
}

export interface SessionAuth {
	type: 'session';
	user: CMSUser;
	session: {
		id: string;
		expiresAt: Date;
	};
	organizationId: string;
	/**
	 * Role name for the user in the active organization.
	 *
	 * Built-in roles (`owner`/`admin`/`editor`/`viewer`) are typed as the
	 * `OrganizationRole` union; custom roles defined per-org are plain
	 * strings. Consumers that need to branch on built-ins should use
	 * `effectiveOrganizationRole` from types/capabilities.
	 */
	organizationRole: OrganizationRole | string;
	/**
	 * Capability ids granted to this session, resolved by the auth hook (RolesService).
	 * `string[]`, not `Capability[]`: a role can grant plugin-declared capabilities that
	 * aren't in the built-in `Capability` union. Present for fully-authenticated
	 * sessions; when absent, callers fall back to built-in seed values — see
	 * `resolveCapabilities`.
	 */
	capabilities?: string[];
	organizations?: Array<{
		id: string;
		name: string;
		slug: string;
		role: OrganizationRole | string;
		isActive: boolean;
		metadata?: any;
	}>;
}

/**
 * Partial session — user is authenticated but has no active organization.
 * Used for routes like /invitations where the user hasn't joined an org yet.
 */
export interface PartialSessionAuth {
	type: 'partial_session';
	user: CMSUser;
	session: {
		id: string;
		expiresAt: Date;
	};
}

export interface ApiKeyAuth {
	type: 'api_key';
	keyId: string;
	name: string;
	/**
	 * Legacy coarse-grained scopes: `read` (read capabilities) and `write`
	 * (mutating capabilities). Preserved for backwards compatibility with
	 * keys issued before the fine-grained capability model. Still used as
	 * the fallback source when `capabilities` is not populated.
	 */
	permissions: ('read' | 'write')[];
	/**
	 * Fine-grained capability-id allowlist for this API key. When present, overrides
	 * the coarse `permissions` mapping — the key can do exactly what's listed and
	 * nothing else. `string[]` so keys can be scoped to plugin capabilities too.
	 */
	capabilities?: string[];
	organizationId: string;
	environment?: string;
	lastUsedAt?: Date;
}

export type Auth = SessionAuth | PartialSessionAuth | ApiKeyAuth;

// Access control utilities.
//
// These are thin wrappers over the capability system. They exist so callers
// don't need to import `hasCapability` + a specific capability string for the
// common "can this user do X" branching in server loads and UI gating.
//
// Capabilities are resolved once per request by the auth hook and stored on
// `auth.capabilities`, so these remain synchronous.
import { hasCapability } from './capabilities';

/**
 * Does the user have *any* mutating capability?
 *
 * Coarse-grained on purpose: this is for UI gating where you just want to
 * decide whether to show the entire edit/upload surface. Don't use it to
 * authorise a specific mutation — the server's PermissionChecker does that
 * per-operation (canCreate vs canUpdate vs canDelete, etc).
 */
export function canWrite(auth: Auth): boolean {
	return (
		hasCapability(auth, 'document.create') ||
		hasCapability(auth, 'document.update') ||
		hasCapability(auth, 'document.delete') ||
		hasCapability(auth, 'asset.upload')
	);
}

/**
 * Can the user manage organization members (invite / remove / change role)?
 */
export function canManageMembers(auth: Auth): boolean {
	return (
		hasCapability(auth, 'member.invite') ||
		hasCapability(auth, 'member.remove') ||
		hasCapability(auth, 'member.changeRole')
	);
}

/**
 * Can the user manage API keys?
 */
export function canManageApiKeys(auth: Auth): boolean {
	return hasCapability(auth, 'apiKey.manage');
}

/**
 * Is this session effectively read-only?
 *
 * Inverse of `canWrite`. Named for historical reasons — prefer `canWrite()`
 * for positive checks; `isViewer()` remains available for call sites that
 * read more naturally in the negative (e.g. `isReadOnly={isViewer(auth)}`).
 */
export function isViewer(auth: Auth): boolean {
	return !canWrite(auth);
}
