import { drizzle } from 'drizzle-orm/postgres-js';
import type { Logger } from 'drizzle-orm';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import { createPostgreSQLProvider, pgConnectionUrl } from '@aphexcms/postgresql-adapter';
import * as cmsSchema from './cms-schema';
import * as authSchema from './auth-schema';

const schema = {
	...cmsSchema,
	...authSchema
};

import type { DatabaseAdapter } from '@aphexcms/cms-core/server';

const SLOW_QUERY_THRESHOLD_MS = parseInt(env.SLOW_QUERY_MS || '100');

class SlowQueryLogger implements Logger {
	logQuery(query: string, params: unknown[]): void {
		const start = performance.now();
		// Store start time — Drizzle calls logQuery before execution
		// We use queueMicrotask to measure after the query completes
		queueMicrotask(() => {
			const duration = performance.now() - start;
			if (duration >= SLOW_QUERY_THRESHOLD_MS) {
				const truncatedQuery = query.length > 200 ? query.slice(0, 200) + '...' : query;
				console.warn(`[SLOW QUERY] ${duration.toFixed(1)}ms — ${truncatedQuery}`);
			}
		});
	}
}

// SvelteKit's `vite build` runs an analyse pass that imports server modules
// to discover routes. During that pass `building` is true and no requests
// are served, so we don't need a real DATABASE_URL — fall back to a
// placeholder so the build doesn't crash. postgres-js connects lazily on
// first query, so the placeholder is never actually dialed.
const databaseUrl = building ? 'postgres://build-placeholder' : pgConnectionUrl(env);

export const client = postgres(databaseUrl, {
	max: 50,
	idle_timeout: 20, // Release idle connections after 20s
	connect_timeout: 10, // Fail fast if can't connect in 10s
	max_lifetime: 60 * 5 // Recycle connections every 5 minutes
});
export const drizzleDb = drizzle(client, {
	schema,
	logger: env.ENABLE_QUERY_LOG === 'true' ? new SlowQueryLogger() : undefined
});

const provider = createPostgreSQLProvider({
	client,
	multiTenancy: {
		enableRLS: true,
		enableHierarchy: true
	}
});

const adapter = provider.createAdapter();
export const db = adapter as DatabaseAdapter;
