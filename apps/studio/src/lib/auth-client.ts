// Better Auth client for Svelte
import { createAuthClient } from 'better-auth/svelte';
import { apiKeyClient } from '@better-auth/api-key/client';
import { twoFactorClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
	// Base URL is same domain, so we don't need to specify it
	plugins: [
		apiKeyClient(), // Enable API key management from client
		// Two-factor (TOTP). Deliberately configured *without* `twoFactorPage` /
		// `onTwoFactorRedirect`: those navigate from inside the fetch hook, which
		// fires before `signIn.email` resolves, so the login page would lose the
		// chance to carry its `callbackUrl` across the challenge. Without them the
		// call simply resolves with `{ twoFactorRedirect: true }` and the caller
		// decides where to go — see routes/login/+page.svelte.
		twoFactorClient()
	]
});

/**
 * Did this sign-in stop at the two-factor challenge instead of creating a session?
 *
 * better-auth's client types are derived from the *client* plugin list, which
 * can't see the server's response shape, so `signIn.email` is typed as though it
 * always returns a session — `twoFactorRedirect` is missing from it even though
 * the server sends it. better-auth's own docs work around this with an `in`
 * check; this is that check, named, so callers get a real runtime narrowing
 * rather than an assertion that could quietly go stale.
 */
export function isTwoFactorRedirect(data: unknown): data is { twoFactorRedirect: true } {
	return (
		typeof data === 'object' &&
		data !== null &&
		'twoFactorRedirect' in data &&
		data.twoFactorRedirect === true
	);
}

// Export specific methods for convenience
export const {
	signIn,
	signUp,
	signOut,
	useSession,
	apiKey, // API key management methods
	twoFactor // TOTP enrolment + verification
} = authClient;
