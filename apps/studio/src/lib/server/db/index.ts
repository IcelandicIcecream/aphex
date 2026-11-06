import type { Logger } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import type { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { pgConnectionUrl, postgresAdapter } from '@aphexcms/postgresql-adapter';
import { pgliteAdapter } from '@aphexcms/postgresql-adapter/pglite';
import { sqliteAdapter } from '@aphexcms/sqlite-adapter';
import type * as cmsSchema from './cms-schema';
import * as authSchema from './auth-schema';
import * as sqliteAuthSchema from './auth-schema/sqlite';

// The Postgres relational schema is the canonical typing for the raw Drizzle handle.
// The auth provider and a few routes use the `.query` surface, which libsql and pglite
// share with postgres-js, so the other drivers are cast to this at the export below.
type Schema = typeof cmsSchema & typeof authSchema;
type DrizzleDb = ReturnType<typeof drizzlePostgres<Schema>>;

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

// Boot-migrate is on by default (zero-config dev). Opt out in production with
// APHEX_DB_AUTO_MIGRATE=false (or 0/no/off) and run migrations as a separate step.
const autoMigrate = !['false', '0', 'no', 'off'].includes(
	(env.APHEX_DB_AUTO_MIGRATE ?? '').toLowerCase()
);

// ── Database driver selection ──────────────────────────────────────────────
// Each adapter encapsulates its own client, Drizzle instance and migrations. Studio
// keeps all three behind APHEX_DATABASE so it can exercise every adapter:
//   - sqlite → libsql file database (the standalone templates' default)
//   - pglite → embedded Postgres (no Docker — zero-infra dev / single-container)
//   - <default> → postgres-js against DATABASE_URL / PG_*
const driver = env.APHEX_DATABASE?.toLowerCase();

const database =
	driver === 'sqlite'
		? await sqliteAdapter({
				url: building
					? 'file::memory:?cache=shared'
					: env.APHEX_SQLITE_URL || 'file:.aphex/studio.db',
				authToken: env.DATABASE_AUTH_TOKEN,
				schema: sqliteAuthSchema,
				building,
				autoMigrate,
				logger,
				multiTenancy
			}).connect()
		: driver === 'pglite'
			? await pgliteAdapter({
					// Ephemeral in-memory during the build pass; persist to a gitignored dir at runtime.
					dataDir: building ? undefined : env.APHEX_PGLITE_DIR || '.aphex/pgdata',
					schema: authSchema,
					building,
					autoMigrate,
					logger,
					multiTenancy
				}).connect()
			: await postgresAdapter({
					// `building` serves no requests, so a placeholder is fine — postgres-js connects lazily.
					connectionString: building ? 'postgres://build-placeholder' : pgConnectionUrl(env),
					schema: authSchema,
					building,
					autoMigrate,
					logger,
					multiTenancy
				}).connect();

export const { client } = database;
export const db = database.adapter;
export const dbDialect = database.dialect;
export const drizzleDb = database.drizzleDb as unknown as DrizzleDb;
