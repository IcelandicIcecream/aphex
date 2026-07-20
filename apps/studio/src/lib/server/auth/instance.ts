// Builds the hardened Better Auth instance + AuthService + AuthProvider from
// @aphexcms/auth, injecting the app-owned pieces: the database, raw Drizzle
// handle, email transport + templates, cache, dialect, and env-driven options.
//
// Kept in a separate module (imported by ./index and ./service) so the wiring
// has a single construction site.
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import { createAphexAuth } from '@aphexcms/auth';
import { db, drizzleDb, dbDialect } from '$lib/server/db';
import { email, emailConfig } from '$lib/server/email';
import { cacheAdapter } from '$lib/server/cache';
import { authOptions } from './auth.config.js';

export const { auth, authService, authProvider } = createAphexAuth({
	db,
	drizzleDb,
	provider: dbDialect,
	env,
	building,
	emailAdapter: email,
	emailRenderers: emailConfig,
	cacheAdapter,
	options: authOptions
});
