// packages/cms-core/src/auth/provider.ts
import type { SessionAuth, PartialSessionAuth, ApiKeyAuth, ApiKeySummary } from '../types/index';
import type { DatabaseAdapter } from '../db/interfaces/index';
import type { Handle } from '@sveltejs/kit';

export interface AuthProvider {
	/**
	 * Serve the provider's own routes, such as sign-in callbacks. Core wraps its
	 * request handling in this: call `resolve` for any request that isn't yours.
	 * Requests you answer skip the CMS's auth checks. Optional, because a provider
	 * whose routes live elsewhere (SSO through a separate service) has none to serve.
	 */
	handle?: Handle;

	// Session auth (browser, admin UI)
	getSession(
		request: Request,
		db: DatabaseAdapter
	): Promise<SessionAuth | PartialSessionAuth | null>;
	requireSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth>;

	// API key auth (programmatic access)
	validateApiKey(request: Request, db: DatabaseAdapter): Promise<ApiKeyAuth | null>;
	requireApiKey(
		request: Request,
		db: DatabaseAdapter,
		permission?: 'read' | 'write'
	): Promise<ApiKeyAuth>;
	/**
	 * The display-only listing of a user's API keys, for the account settings
	 * panel. Optional: a provider without programmatic access can omit it and the
	 * panel renders empty. Secrets are never returned — a key's value exists once,
	 * at creation.
	 */
	listApiKeys?(userId: string): Promise<ApiKeySummary[]>;

	// User management
	getUserById(
		userId: string
	): Promise<{ id: string; name?: string; email: string; image?: string } | null>;
	getUserByEmail(
		email: string
	): Promise<{ id: string; name?: string; email: string; image?: string } | null>;
	changeUserName(userId: string, name: string): Promise<void>;
	changeUserImage?(userId: string, image: string | null): Promise<void>;

	// Password reset
	requestPasswordReset(email: string, redirectTo?: string): Promise<void>;
	resetPassword(token: string, newPassword: string): Promise<void>;
}
