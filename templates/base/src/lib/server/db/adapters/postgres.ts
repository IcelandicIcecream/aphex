/// <reference types="vite/client" />
import { createHash } from 'node:crypto';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createPostgreSQLProvider } from '@aphexcms/postgresql-adapter';
import * as cmsSchema from '../cms-schema';
import * as authSchema from '../auth-schema';
import type { BaseAdapterConfig, DatabaseBundle } from './types';
import journal from '../../../../../drizzle/meta/_journal.json';

const schema = { ...cmsSchema, ...authSchema };

/**
 * Arbitrary but stable 64-bit key for the boot-migration advisory lock. Any value
 * works as long as it's constant across replicas. Inlined as a literal (it's a
 * compile-time constant, so `.unsafe()` carries no injection risk).
 */
const MIGRATION_LOCK_KEY = '7021226604092025191';

// `import.meta.glob` + `?raw` are resolved by Vite at build time, so the migration
// SQL is inlined straight into the compiled server bundle. A runtime
// `fs.readFileSync(resolve('drizzle'))` would work locally and in Docker, but not
// on Vercel: its serverless adapter decides what ships with the function via
// `@vercel/nft`, a *static* import-graph tracer — a path only ever touched through
// `fs` at runtime has no import for it to see, so the folder would be missing from
// the deployed function. A real import sidesteps that entirely.
const migrationFiles = import.meta.glob('../../../../../drizzle/*.sql', {
	eager: true,
	query: '?raw',
	import: 'default'
}) as Record<string, string>;

interface MigrationEntry {
	sql: string[];
	bps: boolean;
	folderMillis: number;
	hash: string;
}

/**
 * `dialect`/`session` are real runtime properties of `PgDatabase` (see
 * `drizzle-orm/pg-core/db.js`), but marked `@internal` and omitted from its public
 * `.d.ts` — this is exactly what `drizzle-orm/postgres-js/migrator`'s own `migrate()`
 * calls internally, just with a bundled migration list instead of one read from disk.
 */
interface InternalPgDatabase {
	dialect: {
		migrate(
			migrations: MigrationEntry[],
			session: unknown,
			config: Record<string, unknown>
		): Promise<void>;
	};
	session: unknown;
}

/** Reassembles drizzle-kit's `readMigrationFiles()` output from the statically-bundled files. */
function readBundledMigrations(): MigrationEntry[] {
	return journal.entries.map((entry) => {
		const path = Object.keys(migrationFiles).find((p) => p.endsWith(`/${entry.tag}.sql`));
		if (!path) {
			throw new Error(
				`Migration "${entry.tag}.sql" is in the journal but wasn't bundled — did you add a ` +
					'migration file without regenerating, or move the drizzle/ folder?'
			);
		}
		const query = migrationFiles[path];
		return {
			sql: query.split('--> statement-breakpoint'),
			bps: entry.breakpoints,
			folderMillis: entry.when,
			hash: createHash('sha256').update(query).digest('hex')
		};
	});
}

export interface PostgresAdapterConfig extends BaseAdapterConfig {
	/** postgres-js connection string (a placeholder is fine during `building`). */
	connectionString: string;
	/**
	 * Max connections in the app's postgres-js pool. Defaults to 50, sized for a
	 * long-running Node/Docker process serving many concurrent requests. On serverless
	 * (Vercel), pass a small number instead (e.g. 1) — each function instance handles
	 * requests essentially one at a time, concurrency comes from *more instances* not a
	 * bigger pool per instance, and Neon's own connection string is already pooled
	 * (PgBouncer). A large per-instance pool just adds cold-start connection-setup time
	 * and risks exhausting Neon's total connection budget when several instances scale
	 * out at once.
	 */
	poolMax?: number;
}

/**
 * Standard Postgres driver (postgres-js against DATABASE_URL / PG_*). Connects
 * lazily on first query, so a placeholder URL is fine during the build pass.
 *
 * Auto-migrates on boot (like sqlite/pglite) so `pnpm dev` just works. Unlike
 * single-instance pglite, real Postgres can have several replicas booting at once,
 * so the migration runs under a session-level **advisory lock**: exactly one boot
 * applies the pending migrations while the rest block, then find nothing to do.
 * Additive, generated migration files only — the same ones `pnpm db:migrate` runs.
 */
export async function postgresAdapter(config: PostgresAdapterConfig): Promise<DatabaseBundle> {
	if (!config.building && config.autoMigrate !== false) {
		// Dedicated single connection: `pg_advisory_lock` is session-scoped, so the
		// lock and the migration must run on the same connection. Released and closed
		// in `finally` so a mid-migration failure never leaks the lock.
		const migrationClient = postgres(config.connectionString, { max: 1 });
		try {
			await migrationClient.unsafe(`SELECT pg_advisory_lock(${MIGRATION_LOCK_KEY})`);
			// Calls the same dialect-level primitive `drizzle-orm/postgres-js/migrator`'s
			// `migrate()` does — only the migration list's source differs (bundled import
			// instead of `readMigrationFiles()`'s `fs.readFileSync`).
			const migrationDb = drizzlePostgres(migrationClient) as unknown as InternalPgDatabase;
			await migrationDb.dialect.migrate(readBundledMigrations(), migrationDb.session, {});
		} catch (error) {
			// "already exists" (42710 = duplicate object, 42P07 = duplicate table) on a
			// boot migration means the schema was created by `db:push`, which keeps no
			// migration journal — so the migrator is replaying history onto a database
			// that already has it. Explain the way out instead of a raw stack trace.
			const code = (error as { cause?: { code?: string } }).cause?.code;
			if (code === '42710' || code === '42P07') {
				throw new Error(
					'Boot migration failed: the database schema already exists but has no ' +
						'migration journal (it was likely created with `pnpm db:push`). Either set ' +
						'APHEX_DB_AUTO_MIGRATE=false and keep managing this database with db:push, ' +
						'or start from a fresh database so migrations can run from the beginning.',
					{ cause: error }
				);
			}
			throw error;
		} finally {
			await migrationClient.unsafe(`SELECT pg_advisory_unlock(${MIGRATION_LOCK_KEY})`);
			await migrationClient.end();
		}
	}

	const sql = postgres(config.connectionString, {
		max: config.poolMax ?? 50,
		idle_timeout: 20, // Release idle connections after 20s
		connect_timeout: 10, // Fail fast if can't connect in 10s
		max_lifetime: 60 * 5 // Recycle connections every 5 minutes
	});
	const drizzleDb = drizzlePostgres(sql, { schema, logger: config.logger });
	const db = createPostgreSQLProvider({
		client: sql,
		multiTenancy: config.multiTenancy
	}).createAdapter();

	return { client: sql, drizzleDb, db, dbDialect: 'pg' };
}
