import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { migrate as pgliteMigrate } from 'drizzle-orm/pglite/migrator';
import type { Logger } from 'drizzle-orm';
import postgres from 'postgres';
import { PGlite } from '@electric-sql/pglite';
import { createClient, type Client } from '@libsql/client';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import { createPostgreSQLProvider, pgConnectionUrl } from '@aphexcms/postgresql-adapter';
import { createPgliteProvider, createPgliteClient } from '@aphexcms/postgresql-adapter/pglite';
import { createSQLiteProvider, applyRecommendedPragmas } from '@aphexcms/sqlite-adapter';
import * as sqliteCmsSchema from '@aphexcms/sqlite-adapter/schema';
import * as cmsSchema from './cms-schema';
import * as authSchema from './auth-schema';
import * as sqliteAuthSchema from './auth-schema.sqlite';
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
const multiTenancy = { enableRLS: true, enableHierarchy: true };

// Driver selection:
// - APHEX_DATABASE=pglite → embedded Postgres (no Docker — zero-infra dev / single-container).
// - APHEX_DATABASE=sqlite → libsql file database (experimental in studio; the blog template's
//   default). Schema is pushed on boot via drizzle-kit — no migration files.
// - anything else → postgres-js against DATABASE_URL / PG_*.
// `drizzleDb` is the raw Drizzle instance better-auth and a few routes use directly; the
// relational `.query` API those consumers use is identical across all three drivers.
type DrizzleDb = ReturnType<typeof drizzlePostgres<typeof schema>>;

let client: postgres.Sql | PGlite | Client;
let drizzleDb: DrizzleDb;
let db: DatabaseAdapter;
/** Which better-auth drizzle provider matches the active driver. */
let dbDialect: 'pg' | 'sqlite' = 'pg';

if (env.APHEX_DATABASE?.toLowerCase() === 'sqlite') {
	// Experimental studio mode for exercising @aphexcms/sqlite-adapter. Uses its own schema
	// tree (sqlite-core CMS tables + auth-schema.sqlite) and pushes it on boot with drizzle-kit
	// (a devDependency — this branch is for dev, not a pruned production image).
	const url = building
		? 'file::memory:?cache=shared'
		: env.APHEX_SQLITE_URL || 'file:.aphex/studio.db';
	if (url.startsWith('file:') && !url.startsWith('file::memory:')) {
		mkdirSync(dirname(resolve(url.slice('file:'.length))), { recursive: true });
	}
	const libsql = createClient({ url, authToken: env.DATABASE_AUTH_TOKEN });
	const sqliteSchema = { ...sqliteCmsSchema, ...sqliteAuthSchema };
	if (!building) {
		// WAL, synchronous=NORMAL, busy_timeout — skips in-memory targets itself.
		await applyRecommendedPragmas(libsql, url);
		const { pushSQLiteSchema } = await import('drizzle-kit/api');
		const { apply } = await pushSQLiteSchema(sqliteSchema, drizzleLibsql(libsql) as any);
		await apply();
	}
	client = libsql;
	// The consumers of drizzleDb use the relational `.query` surface, which libsql and
	// postgres-js share; cast at this driver boundary (same move as the pglite branch).
	drizzleDb = drizzleLibsql(libsql, { schema: sqliteSchema, logger }) as unknown as DrizzleDb;
	db = createSQLiteProvider({ client: libsql, multiTenancy }).createAdapter();
	dbDialect = 'sqlite';
} else if (env.APHEX_DATABASE?.toLowerCase() === 'pglite') {
	// During `vite build`'s analyse pass (`building`), use an ephemeral in-memory instance so the
	// build never touches the real data dir. At runtime persist to a local folder (gitignored).
	const dataDir = building ? undefined : env.APHEX_PGLITE_DIR || '.aphex/pgdata';
	// Guarded client: HMR-safe singleton + graceful-shutdown hook (see the adapter).
	const pglite = createPgliteClient(dataDir);
	// Auto-migrate on boot: pglite is single-instance, so there's no concurrent-migration race
	// (unlike Postgres) — this makes `APHEX_DATABASE=pglite pnpm dev` "just work" with zero setup.
	// Runs as the default superuser, before the provider's SET ROLE. Skipped during the build pass.
	if (!building) {
		await pgliteMigrate(drizzlePglite({ client: pglite }), {
			migrationsFolder: resolve('drizzle')
		});
	}
	client = pglite;
	// pglite and postgres-js Drizzle expose the same query surface; cast at this driver boundary.
	drizzleDb = drizzlePglite({ client: pglite, schema, logger }) as unknown as DrizzleDb;
	// createAdapter queues CREATE ROLE/GRANT/SET ROLE (after migration, before the first query).
	db = createPgliteProvider({ client: pglite, multiTenancy }).createAdapter();
} else {
	// SvelteKit's `vite build` analyse pass imports server modules but serves no requests, so a
	// placeholder URL is fine — postgres-js connects lazily on first query.
	const databaseUrl = building ? 'postgres://build-placeholder' : pgConnectionUrl(env);
	const sql = postgres(databaseUrl, {
		max: 50,
		idle_timeout: 20, // Release idle connections after 20s
		connect_timeout: 10, // Fail fast if can't connect in 10s
		max_lifetime: 60 * 5 // Recycle connections every 5 minutes
	});
	client = sql;
	drizzleDb = drizzlePostgres(sql, { schema, logger });
	db = createPostgreSQLProvider({ client: sql, multiTenancy }).createAdapter();
}

export { client, drizzleDb, dbDialect };
export { db };
