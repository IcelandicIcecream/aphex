// limits/interfaces/limits.ts
//
// Quota / entitlement enforcement — the seam a SaaS built on Aphex uses to cap
// a tenant (N documents/month, seat counts, org counts) without any billing or
// plan logic leaking into the core.
//
// This is a PORT, like DatabaseAdapter / StorageAdapter / EmailAdapter. Core
// defines it, calls it at the write seams (document create, and later org
// create / member invite), and ships a no-op default so OSS and self-hosters
// are never gated. The POLICY — plan definitions, Stripe, a billing table —
// lives in the app (see invoiceau) or in Aphex Cloud, never here.
//
// Why a dedicated port and not `access.create`: a quota denial is a 402 (plan
// ceiling), not a 403 (authorization). `access` is synchronous and holds no DB
// handle, so it structurally cannot count existing rows. Keep the two apart.

import type { SchemaType } from '../../types/schemas';
import type { DatabaseAdapter } from '../../db/index';
import type { LocalAPIContext } from '../../local-api/types';

/**
 * The write actions a limit can gate. Extensible — new actions are added as
 * their call sites are wired. Only `document.create` is enforced in Milestone 1.
 */
export type LimitAction = 'document.create' | 'organization.create' | 'member.invite';

/**
 * What a provider receives to decide a limit. Carries a DB handle because the
 * whole point of this seam — the thing `access`/hooks cannot do — is to count
 * existing state (e.g. documents of a type in the current billing period).
 */
export interface LimitContext {
	/** Which write is being attempted. */
	action: LimitAction;
	/** The org the write belongs to — the unit a plan is billed against. */
	organizationId: string;
	/** The target schema, present for `document.create`. */
	schema?: SchemaType;
	/** Who/what is performing the write (user, auth, overrideAccess). */
	context: LocalAPIContext;
	/**
	 * The context-selected database adapter, to count against. This is the
	 * handle that `access` rules and `beforeValidate` hooks deliberately never
	 * get — counting lives here instead.
	 */
	databaseAdapter: DatabaseAdapter;
}

/**
 * Current usage for an action, for UI gating (disable "New", show an upgrade
 * nudge) so a capped tenant isn't lured into a form only to eat a 402 on save.
 */
export interface LimitStatus {
	used: number;
	/** `null` means unlimited. */
	limit: number | null;
}

/**
 * The port. A host provides one via `config.limits`; omit it and the no-op
 * default applies (everything unlimited).
 */
export interface LimitsProvider {
	/**
	 * Write path. Called AFTER authorization passes and BEFORE hooks/validation.
	 * Throw {@link LimitExceededError} to reject the write; return to allow it.
	 */
	assertWithinLimit(ctx: LimitContext): Promise<void>;
	/**
	 * Read path. Report current usage so the admin can gate UI. Enforcement is
	 * `assertWithinLimit` — this is display only.
	 */
	describeLimit(ctx: LimitContext): Promise<LimitStatus>;
}

/**
 * Thrown by a provider when a write would exceed a plan ceiling. Mapped to HTTP
 * 402 at the API boundary (a plan ceiling, not 429 rate limiting), the same way
 * `RevisionConflictError` maps to 409.
 */
export class LimitExceededError extends Error {
	readonly action: LimitAction;
	readonly used: number;
	readonly limit: number;
	readonly upgradeUrl?: string;

	constructor(
		message: string,
		detail: { action: LimitAction; used: number; limit: number; upgradeUrl?: string }
	) {
		super(message);
		this.name = 'LimitExceededError';
		this.action = detail.action;
		this.used = detail.used;
		this.limit = detail.limit;
		this.upgradeUrl = detail.upgradeUrl;
	}
}

/**
 * The default provider when `config.limits` is unset: everything unlimited.
 * Keeps the `create` path branch-free — core always holds a provider.
 */
export const noopLimitsProvider: LimitsProvider = {
	async assertWithinLimit() {
		/* unlimited */
	},
	async describeLimit() {
		return { used: 0, limit: null };
	}
};
