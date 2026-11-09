import { authPagesBase, type AuthProvider, type CMSConfigInput } from '@aphexcms/cms-core/server';
import { createAuthInstance, type AphexAuthInstance } from './instance.js';
import { createAuthService, type AuthService } from './service.js';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import * as pgSchema from './schema/pg.js';
import * as sqliteSchema from './schema/sqlite.js';
import type { AphexAuthConfig } from './types.js';

export type { AphexAuthConfig, AuthOptions, AuthEmailConfig, AuthEmailTemplate } from './types.js';
export type { AphexAuthOptions };
// Bootstrap recipes are NOT re-exported here on purpose. They're CMS policy, not
// Better Auth wiring — an app using Keycloak or Supabase needs them just as much
// as one using this package, so they live in `@aphexcms/cms-core/server`.
export type { AphexAuthInstance } from './instance.js';
export type { AuthService, ApiKey, ApiKeyWithSecret, CreateApiKeyData } from './service.js';
// A value, not a type: route handlers need `instanceof` to tell an incomplete revocation
// (row gone, cache copy still live) from an ordinary delete failure.
export { ApiKeyRevocationError } from './service.js';

/**
 * better-auth keeps a pending challenge in a cookie named `<prefix>.two_factor`. The
 * prefix is configurable and gains `__Secure-` over HTTPS, so this matches the suffix.
 */
function hasPendingTwoFactor(request: Request): boolean {
	const cookies = request.headers.get('cookie')?.split(';') ?? [];
	return cookies.some((cookie) => (cookie.split('=')[0] ?? '').trim().endsWith('two_factor'));
}

export interface AphexAuth {
	/**
	 * The underlying better-auth instance. Exposed deliberately, so anything it can do
	 * is reachable here without this package needing to grow an option for it.
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
 * This is the lower-level form, for an app with its own login and reset pages. For
 * the pages core serves under `/admin`, use `aphexAuth()`.
 */
export function createAphexAuth(config: AphexAuthConfig): AphexAuth {
	const auth = createAuthInstance(config);

	// Match the tables to the dialect the caller's Drizzle client actually speaks;
	// mixing them produces queries that compile but fail at runtime.
	const schema = config.dialect === 'sqlite' ? sqliteSchema : pgSchema;
	const service = createAuthService({
		auth,
		drizzleDb: config.drizzleDb,
		schema,
		// The same cache the api-key plugin uses as secondary storage, so revoking
		// a key can evict it there too rather than leaving a live copy behind.
		cache: config.cache,
		bootstrap: config.bootstrap
	});

	// cms-core talks to auth exclusively through this port, so an app that swaps
	// this package for its own implementation needs nothing else to change.
	const provider: AuthProvider = {
		handle: ({ event, resolve }) =>
			svelteKitHandler({ event, resolve, auth, building: config.building ?? false }),
		getSession: (request, db) => service.getSession(request, db),
		requireSession: (request, db) => service.requireSession(request, db),
		validateApiKey: (request, db) => service.validateApiKey(request, db),
		requireApiKey: (request, db, permission) => service.requireApiKey(request, db, permission),
		// `listApiKeys` queries the apikey table directly, so the adapter it takes is
		// unused today; pass the config's adapter so the port stays honest if that changes.
		listApiKeys: (userId) => service.listApiKeys(config.database, userId),
		createApiKey: (userId, organizationId, data) =>
			service.createApiKey(userId, organizationId, data),
		deleteApiKey: (userId, keyId) => service.deleteApiKey(userId, keyId),
		getUserById: (userId) => service.getUserById(userId),
		getUserByEmail: (email) => service.getUserByEmail(email),
		changeUserName: (userId, name) => service.changeUserName(userId, name),
		changeUserImage: (userId, image) => service.changeUserImage(userId, image),
		requestPasswordReset: (email, redirectTo) => service.requestPasswordReset(email, redirectTo),
		resetPassword: (token, newPassword) => service.resetPassword(token, newPassword),
		hasPendingTwoFactor
	};

	return { auth, service, provider };
}

type AuthConfigInput = NonNullable<CMSConfigInput['auth']>;

/** `createAphexAuth`'s options, minus what core supplies once the adapters exist. */
type AphexAuthOptions = Omit<
	AphexAuthConfig,
	'database' | 'drizzleDb' | 'dialect' | 'cache' | 'emailAdapter' | 'building' | 'authPagesPath'
> &
	Pick<AuthConfigInput, 'loginBranding'> & {
		/** Where a signed-out visitor to `/admin` is sent. Defaults to the built-in `/admin/login`. */
		loginUrl?: string;
	};

/**
 * Better Auth for `aphex.config.ts`:
 *
 * ```ts
 * auth: aphexAuth({ secret: env.AUTH_SECRET, baseURL: env.AUTH_URL })
 * ```
 *
 * The database, cache and email adapters come from the rest of the config, and the
 * auth tables are created with the CMS's. Nothing is built until the first request.
 *
 * To use something else, such as SSO, put your own object in `auth` instead:
 * `{ provider: ({ database }) => myProvider, loginUrl: '/sso/login' }`.
 */
export function aphexAuth(options: AphexAuthOptions = {}): AuthConfigInput {
	const { loginUrl = '/admin/login', loginBranding, ...config } = options;
	return {
		provider: ({ database, drizzleDb, dialect, cache, email, building }) =>
			createAphexAuth({
				...config,
				database,
				drizzleDb,
				dialect,
				cache,
				emailAdapter: email,
				building,
				authPagesPath: authPagesBase(loginUrl)
			}).provider,
		tables: { pg: pgSchema, sqlite: sqliteSchema },
		loginUrl,
		loginBranding,
		// The admin UI branches on these, so they mirror createAuthInstance's defaults.
		features: {
			twoFactorMethods: config.options?.twoFactorMethods ?? ['totp', 'email'],
			allowAccountDeletion: config.options?.allowAccountDeletion ?? false,
			requireEmailVerification: config.options?.requireEmailVerification ?? false
		}
	};
}
