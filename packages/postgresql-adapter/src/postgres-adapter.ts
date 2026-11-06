import { resolve } from 'node:path';
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate as pgMigrate } from 'drizzle-orm/postgres-js/migrator';
import type { Logger } from 'drizzle-orm';
import postgres from 'postgres';
import type { DatabaseDescriptor, ResolvedDatabase } from '@aphexcms/cms-core/server';
import { createPostgreSQLProvider } from './index';
import * as cmsTables from './schema';

/**
 * Arbitrary but stable 64-bit key for the boot-migration advisory lock. Any value
 * works as long as it's constant across replicas. Inlined as a literal (it's a
 * compile-time constant, so `.unsafe()` carries no injection risk).
 */
const MIGRATION_LOCK_KEY = '7021226604092025191';

export interface PostgresAdapterOptions {
	/**
	 * postgres-js connection string. May be undefined while the config is evaluated,
	 * as an env var is during a build; it is only required when the database connects.
	 */
	connectionString: string | undefined;
	/**
	 * Tables to expose on `drizzleDb` alongside the CMS's own, such as the auth tables
	 * from `@aphexcms/auth/schema/pg`. Migrations come from `migrationsFolder`, not this.
	 */
	schema?: Record<string, unknown>;
	/** Generated migrations, relative to the working directory. Defaults to `drizzle`. */
	migrationsFolder?: string;
	/** SvelteKit's build pass: skip migrations. */
	building?: boolean;
	/** Apply pending migrations on boot. Defaults to `true`. Otherwise run `aphex migrate`. */
	autoMigrate?: boolean;
	/** Drizzle query logger. */
	logger?: Logger;
	multiTenancy?: { enableRLS?: boolean; enableHierarchy?: boolean };
}

type PostgresDrizzle = PostgresJsDatabase<Record<string, unknown>>;

/**
 * Declare a Postgres database inline in `aphex.config.ts`. Nothing connects until
 * core resolves it on the first request.
 */
export function postgresAdapter(
	options: PostgresAdapterOptions
): DatabaseDescriptor<PostgresDrizzle, postgres.Sql> {
	return {
		kind: 'aphex/database',
		key: `postgres:${options.connectionString}`,
		connect: () => connectPostgres(options)
	};
}

/**
 * Standard Postgres driver (postgres-js against DATABASE_URL / PG_*). Connects
 * lazily on first query, so a placeholder URL is fine during the build pass.
 *
 * Auto-migrates on boot (like the sqlite adapter) so `pnpm dev` just works. Unlike
 * a single-instance embedded database, real Postgres can have several replicas booting at once,
 * so the migration runs under a session-level **advisory lock**: exactly one boot
 * applies the pending migrations while the rest block, then find nothing to do.
 * Additive, generated migration files only — the same ones `pnpm db:migrate` runs.
 */
async function connectPostgres(
	config: PostgresAdapterOptions
): Promise<ResolvedDatabase<PostgresDrizzle, postgres.Sql>> {
	const { connectionString } = config;
	if (!connectionString) {
		throw new Error(
			'[postgresAdapter] `connectionString` is required to connect, but it is undefined.'
		);
	}
	const schema: Record<string, unknown> = { ...cmsTables, ...config.schema };

	if (!config.building && config.autoMigrate !== false) {
		// Dedicated single connection: `pg_advisory_lock` is session-scoped, so the
		// lock and the migration must run on the same connection. Released and closed
		// in `finally` so a mid-migration failure never leaks the lock.
		const migrationClient = postgres(connectionString, { max: 1 });
		try {
			await migrationClient.unsafe(`SELECT pg_advisory_lock(${MIGRATION_LOCK_KEY})`);
			await pgMigrate(drizzlePostgres(migrationClient), {
				migrationsFolder: resolve(config.migrationsFolder ?? 'drizzle')
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

	const sql = postgres(connectionString, {
		max: 50,
		idle_timeout: 20, // Release idle connections after 20s
		connect_timeout: 10, // Fail fast if can't connect in 10s
		max_lifetime: 60 * 5, // Recycle connections every 5 minutes
		connection: {
			// A `withOrgContext` transaction whose callback hangs on non-DB work never
			// commits/rolls back on its own — Postgres just holds the session as
			// `idle in transaction` forever, permanently pinning a pool connection (this has
			// happened in production). Forces Postgres to reclaim a stuck session instead.
			idle_in_transaction_session_timeout: 60_000
		}
	});
	const drizzleDb = drizzlePostgres(sql, { schema, logger: config.logger });
	const adapter = createPostgreSQLProvider({
		client: sql,
		multiTenancy: config.multiTenancy
	}).createAdapter();

	return { adapter, drizzleDb, client: sql, dialect: 'pg' };
}
