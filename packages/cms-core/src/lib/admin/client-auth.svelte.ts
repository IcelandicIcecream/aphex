import { getContext, setContext } from 'svelte';
import type { Readable } from 'svelte/store';

/**
 * Client-side auth seam — the browser twin of the server `AuthProvider`.
 *
 * The account settings panels (change password, two-factor, delete account) are
 * auth mutations, which only the host's auth provider can perform. Core stays
 * provider-agnostic, so instead of importing the host's `authClient` it depends
 * on this interface; the host passes a provider-backed implementation to
 * `<AphexStudio adminAuthClient={…}>`, which publishes it here for the panels to
 * read. The shapes mirror Better Auth's client so a host wrapper is a near
 * pass-through, but any provider that satisfies the interface works.
 */

/** Result envelope: `{ data?, error? }`, matching Better Auth's client calls. */
export interface AdminAuthResult<T = unknown> {
	data?: T | null;
	error?: { message?: string } | null;
}

/**
 * Reactive session, as a Svelte store. Only `user.twoFactorEnabled` is read by
 * the panels; `refetch` forces an uncached read (the signed session cookie is
 * cached ~60s and isn't rewritten when 2FA toggles).
 */
export interface AdminSessionState {
	data?: { user?: { twoFactorEnabled?: boolean | null } | null } | null;
	refetch?: (opts?: { query?: { disableCookieCache?: boolean } }) => Promise<unknown>;
}

export interface AdminAuthClient {
	/**
	 * Sign-in / sign-up / verification live on the same seam because the embedded
	 * login view (`/admin/login`, folded into the admin catch-all) is core-mounted
	 * and must drive the host's auth provider without importing it. They are
	 * optional: a host that only wants the account-security panels (and keeps its
	 * own login route) can omit them, and `LoginView` guards on their presence.
	 */
	signIn?(input: { email: string; password: string }): Promise<AdminAuthResult>;

	signUp?(input: {
		email: string;
		password: string;
		name: string;
		callbackURL?: string;
	}): Promise<AdminAuthResult>;

	sendVerificationEmail?(input: { email: string; callbackURL?: string }): Promise<AdminAuthResult>;

	/**
	 * Did a successful password check return a two-factor challenge instead of a
	 * session? (Better Auth returns `{ twoFactorRedirect: true }`.) Core can't know
	 * the provider's shape, so the host answers.
	 */
	isTwoFactorRedirect?(data: unknown): boolean;

	changePassword(input: {
		currentPassword: string;
		newPassword: string;
		revokeOtherSessions?: boolean;
	}): Promise<AdminAuthResult>;

	deleteUser(input: { password: string }): Promise<AdminAuthResult>;

	twoFactor: {
		enable(input: {
			password: string;
		}): Promise<AdminAuthResult<{ backupCodes: string[]; totpURI: string }>>;
		verifyTotp(input: { code: string }): Promise<AdminAuthResult>;
		disable(input: { password: string }): Promise<AdminAuthResult>;
		generateBackupCodes(input: {
			password: string;
		}): Promise<AdminAuthResult<{ backupCodes: string[] }>>;
	};

	/** Reactive session store (e.g. Better Auth's `authClient.useSession()`). */
	useSession(): Readable<AdminSessionState>;
}

const ADMIN_AUTH_CLIENT_KEY = Symbol.for('aphex.admin.authClient');

/** Publish the admin auth client to descendants (call once in the shell). */
export function setAdminAuthClient(client: AdminAuthClient): void {
	setContext(ADMIN_AUTH_CLIENT_KEY, client);
}

/**
 * Read the admin auth client. Returns `undefined` when the host didn't provide
 * one — the account security panels guard on it and show a hint rather than
 * throw, so an app that opts out of those panels still renders the rest.
 */
export function useAdminAuthClient(): AdminAuthClient | undefined {
	return getContext<AdminAuthClient | undefined>(ADMIN_AUTH_CLIENT_KEY);
}
