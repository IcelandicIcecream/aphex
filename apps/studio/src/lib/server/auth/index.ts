// apps/studio/src/lib/server/auth/index.ts
//
// The app's entire auth setup. Everything here is wiring: which adapters to use,
// which env vars to read, which policy to apply. The machinery — better-auth
// instance, session/API-key service, and the `AuthProvider` adapter cms-core
// talks to — comes from `@aphexcms/auth`.
//
// This used to be ~850 lines of hand-rolled instance + service in this app. They
// were a copy of the package's, so every fix had to be made twice.

import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import { createAphexAuth } from '@aphexcms/auth';
import { db, drizzleDb, dbDialect } from '$lib/server/db';
import { email, emailConfig } from '$lib/server/email';
import { cacheAdapter } from '$lib/server/cache';
import { authOptions, bootstrapPolicy } from './auth.config';

// Both spellings are accepted; AUTH_* is preferred. During SvelteKit's
// build/analyse pass the package substitutes placeholders, since that worker
// imports server modules without ever serving a request.
const secret = env.AUTH_SECRET || env.BETTER_AUTH_SECRET;
const baseURL = env.AUTH_URL || env.BETTER_AUTH_URL;

// CSV of origins permitted for cross-origin auth requests. Better Auth uses this
// for CSRF/origin checks; without it, cookie-auth mutations are reachable from
// any site a signed-in admin visits.
const trustedOrigins = (env.AUTH_TRUSTED_ORIGINS || baseURL || '')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

export const {
	auth,
	service: authService,
	provider: authProvider
} = createAphexAuth({
	database: db,
	drizzleDb,
	dialect: dbDialect,
	secret,
	baseURL,
	trustedOrigins,
	building,
	emailAdapter: email,
	email: emailConfig,
	cache: cacheAdapter,
	options: authOptions,
	bootstrap: bootstrapPolicy,
	appName: 'Aphex CMS'
});
