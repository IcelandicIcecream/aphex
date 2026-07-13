import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { createSQLiteProvider, applyRecommendedPragmas } from '@aphexcms/sqlite-adapter';
import * as sqliteCmsSchema from '@aphexcms/sqlite-adapter/schema';
import * as sqliteAuthSchema from '../auth-schema/sqlite';
import type { BaseAdapterConfig, DatabaseBundle, DrizzleDb } from './types';

const schema = { ...sqliteCmsSchema, ...sqliteAuthSchema };

export interface SqliteAdapterConfig extends BaseAdapterConfig {
	/** libsql URL, e.g. `file:.aphex/studio.db` or `libsql://…` (remote). */
	url: string;
	/** Auth token for remote libsql (Turso); ignored for local files. */
	authToken?: string;
}

/**
 * libsql file database (experimental in studio; the blog template's default).
 * Schema is pushed on boot via drizzle-kit — no migration files. `drizzle-kit`
 * is a devDependency, so this path targets dev, not a pruned production image.
 */
export async function sqliteAdapter(config: SqliteAdapterConfig): Promise<DatabaseBundle> {
	const { url } = config;
	if (url.startsWith('file:') && !url.startsWith('file::memory:')) {
		mkdirSync(dirname(resolve(url.slice('file:'.length))), { recursive: true });
	}

	const libsql = createClient({ url, authToken: config.authToken });

	if (!config.building) {
		// WAL, synchronous=NORMAL, busy_timeout — skips in-memory targets itself.
		await applyRecommendedPragmas(libsql, url);
		// Push the schema unless auto-migrate is disabled (then sync it as a separate step).
		if (config.autoMigrate !== false) {
			const { pushSQLiteSchema } = await import('drizzle-kit/api');
			const { apply } = await pushSQLiteSchema(schema, drizzleLibsql(libsql) as never);
			await apply();
		}
	}

	// libsql and postgres-js Drizzle share the relational `.query` surface; cast at this driver boundary.
	const drizzleDb = drizzleLibsql(libsql, {
		schema,
		logger: config.logger
	}) as unknown as DrizzleDb;
	const db = createSQLiteProvider({
		client: libsql,
		multiTenancy: config.multiTenancy
	}).createAdapter();

	return { client: libsql, drizzleDb, db, dbDialect: 'sqlite' };
}
