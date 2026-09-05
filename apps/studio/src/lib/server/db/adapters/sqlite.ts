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
			// Create genuinely-new tables first, before push gets to diff.
			//
			// `pushSQLiteSchema` hardcodes drizzle-kit's *interactive* tablesResolver
			// and exposes no way to override it. When a diff contains both a created
			// table and dropped tables, drizzle runs rename-detection and asks
			// "Is X created or renamed from another table?" on stdin — which hangs
			// boot, and whose wrong answer renames a table rather than creating one.
			//
			// The dropped side is always the FTS5 index (`cms_documents_fts` and its
			// shadow tables): raw DDL this adapter self-provisions, so Drizzle has
			// never known about it and always wants it gone. That made *any* new
			// table a trigger — the prompt offered to rename the search index into it.
			//
			// So the created side is removed here instead. `generateSQLiteMigration`
			// is the non-interactive generator: diffing an empty snapshot against the
			// schema yields the full DDL, and we run only the parts naming tables the
			// database doesn't have yet. Push then sees no creations, asks nothing,
			// and still handles column-level changes.
			const { pushSQLiteSchema, generateSQLiteDrizzleJson, generateSQLiteMigration } =
				await import('drizzle-kit/api');

			const existing = new Set(
				(
					await libsql.execute(
						"select name from sqlite_master where type in ('table','view') and name not like 'sqlite_%'"
					)
				).rows.map((row) => String(row.name))
			);

			const missing = Object.values(schema)
				.map((table) => {
					// Drizzle tables carry their SQL name on a well-known symbol.
					const nameSymbol = Object.getOwnPropertySymbols(table ?? {}).find(
						(symbol) => symbol.description === 'drizzle:Name'
					);
					return nameSymbol ? String((table as Record<symbol, unknown>)[nameSymbol]) : null;
				})
				.filter((name): name is string => !!name && !existing.has(name));

			if (missing.length > 0) {
				const full = await generateSQLiteMigration(
					await generateSQLiteDrizzleJson({}),
					await generateSQLiteDrizzleJson(schema)
				);
				// Quoted or bare, CREATE TABLE and CREATE INDEX both name the table.
				const wanted = full.filter((sql) =>
					missing.some((name) => new RegExp(`[\`"']?${name}[\`"']?`).test(sql))
				);
				for (const sql of wanted) {
					await libsql.execute(sql);
				}
			}

			const { statementsToExecute } = await pushSQLiteSchema(
				schema,
				drizzleLibsql(libsql) as never
			);
			// The full-text search index (cms_documents_fts + its FTS5 shadow tables)
			// is raw DDL the sqlite adapter self-provisions at startup — invisible to
			// Drizzle's schema object, so push sees it as unrecognized and generates
			// DROP TABLE statements for it on every boot. Filter those out and apply
			// the rest ourselves instead of calling the returned `apply()` wholesale
			// (which has no filtering option), or the search index gets silently wiped
			// back to empty on every restart.
			const statements = statementsToExecute.filter(
				(sql) => !sql.toLowerCase().includes('cms_documents_fts')
			);
			for (const sql of statements) {
				await libsql.execute(sql);
			}
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
