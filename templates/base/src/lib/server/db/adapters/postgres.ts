import { resolve } from 'node:path';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { migrate as pgMigrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { createPostgreSQLProvider } from '@aphexcms/postgresql-adapter';
import * as cmsSchema from '../cms-schema';
import * as authSchema from '../auth-schema';
import type { BaseAdapterConfig, DatabaseBundle } from './types';

const schema = { ...cmsSchema, ...authSchema };

/**
 * Arbitrary but stable 64-bit key for the boot-migration advisory lock. Any value
 * works as long as it's constant across replicas. Inlined as a literal (it's a
 * compile-time constant, so `.unsafe()` carries no injection risk).
 */
const MIGRATION_LOCK_KEY = '7021226604092025191';

export interface PostgresAdapterConfig extends BaseAdapterConfig {
	/** postgres-js connection string (a placeholder is fine during `building`). */
	connectionString: string;
}

/**
 * Standard Postgres driver (postgres-js against DATABASE_URL / PG_*). Connects
 * lazily on first query, so a placeholder URL is fine during the build pass.
 *
 * Auto-migrates on boot (like the sqlite adapter) so `pnpm dev` just works. Real
 * Postgres can have several replicas booting at once,
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
			await pgMigrate(drizzlePostgres(migrationClient), {
				migrationsFolder: resolve('drizzle')
			});
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
		max: 50,
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
