import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { email } from '$lib/server/email';
import { authOptions } from '$lib/server/auth/auth.config';

/**
 * The second step of sign-in. Reached only from /login, after a correct password
 * on an account with an authenticator enrolled — at which point there is no
 * session yet, just better-auth's short-lived two-factor cookie.
 *
 * So this route is deliberately *outside* (protected): requiring a session here
 * would make the challenge unreachable.
 */
export const load: PageServerLoad = async ({ locals, request, cookies }) => {
	const { aphexCMS } = locals;

	const session = await aphexCMS.auth?.getSession(request, aphexCMS.databaseAdapter);
	if (session?.session) {
		redirect(302, '/admin');
	}

	// No pending challenge means there is nothing this page can verify — either
	// someone opened the URL directly, or the cookie aged out (better-auth gives
	// it ten minutes). Send them back to sign in rather than rendering a form
	// whose only possible outcome is "Invalid two factor cookie".
	//
	// Matched by suffix because the full name is `<prefix>.two_factor`, and the
	// prefix is configurable and additionally gains `__Secure-` over HTTPS.
	const hasChallenge = cookies
		.getAll()
		.some(({ name }) => name.endsWith('two_factor') && !name.includes('trust_device'));

	if (!hasChallenge) {
		redirect(302, '/login?error=two_factor_expired');
	}

	// Mirrors the resolution the auth package does: email needs both the method and
	// a real adapter, and TOTP comes back regardless if that leaves nothing — a
	// challenge screen offering no factors is a locked account.
	const otpAvailable = Boolean(authOptions.twoFactorMethods.includes('email') && email);
	return {
		otpAvailable,
		totpAvailable: authOptions.twoFactorMethods.includes('totp') || !otpAvailable
	};
};
