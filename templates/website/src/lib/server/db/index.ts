import type { Logger } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import { pgConnectionUrl } from '@aphexcms/postgresql-adapter';
import { postgresAdapter } from './adapters/postgres';
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

// Boot-migrate is on by default (zero-config dev). Opt out in production with
// APHEX_DB_AUTO_MIGRATE=false (or 0/no/off) and run migrations as a separate step.
const autoMigrate = !['false', '0', 'no', 'off'].includes(
	(env.APHEX_DB_AUTO_MIGRATE ?? '').toLowerCase()
);

// ── Database driver selection ──────────────────────────────────────────────
// Each adapter encapsulates its own client, Drizzle instance, migrations,
// schema, and dialect — switching databases is a single change here. This
// template defaults to SQLite (zero-infra: a local libsql file, schema pushed
// on boot, no Docker) and keeps Postgres one env var away for production:
//   - <default> → sqlite: libsql file database (or Turso via libsql://… + token)
//   - APHEX_DATABASE=postgres → postgres-js against DATABASE_URL / PG_*
const driver = env.APHEX_DATABASE?.toLowerCase();
let database: DatabaseBundle;

if (driver === 'postgres' || driver === 'postgresql') {
	database = await postgresAdapter({
		// `building` serves no requests, so a placeholder is fine — postgres-js connects lazily.
		connectionString: building ? 'postgres://build-placeholder' : pgConnectionUrl(env),
		building,
		autoMigrate,
		logger,
		multiTenancy
	});
} else {
	database = await sqliteAdapter({
		url: building ? 'file::memory:?cache=shared' : env.APHEX_SQLITE_URL || 'file:.aphex/base.db',
		authToken: env.DATABASE_AUTH_TOKEN,
		building,
		autoMigrate,
		logger,
		multiTenancy
	});
}

// `drizzleDb` is the raw Drizzle instance the auth provider and a few routes use
// directly; the relational `.query` API those consumers use is identical across
// all three drivers.
export const { client, drizzleDb, dbDialect, db } = database;
