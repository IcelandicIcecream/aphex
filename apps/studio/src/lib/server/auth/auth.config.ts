// apps/studio/src/lib/server/auth/auth.config.ts
//
// App-owned auth options. Auth-provider specifics live here rather than in
// cms-core's provider-agnostic CMSConfig — the app owns the auth provider
// instance (see ./instance.ts), so this is where email/password behaviour is
// configured. Kept in a standalone module (no imports from ./auth or
// aphex.config.ts) to avoid a circular import at instance construction time.

import { env } from '$env/dynamic/private';

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
}

export const authOptions: AuthOptions = {
	requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION === 'true'
};
