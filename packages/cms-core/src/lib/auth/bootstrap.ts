import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cmsLogger } from '../utils/logger';
import { isInstanceEmpty } from './instance-state';
import type { DatabaseAdapter } from '../db/interfaces/index';

/** Instance-level role a bootstrap policy may grant. */
export type InstanceRole = 'super_admin' | 'admin' | 'editor' | 'viewer';

/** Where the claim-code hash lives inside the instance-settings blob. */
const CLAIM_CODE_KEY = 'bootstrapClaimCodeHash';

export interface BootstrapContext {
	user: { id: string; email: string; emailVerified: boolean };
	/**
	 * True only when the system is *provably* empty.
	 *
	 * Never inferred from a missing capability: an adapter that can't answer the
	 * question yields `false`, so an unanswerable check can't be mistaken for
	 * "nobody is here yet, promote this person".
	 */
	isFirstUser: boolean;
	/** The request that triggered profile creation, when there is one. */
	request?: Request;
	db: DatabaseAdapter;
}

/**
 * Decides what instance role a brand-new user profile gets.
 *
 * Bootstrapping is a policy decision, not a library one — how you claim a fresh
 * instance depends on how you deploy it. Return `null` for "no promotion"; the
 * caller falls back to the ordinary `editor` role.
 */
export interface BootstrapPolicy {
	(ctx: BootstrapContext): Promise<InstanceRole | null>;
	/**
	 * Optional one-off startup step, run before any request is served.
	 *
	 * Lets a recipe own its own setup instead of making the app wire it: only
	 * `claimCode()` needs one (to generate and log its code), and an app that
	 * swaps recipes shouldn't have to remember to delete a hook. Callers invoke
	 * it as `policy.prepare?.(db)` — recipes without setup simply omit it.
	 */
	prepare?: (db: DatabaseAdapter) => Promise<void>;
}

function hashCode(code: string): string {
	return createHash('sha256').update(code).digest('hex');
}

/** Constant-time compare of two hex digests of equal length. */
function digestsMatch(a: string, b: string): boolean {
	const left = Buffer.from(a, 'hex');
	const right = Buffer.from(b, 'hex');
	if (left.length !== right.length || left.length === 0) return false;
	return timingSafeEqual(left, right);
}

/**
 * Ensure an unclaimed instance has a pending claim code, and log it.
 *
 * Only the **hash** is persisted: a leaked database dump or backup shouldn't be
 * enough to claim the instance. Called at startup by `claimCode()` consumers.
 */
export async function ensureClaimCode(db: DatabaseAdapter): Promise<void> {
	if (!(await isInstanceEmpty(db))) return;

	const settings = await db.getInstanceSettings();
	if (typeof settings[CLAIM_CODE_KEY] === 'string') return;

	const code = randomBytes(24).toString('base64url');
	await db.updateInstanceSettings({ [CLAIM_CODE_KEY]: hashCode(code) });

	cmsLogger.info(
		'[Bootstrap]',
		`\n\n  This instance has no administrator yet.\n` +
			`  Sign up at /admin and enter this claim code to become the super admin:\n\n` +
			`      ${code}\n\n` +
			`  It is single-use and is not stored in recoverable form. If you lose it,\n` +
			`  clear "${CLAIM_CODE_KEY}" from instance settings and restart to get a new one.\n`
	);
}

/**
 * True when nobody has claimed this instance yet and a code is waiting to be
 * used. Drives the sign-up form's claim-code field: without this the code has
 * nowhere to go but a hand-set cookie, which is not a flow anyone can follow.
 *
 * Deliberately narrow. It reveals only that an instance is unclaimed — never the
 * code or its hash — so it is safe to hand to an unauthenticated page. That fact
 * is already obvious to anyone who can reach a CMS with no users in it.
 */
export async function isInstanceUnclaimed(db: DatabaseAdapter): Promise<boolean> {
	if (!(await isInstanceEmpty(db))) return false;

	const settings = await db.getInstanceSettings();
	return typeof settings[CLAIM_CODE_KEY] === 'string';
}

/**
 * The default. Keeps the familiar first-run wizard, but promotion requires a
 * code printed to the server log at startup — so arriving first isn't enough,
 * you also have to control the deployment. Same shape as Jupyter's `?token=`
 * and GitLab's generated root password.
 *
 * Clearing the hash here is not what makes the code single-use — two concurrent
 * claims can both read it before either clears it. Mutual exclusion comes from
 * `tryClaimBootstrap`, which `createUserProfileWithBootstrap` takes before
 * granting any instance role: the loser is demoted to an ordinary profile even
 * though this returned `super_admin`. Clearing the hash still matters, just for
 * the sequential case — it stops the code being reused later.
 *
 * One residual: a claim can be spent by a request whose profile insert then
 * fails, which costs a code rather than granting anything. Recover by clearing
 * the key from instance settings and restarting for a fresh one.
 */
