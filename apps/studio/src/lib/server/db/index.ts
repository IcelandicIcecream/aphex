import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as pgliteMigrate } from 'drizzle-orm/pglite/migrator';
import type { Logger } from 'drizzle-orm';
import postgres from 'postgres';
import { PGlite } from '@electric-sql/pglite';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import { createPostgreSQLProvider, pgConnectionUrl } from '@aphexcms/postgresql-adapter';
import { createPgliteProvider } from '@aphexcms/postgresql-adapter/pglite';
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
const multiTenancy = { enableRLS: true, enableHierarchy: true };

// Driver selection: set APHEX_DATABASE=pglite to run on an embedded Postgres (no Docker — great
// for zero-infra dev and single-container self-host). Anything else uses the postgres-js driver
// against DATABASE_URL / PG_*. `drizzleDb` is the raw Drizzle instance better-auth and a few
// routes use directly; its relational `.query` API is identical on both drivers.
type DrizzleDb = ReturnType<typeof drizzlePostgres<typeof schema>>;

let client: postgres.Sql | PGlite;
let drizzleDb: DrizzleDb;
let db: DatabaseAdapter;

if (env.APHEX_DATABASE?.toLowerCase() === 'pglite') {
	// During `vite build`'s analyse pass (`building`), use an ephemeral in-memory instance so the
	// build never touches the real data dir. At runtime persist to a local folder (gitignored).
	const dataDir = building ? undefined : env.APHEX_PGLITE_DIR || '.aphex/pgdata';
	if (dataDir) mkdirSync(dataDir, { recursive: true }); // pglite doesn't create parent dirs
	const pglite = new PGlite(dataDir);
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

export { client, drizzleDb };
export { db };
