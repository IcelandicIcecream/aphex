import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import type { Logger } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import { createSQLiteProvider, applyRecommendedPragmas } from '@aphexcms/sqlite-adapter';
import * as cmsSchema from './cms-schema';
import * as authSchema from './auth-schema';
import type { DatabaseAdapter } from '@aphexcms/cms-core/server';

const schema = {
	...cmsSchema,
	...authSchema
};

const SLOW_QUERY_THRESHOLD_MS = parseInt(env.SLOW_QUERY_MS || '100');

class SlowQueryLogger implements Logger {
	logQuery(query: string, _params: unknown[]): void {
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

const logger = env.ENABLE_QUERY_LOG === 'true' ? new SlowQueryLogger() : undefined;

// SQLite via libsql: a local `file:` database by default (zero infra — perfect for a blog),
// or a Turso-hosted `libsql://` URL for managed hosting. During `vite build`'s analyse pass
// (`building`) use an ephemeral in-memory instance so the build never touches the real file.
const url = building ? 'file::memory:' : env.DATABASE_URL || 'file:.aphex/blog.db';

// libsql doesn't create parent directories for file: databases
if (url.startsWith('file:') && !url.startsWith('file::memory:')) {
	mkdirSync(dirname(resolve(url.slice('file:'.length))), { recursive: true });
}

const client: Client = createClient({ url, authToken: env.DATABASE_AUTH_TOKEN });

// Tune the local SQLite file for a web workload (WAL, synchronous=NORMAL,
// busy_timeout). Skips in-memory/Turso targets itself based on the url.
if (!building) {
	await applyRecommendedPragmas(client, url);
}

// Auto-migrate on boot: a blog deploy is single-instance, so there's no concurrent-migration
// race — this makes `pnpm dev` "just work" with zero setup. Skipped during the build pass.
// (The Dockerfile's `aphex migrate` remains a harmless idempotent no-op after this.)
if (!building) {
	await migrate(drizzle(client), { migrationsFolder: resolve('drizzle') });
}

// `drizzleDb` is the raw Drizzle instance better-auth and a few routes use directly.
const drizzleDb = drizzle(client, { schema, logger });

const db: DatabaseAdapter = createSQLiteProvider({
	client,
	// A blog is single-org — no parent/child organization hierarchy needed.
	multiTenancy: { enableHierarchy: false }
}).createAdapter();

export { client, drizzleDb };
export { db };
