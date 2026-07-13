import { resolve } from 'node:path';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as pgliteMigrate } from 'drizzle-orm/pglite/migrator';
import { createPgliteProvider, createPgliteClient } from '@aphexcms/postgresql-adapter/pglite';
import * as cmsSchema from '../cms-schema';
import * as authSchema from '../auth-schema';
import type { BaseAdapterConfig, DatabaseBundle, DrizzleDb } from './types';

const schema = { ...cmsSchema, ...authSchema };

export interface PgliteAdapterConfig extends BaseAdapterConfig {
	/** On-disk data dir; `undefined` uses an ephemeral in-memory instance (build pass). */
	dataDir?: string;
}

/**
 * Embedded Postgres (PGlite) — zero-infra dev / single-container. Auto-migrates
 * on boot: PGlite is single-instance so there's no concurrent-migration race
 * (unlike Postgres), making `APHEX_DATABASE=pglite pnpm dev` just work.
 */
export async function pgliteAdapter(config: PgliteAdapterConfig): Promise<DatabaseBundle> {
	// Guarded client: HMR-safe singleton + graceful-shutdown hook (see the adapter).
	const pglite = createPgliteClient(config.dataDir);

	// Runs as the default superuser, before the provider's SET ROLE. Skipped
	// during the build pass (no real data dir to migrate) and when auto-migrate
	// is disabled (migrate as a separate deploy step).
	if (!config.building && config.autoMigrate !== false) {
		await pgliteMigrate(drizzlePglite({ client: pglite }), {
			migrationsFolder: resolve('drizzle')
		});
	}

	// pglite and postgres-js Drizzle expose the same query surface; cast at this driver boundary.
	const drizzleDb = drizzlePglite({
		client: pglite,
		schema,
		logger: config.logger
	}) as unknown as DrizzleDb;
	// createAdapter queues CREATE ROLE/GRANT/SET ROLE (after migration, before the first query).
	const db = createPgliteProvider({
		client: pglite,
		multiTenancy: config.multiTenancy
	}).createAdapter();

	return { client: pglite, drizzleDb, db, dbDialect: 'pg' };
}
