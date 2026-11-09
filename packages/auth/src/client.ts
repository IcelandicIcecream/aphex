// The browser half of `aphexAuth()`. Kept off the package root, which imports the
// server-only better-auth instance and would pull it into the client bundle.
import type { AdminAuthClient } from '@aphexcms/cms-core/client';
import { createAuthClient } from 'better-auth/svelte';
import { apiKeyClient } from '@better-auth/api-key/client';
import { twoFactorClient } from 'better-auth/client/plugins';

/**
 * The better-auth client, for a login page of your own (`authClient.signIn.social(...)`).
 * The admin doesn't need this: hand it `adminAuthClient`.
 */
export const authClient = createAuthClient({
	plugins: [
		apiKeyClient(),
		// No `twoFactorPage` or `onTwoFactorRedirect`: those navigate from inside the fetch
		// hook, before `signIn.email` resolves, so the login view would lose its
		// `callbackUrl`. Without them the call resolves with `{ twoFactorRedirect: true }`
		// and the view decides where to go.
		twoFactorClient()
	]
});

/**
 * Better-auth's client types come from the client plugin list, which can't see the
 * server's response, so `signIn.email` is typed as always returning a session.
 */
function isTwoFactorRedirect(data: unknown): data is { twoFactorRedirect: true } {
	return (
		typeof data === 'object' &&
		data !== null &&
		'twoFactorRedirect' in data &&
		data.twoFactorRedirect === true
	);
}

/** What the admin's login and account panels call: `adminAuthClient` in `aphex.client.ts`. */
export const adminAuthClient: AdminAuthClient = {
	signIn: (input) => authClient.signIn.email(input),
	signUp: (input) => authClient.signUp.email(input),
	sendVerificationEmail: (input) => authClient.sendVerificationEmail(input),
	signOut: () => authClient.signOut(),
	isTwoFactorRedirect,

	changePassword: (input) => authClient.changePassword(input),
	deleteUser: (input) => authClient.deleteUser(input),
	twoFactor: {
		enable: (input) => authClient.twoFactor.enable(input),
		verifyTotp: (input) => authClient.twoFactor.verifyTotp(input),
		disable: (input) => authClient.twoFactor.disable(input),
		generateBackupCodes: (input) => authClient.twoFactor.generateBackupCodes(input),
		sendOtp: () => authClient.twoFactor.sendOtp(),
		verifyOtp: (input) => authClient.twoFactor.verifyOtp(input),
		verifyBackupCode: (input) => authClient.twoFactor.verifyBackupCode(input)
	},
	useSession: () => authClient.useSession()
};
