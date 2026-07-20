// @aphexcms/auth — public entrypoint.
//
// The first-party Better Auth adapter for AphexCMS. Owns the hardened auth
// baseline (rate limits, throttles, CSRF origins, cookie-cache, api-key config)
// and implements cms-core's AuthProvider port. Security fixes ship via a version
// bump instead of a per-app hand-edit. The app injects everything it alone knows
// (env, drizzle handle, DatabaseAdapter, email templates, cache, dialect,
// options) into `createAphexAuth`.
//
// Better Auth table definitions are published under the subpath exports
// `@aphexcms/auth/schema/pg` and `@aphexcms/auth/schema/sqlite`.

import { createAuthInstance } from './instance';
import { createAuthService } from './service';
import { createAuthProvider } from './provider';
import type { AphexAuthDeps } from './types';

export { createAuthInstance } from './instance';
export { createAuthService } from './service';
export { createAuthProvider } from './provider';

export type { AphexAuth } from './instance';
export type {
	AphexAuthDeps,
	AphexAuthOptions,
	AphexAuthEnv,
	AuthEmailRenderers,
	RenderedEmail,
	BetterAuthExtensions,
	AuthDrizzleDb
} from './types';
export type {
	AuthService,
	AuthServiceDeps,
	ApiKey,
	ApiKeyWithSecret,
	CreateApiKeyData
} from './service';

/**
 * Assemble the hardened Better Auth instance, the AuthService, and the
 * AuthProvider from one set of injected dependencies.
 *
 * ```ts
 * const { auth, authProvider } = createAphexAuth({
 *   db, drizzleDb, provider: dbDialect, env,
 *   emailAdapter: email, emailRenderers: emailConfig, cacheAdapter, options
 * });
 * ```
 */
export function createAphexAuth(deps: AphexAuthDeps) {
	const auth = createAuthInstance(deps);
	const authService = createAuthService({ auth, drizzleDb: deps.drizzleDb });
	const authProvider = createAuthProvider(authService);
	return { auth, authService, authProvider };
}
