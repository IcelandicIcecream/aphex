import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createPostgreSQLProvider } from '@aphexcms/postgresql-adapter';
import * as cmsSchema from '../cms-schema';
import * as authSchema from '../auth-schema';
import type { BaseAdapterConfig, DatabaseBundle } from './types';

const schema = { ...cmsSchema, ...authSchema };

export interface PostgresAdapterConfig extends BaseAdapterConfig {
	/** postgres-js connection string (a placeholder is fine during `building`). */
	connectionString: string;
}

/**
 * Standard Postgres driver (postgres-js against DATABASE_URL / PG_*). Connects
 * lazily on first query, so a placeholder URL is fine during the build pass.
 */
export async function postgresAdapter(config: PostgresAdapterConfig): Promise<DatabaseBundle> {
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