export function claimCode(
	options: { readCode?: (request?: Request) => string | undefined } = {}
): BootstrapPolicy {
	/**
	 * Header first, then an `aphex_bootstrap_code` cookie. The profile is created
	 * on the first authenticated request after sign-up, which may be a redirect
	 * the signup form doesn't control, so a header alone would be unreachable from
	 * a plain HTML flow. Override `readCode` to accept it somewhere else.
	 *
	 * Deliberately *not* a `?claim=` query parameter, which this used to accept.
	 * A URL carrying the code lands in browser history, server and proxy access
	 * logs, and any `Referer` sent to a third party — persisting a credential in
	 * several places nobody thinks to clear, to save one hop that the cookie
	 * already covers.
	 */
	const readCode =
		options.readCode ??
		((request?: Request) => {
			if (!request) return undefined;

			const header = request.headers.get('x-aphex-bootstrap-code');
			if (header) return header;

			const cookie = request.headers.get('cookie');
			const raw = cookie?.match(/(?:^|;\s*)aphex_bootstrap_code=([^;]+)/)?.[1];
			// The sign-up form percent-encodes the value. A generated base64url code
			// has nothing to decode, but a custom one may.
			return raw === undefined ? undefined : decodeURIComponent(raw);
		});

	const policy: BootstrapPolicy = async ({ isFirstUser, request, db }) => {
		if (!isFirstUser) return null;

		const supplied = readCode(request)?.trim();
		if (!supplied) return null;

		const settings = await db.getInstanceSettings();
		const expected = settings[CLAIM_CODE_KEY];
		if (typeof expected !== 'string') return null;

		if (!digestsMatch(hashCode(supplied), expected)) {
			cmsLogger.warn('[Bootstrap]', 'Rejected claim attempt — code did not match');
			return null;
		}

		// Single-use: clearing the hash is what makes a second claimant lose.
		await db.updateInstanceSettings({ [CLAIM_CODE_KEY]: null });
		cmsLogger.info('[Bootstrap]', 'Instance claimed — super admin created');
		return 'super_admin';
	};

	// The code only exists because this recipe was chosen, so this recipe is what
	// generates it. Swapping to another recipe takes the startup step with it.
	policy.prepare = ensureClaimCode;
	return policy;
}

/**
 * First user whose address is on the allowlist becomes super admin — Discourse's
 * `DISCOURSE_DEVELOPER_EMAILS`. Good when you know the owner's address at deploy
 * time and would rather not read logs.
 *
 * This recipe is only as strong as the address is trustworthy, so pair it with
 * `requireEmailVerification`. That's enforced at the auth layer — better-auth
 * refuses to complete sign-in for an unconfirmed address, so an unverified user
 * never reaches profile creation at all. Re-checking it here would be dead code
 * when verification is on, and would brick a fresh install when it's off.
 */
export function allowlistEmail(emails: string | readonly string[] | undefined): BootstrapPolicy {
	const allowed = new Set(
		(typeof emails === 'string' ? emails.split(',') : (emails ?? []))
			.map((email) => email.trim().toLowerCase())
			.filter(Boolean)
	);

	return async ({ isFirstUser, user }) => {
		if (!isFirstUser || allowed.size === 0) return null;
		if (!allowed.has(user.email.trim().toLowerCase())) return null;

		if (!user.emailVerified) {
			// Advice, not enforcement — the decision belongs to the auth layer.
			cmsLogger.warn(
				'[Bootstrap]',
				`Promoting ${user.email} on an unverified address. Set ` +
					`AUTH_REQUIRE_EMAIL_VERIFICATION=true so the address has to be proven.`
			);
		}

		return 'super_admin';
	};
}

/**
 * Whoever signs up first becomes super admin, with nothing else required.
 *
 * This is what WordPress, Ghost, Strapi and Payload do, and it's fine when you
 * install immediately after deploying. It is **not** fine for an instance that
 * sits reachable before anyone signs in: the first stranger to find the URL owns
 * it. Opt in deliberately.
 */
export function openFirstUser(): BootstrapPolicy {
	return async ({ isFirstUser }) => (isFirstUser ? 'super_admin' : null);
}

/**
 * Never promote anyone. Provision the first administrator out of band — a seed
 * script, a migration, or a direct row — the way Directus and Keycloak do.
 */
export function never(): BootstrapPolicy {
	return async () => null;
}
