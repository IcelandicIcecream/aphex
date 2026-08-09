// apps/studio/src/lib/server/auth/auth.config.ts
//
// App-owned auth options. Auth-provider specifics live here rather than in
// cms-core's provider-agnostic CMSConfig — the app owns the auth provider
// instance (see ./instance.ts), so this is where email/password behaviour is
// configured. Kept in a standalone module (no imports from ./auth or
// aphex.config.ts) to avoid a circular import at instance construction time.

import { env } from '$env/dynamic/private';
import {
	claimCode,
	allowlistEmail,
	openFirstUser,
	type BootstrapPolicy
} from '@aphexcms/cms-core/server';

export interface AuthOptions {
	/**
	 * Require a verified email before a user can sign in. When enabled, a
	 * verification email is sent on sign-up and sign-in is blocked until the
	 * address is confirmed (the sign-up screen then shows a "check your inbox"
	 * step instead of redirecting straight into the admin).
	 *
	 * Disabled by default: studio is the reference app and runs without an SMTP /
	 * Mailpit server. Opt in with AUTH_REQUIRE_EMAIL_VERIFICATION=true.
	 *
	 * Consider enabling it in production — without it, anyone can sign up with an
	 * address they don't own (and the first user becomes super admin).
	 *
	 * @default false
	 */
	requireEmailVerification: boolean;

	/**
	 * Which second factors the sign-in challenge offers — `'totp'` (authenticator
	 * app), `'email'` (a code mailed on request), or both. Backup codes are always
	 * available and aren't listed. Email needs an email adapter; with none
	 * configured it's dropped regardless, so it can't strand anyone on a code that
	 * never sends.
	 *
	 * Both by default. Set AUTH_TWO_FACTOR_METHODS to a comma-separated list to
	 * change it — `totp` for authenticator-only, `email` to skip the QR code
	 * entirely and just mail codes.
	 *
	 * @default ['totp', 'email']
	 */
	twoFactorMethods: TwoFactorMethod[];
}

export type TwoFactorMethod = 'totp' | 'email';

const ALL_TWO_FACTOR_METHODS: TwoFactorMethod[] = ['totp', 'email'];

function isTwoFactorMethod(value: string): value is TwoFactorMethod {
	return (ALL_TWO_FACTOR_METHODS as string[]).includes(value);
}

/**
 * Parses AUTH_TWO_FACTOR_METHODS, ignoring anything unrecognised. A typo falling
 * back to the default is better than it silently removing a factor people rely
 * on to sign in.
 */
function parseTwoFactorMethods(raw: string | undefined): TwoFactorMethod[] {
	if (!raw) return ALL_TWO_FACTOR_METHODS;
	const parsed = raw
		.split(',')
		.map((part) => part.trim().toLowerCase())
		.filter(isTwoFactorMethod);
	return parsed.length > 0 ? parsed : ALL_TWO_FACTOR_METHODS;
}

export const authOptions: AuthOptions = {
	requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION === 'true',
	twoFactorMethods: parseTwoFactorMethods(env.AUTH_TWO_FACTOR_METHODS)
};

/**
 * How this instance gets its first administrator.
 *
 * Default: whoever signs up first becomes super admin — the same install flow as
 * WordPress, Ghost, Strapi, Payload and Dokploy. It assumes you sign up promptly
 * after deploying, because an instance left reachable before that belongs to
 * whoever finds the URL first.
 *
 * Two opt-in ways to close that window, and one way to opt out entirely:
 *
 * - `APHEX_BOOTSTRAP_EMAIL=you@example.com` — only that address is promoted.
 * - `APHEX_BOOTSTRAP_CLAIM_CODE=true` — sign-up also needs a code logged at
 *   startup, which the sign-up form prompts for. Note the claim window closes on
 *   the first sign-up, not on the code being used.
 * - `never()` — no promotion at all; provision the first admin out of band.
 *
 * See the Authentication docs for the trade-offs.
 */
export const bootstrapPolicy: BootstrapPolicy = env.APHEX_BOOTSTRAP_EMAIL
	? allowlistEmail(env.APHEX_BOOTSTRAP_EMAIL)
	: env.APHEX_BOOTSTRAP_CLAIM_CODE === 'true'
		? claimCode()
		: openFirstUser();
