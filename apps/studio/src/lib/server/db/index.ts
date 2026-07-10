import type { Logger } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import { pgConnectionUrl } from '@aphexcms/postgresql-adapter';
import { postgresAdapter } from './adapters/postgres';
import { pgliteAdapter } from './adapters/pglite';
import { sqliteAdapter } from './adapters/sqlite';
import type { DatabaseBundle } from './adapters/types';

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
const multiTenancy = { enableRLS: true, enableHierarchy: true };

// ── Database driver selection ──────────────────────────────────────────────
// Each adapter encapsulates its own client, Drizzle instance, migrations,
// schema, and dialect — switching databases is a single change here. A
// single-database app replaces this whole block with one line, e.g.:
//   const database = await sqliteAdapter({ url: env.APHEX_SQLITE_URL, building });
// Studio keeps all three behind APHEX_DATABASE so it can exercise every adapter:
//   - sqlite → libsql file database (experimental; the blog template's default)
//   - pglite → embedded Postgres (no Docker — zero-infra dev / single-container)
//   - <default> → postgres-js against DATABASE_URL / PG_*
const driver = env.APHEX_DATABASE?.toLowerCase();
let database: DatabaseBundle;

if (driver === 'sqlite') {
	database = await sqliteAdapter({
		url: building ? 'file::memory:?cache=shared' : env.APHEX_SQLITE_URL || 'file:.aphex/studio.db',
		authToken: env.DATABASE_AUTH_TOKEN,
		building,
		logger,
		multiTenancy
	});
} else if (driver === 'pglite') {
	database = await pgliteAdapter({
		// Ephemeral in-memory during the build pass; persist to a gitignored dir at runtime.
		dataDir: building ? undefined : env.APHEX_PGLITE_DIR || '.aphex/pgdata',
		building,
		logger,
		multiTenancy
	});
} else {
	database = await postgresAdapter({
		// `building` serves no requests, so a placeholder is fine — postgres-js connects lazily.
		connectionString: building ? 'postgres://build-placeholder' : pgConnectionUrl(env),
		building,
		logger,
		multiTenancy
	});
}

// `drizzleDb` is the raw Drizzle instance the auth provider and a few routes use
// directly; the relational `.query` API those consumers use is identical across
// all three drivers.
export const { client, drizzleDb, dbDialect, db } = database;
