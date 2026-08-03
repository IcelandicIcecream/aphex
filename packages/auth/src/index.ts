import type { AuthProvider } from '@aphexcms/cms-core/server';
import { createAuthInstance, type AphexAuthInstance } from './instance.js';
import { createAuthService, type AuthService } from './service.js';
import * as pgSchema from './schema/pg.js';
import * as sqliteSchema from './schema/sqlite.js';
import type { AphexAuthConfig } from './types.js';

export type { AphexAuthConfig, AuthOptions, AuthEmailConfig, AuthEmailTemplate } from './types.js';
export type { AphexAuthInstance } from './instance.js';
export type { AuthService, ApiKey, ApiKeyWithSecret, CreateApiKeyData } from './service.js';

export interface AphexAuth {
	/**
	 * The underlying better-auth instance. Exposed deliberately — better-auth is a
	 * peer dependency, so anything it can do is reachable here without this
	 * package needing to grow an option for it.
	 */
	auth: AphexAuthInstance;
	/** Server-side operations: sessions, API keys, user lookups, password reset. */
	service: AuthService;
	/** Ready to hand to `createCMSConfig({ auth: { provider } })`. */
	provider: AuthProvider;
}

/**
 * Assembles auth for an Aphex app in one call.
 *
 * Replaces the ~975 lines every app used to copy: the better-auth instance, the
 * auth service, the `AuthProvider` adapter, and the dialect-split Drizzle tables.
 *
 * ```ts
 * export const { auth, service, provider } = createAphexAuth({
 *   database: db,
 *   drizzleDb,
 *   dialect: dbDialect,
 *   secret: env.AUTH_SECRET,
 *   baseURL: env.AUTH_URL,
 *   emailAdapter: email,
 *   email: emailConfig,
 *   cache: cacheAdapter,
 *   options: { requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION === 'true' }
 * });
 * ```
 *
 * The app still owns its `/login`, `/reset-password/[token]` and `/verify-email`
 * pages — those are the parts worth customising, and baking them in would mean
 * every site looked the same.
 */
export function createAphexAuth(config: AphexAuthConfig): AphexAuth {
	const auth = createAuthInstance(config);

	// Match the tables to the dialect the caller's Drizzle client actually speaks;
	// mixing them produces queries that compile but fail at runtime.
	const schema = config.dialect === 'sqlite' ? sqliteSchema : pgSchema;
	const service = createAuthService({ auth, drizzleDb: config.drizzleDb, schema });

	// cms-core talks to auth exclusively through this port, so an app that swaps
	// this package for its own implementation needs nothing else to change.
	const provider: AuthProvider = {
		getSession: (request, db) => service.getSession(request, db),
		requireSession: (request, db) => service.requireSession(request, db),
		validateApiKey: (request, db) => service.validateApiKey(request, db),
		requireApiKey: (request, db, permission) => service.requireApiKey(request, db, permission),
		getUserById: (userId) => service.getUserById(userId),
		getUserByEmail: (email) => service.getUserByEmail(email),
		changeUserName: (userId, name) => service.changeUserName(userId, name),
		changeUserImage: (userId, image) => service.changeUserImage(userId, image),
		requestPasswordReset: (email, redirectTo) => service.requestPasswordReset(email, redirectTo),
		resetPassword: (token, newPassword) => service.resetPassword(token, newPassword)
	};

	return { auth, service, provider };
}
