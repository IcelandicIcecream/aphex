// Who may sign up, and what they get when they do.
//
// These are **CMS policy decisions, not auth-provider concerns**. Whether an
// instance is invite-only, and who becomes its first administrator, should mean
// the same thing whether the app authenticates with Better Auth, Keycloak,
// Supabase, or something hand-rolled — so they live behind the `AuthProvider`
// port rather than inside any one implementation of it.
//
// Before this existed, both rules were enforced inside `@aphexcms/auth`'s
// Better Auth wiring, which meant a third-party provider silently inherited
// neither: `inviteOnly: true` would be configured and quietly do nothing. An
// implementation is free to call these wherever its lifecycle allows, but it is
// no longer free to *re-derive* them.

import { cmsLogger } from '../utils/logger';
import { isInstanceEmpty, canDetermineInstanceEmptiness } from './instance-state';
import { isPendingInvitation } from './invitation-status';
import type { BootstrapPolicy, InstanceRole } from './bootstrap';
import type { DatabaseAdapter } from '../db/interfaces/index';
import type { UserProfile } from '../types/index';

/**
 * Thrown when sign-up is refused by policy.
 *
 * Providers translate this into whatever their transport expects — Better Auth
 * raises an `APIError`, a REST handler might return 403. The message is written
 * to be safe to show a user.
 */
export class SignUpBlockedError extends Error {
	readonly code = 'SIGN_UP_BLOCKED';
	constructor(message: string) {
		super(message);
		this.name = 'SignUpBlockedError';
	}
}

export interface SignUpGateOptions {
	db: DatabaseAdapter;
	/** Address attempting to register. Matched case-insensitively. */
	email: string | undefined;
	/** When false the gate is disabled entirely and this is a no-op. */
	inviteOnly: boolean;
}

/**
 * Throws `SignUpBlockedError` unless this address may create an account.
 *
 * Two ways through: the instance is provably empty (nobody exists yet to have
 * sent an invitation, so gating the first sign-up would lock the door with the
 * keys inside), or the address holds a pending invitation.
 *
 * Narrowing that first exception is the bootstrap policy's job — see
 * `resolveBootstrapRole` — not this gate's.
 */
export async function assertSignUpAllowed({
	db,
	email,
	inviteOnly
}: SignUpGateOptions): Promise<void> {
	if (!inviteOnly) return;

	if (await isInstanceEmpty(db)) {
		cmsLogger.info('[SignUp]', 'Allowing first sign-up on an empty instance');
		return;
	}

	// Invitations are stored lower-cased and matched exactly, so a mixed-case
	// sign-up would otherwise find nothing and be refused.
	const address = email?.toLowerCase().trim();
	const invitations = address ? await db.findInvitationsByEmail(address) : [];

	if (!invitations.some((invitation) => isPendingInvitation(invitation))) {
		cmsLogger.warn('[SignUp]', `Blocked sign-up for ${address} — no pending invitation`);
		throw new SignUpBlockedError(
			'Sign-up is by invitation only. Ask an administrator for an invite.'
		);
	}
}

export interface BootstrapRoleOptions {
	db: DatabaseAdapter;
	user: { id: string; email: string; emailVerified: boolean };
	/** The request that triggered profile creation, when there is one. */
	request?: Request;
	bootstrap: BootstrapPolicy;
}

/**
 * Runs the bootstrap policy for a brand-new user, returning the instance role to
 * grant or `null` for none.
 *
 * Deliberately not wrapped in a transaction. SQLite allows a single writer, and
 * holding that lock across the policy's own round-trips collides with the auth
 * provider's concurrent user/session inserts (SQLITE_BUSY). The atomicity was
 * only partial anyway — see `claimCode`: a claim is single-use, not mutually
 * exclusive.
 */
export async function resolveBootstrapRole({
	db,
	user,
	request,
	bootstrap
}: BootstrapRoleOptions): Promise<InstanceRole | null> {
	// "Provably empty", not "couldn't prove otherwise". An adapter that can't
	// answer this must not read as "no users exist" — that inversion once
	// promoted every single sign-up to super admin.
	const isFirstUser = await isInstanceEmpty(db);

	if (!canDetermineInstanceEmptiness(db)) {
		cmsLogger.warn(
			'[SignUp]',
			'Database adapter does not implement hasAnyUserProfiles() — skipping bootstrap. ' +
				'Provision the first administrator out of band.'
		);
	}

	return bootstrap({ user, isFirstUser, request, db });
}

/**
 * Take the one-time bootstrap claim, or report that somebody else has it.
 *
 * An adapter without `tryClaimBootstrap` keeps the old, racy behaviour rather
 * than never promoting anyone — the opposite of the rule `isInstanceEmpty`
 * follows, and on purpose. There, failing closed skips a promotion; here it
 * would leave a fresh install with no administrator and no way to get one.
 */
async function claimBootstrapPromotion(db: DatabaseAdapter): Promise<boolean> {
	const claim = db.tryClaimBootstrap?.bind(db);
	if (!claim) {
		cmsLogger.warn(
			'[SignUp]',
			'Database adapter does not implement tryClaimBootstrap() — bootstrap promotion is not ' +
				'race-safe. Concurrent first sign-ups could both be promoted.'
		);
		return true;
	}
	return claim();
}

/**
 * The one place a CMS user profile is created for a newly-authenticated user.
 *
 * Every `AuthProvider` should route new profiles through here so bootstrap
 * promotion happens identically regardless of who did the authenticating.
 */
export async function createUserProfileWithBootstrap(
	options: BootstrapRoleOptions
): Promise<UserProfile> {
	const proposed = await resolveBootstrapRole(options);

	// The policy decided *whether* this user qualifies; the claim decides whether
	// they got there first. Both are needed: the policy's own `isFirstUser` check
	// reads a snapshot taken before the profile insert, so two sign-ups racing on
	// a fresh instance can both pass it and both be promoted. Every promotion in
	// the instance's lifetime funnels through this one call, so claiming here
	// covers every policy — including a custom one — without each having to know
	// about the race.
	const granted = proposed && (await claimBootstrapPromotion(options.db)) ? proposed : null;

	if (proposed && !granted) {
		cmsLogger.warn(
			'[SignUp]',
			`Bootstrap promotion for ${options.user.id} lost the claim — another sign-up got there first. ` +
				'Creating an ordinary profile instead.'
		);
	}

	cmsLogger.info(
		'[SignUp]',
		`Creating profile for ${options.user.id}${granted ? ` with role ${granted.toUpperCase()}` : ''}`
	);

	return options.db.createUserProfile({
		userId: options.user.id,
		role: granted ?? 'editor'
	});
}
