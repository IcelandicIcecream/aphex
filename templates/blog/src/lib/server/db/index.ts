import type { Logger } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import { pgMigrationConnectionUrl } from '@aphexcms/postgresql-adapter';
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

// Auto-push on boot: a blog deploy is single-instance, so there's no concurrent-push
// race to guard against — this makes `pnpm dev` (and a fresh Vercel deploy) "just work"
// with zero setup. Skipped during the build pass.
const autoMigrate = !['false', '0', 'no', 'off'].includes(
	(env.APHEX_DB_AUTO_MIGRATE ?? '').toLowerCase()
);

// A blog is single-org — no parent/child organization hierarchy needed.
const multiTenancy = { enableHierarchy: false };

// ── Database driver selection ──────────────────────────────────────────────
// SQLite (libsql) by default — a local `file:` database, zero infra, perfect for
// a blog. Switches to Postgres when DATABASE_URL looks like one (e.g. a Neon
// database auto-provisioned by the repo's "Deploy to Vercel" button, or one
// connected from Vercel's Storage tab) or APHEX_DATABASE=postgres is set
// explicitly. Mirrors the `aphex migrate` CLI's own driver-detection rule.
const driver = env.APHEX_DATABASE?.toLowerCase();
const usesPostgres =
	driver === 'postgres' || (!driver && /^postgres(ql)?:\/\//.test(env.DATABASE_URL ?? ''));

let database: DatabaseBundle;

if (usesPostgres) {
	database = await postgresAdapter({
		// `building` serves no requests, so a placeholder is fine — postgres-js connects lazily.
		connectionString: building ? 'postgres://build-placeholder' : (env.DATABASE_URL as string),
		// Direct/unpooled when available (e.g. Neon's DATABASE_URL_UNPOOLED) — the
		// migration's advisory lock needs real session semantics; see PostgresAdapterConfig.
		migrationConnectionString: building ? undefined : pgMigrationConnectionUrl(env),
		// `VERCEL` is always set on Vercel's build/runtime — a small per-instance pool is
		// the right shape for serverless (see PostgresAdapterConfig.poolMax for why).
		poolMax: env.VERCEL ? 1 : undefined,
		building,
		autoMigrate,
		logger,
		multiTenancy
	});
} else {
	database = await sqliteAdapter({
		// TURSO_DATABASE_URL/TURSO_AUTH_TOKEN are what Vercel's Turso Cloud marketplace
		// integration injects when connected from the Storage tab — falling back to
		// those means connecting that integration is all a Vercel deploy needs.
		url: building
			? 'file::memory:'
			: env.DATABASE_URL || env.TURSO_DATABASE_URL || 'file:.aphex/blog.db',
		authToken: env.DATABASE_AUTH_TOKEN || env.TURSO_AUTH_TOKEN,
		building,
		autoMigrate,
		logger,
		multiTenancy
	});
}

// `drizzleDb` is the raw Drizzle instance the auth provider and a few routes use
// directly; the relational `.query` API those consumers use is identical across
// both drivers.
export const { client, drizzleDb, dbDialect, db } = database;
