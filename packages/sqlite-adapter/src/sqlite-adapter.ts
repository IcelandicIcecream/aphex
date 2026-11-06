import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { drizzle as drizzleLibsql, type LibSQLDatabase } from 'drizzle-orm/libsql';
import type { Logger } from 'drizzle-orm';
import { createClient, type Client } from '@libsql/client';
import type { DatabaseDescriptor, ResolvedDatabase } from '@aphexcms/cms-core/server';
import { createSQLiteProvider, applyRecommendedPragmas } from './index';
import * as cmsTables from './schema';

// HMR can evaluate this module concurrently; global state survives module replacement.
// The write transaction below provides the equivalent lock across separate processes.
const migrationLocks = ((
	globalThis as typeof globalThis & {
		__aphexSQLiteMigrationLocks?: Map<string, Promise<void>>;
	}
).__aphexSQLiteMigrationLocks ??= new Map());

async function withMigrationLock<T>(url: string, migrate: () => Promise<T>): Promise<T> {
	const previous = migrationLocks.get(url) ?? Promise.resolve();
	let release!: () => void;
	const current = new Promise<void>((resolve) => (release = resolve));
	const queued = previous.then(() => current);
	migrationLocks.set(url, queued);

	await previous;
	try {
		return await migrate();
	} finally {
		release();
		if (migrationLocks.get(url) === queued) migrationLocks.delete(url);
	}
}

export interface SqliteAdapterOptions {
	/**
	 * libsql URL, e.g. `file:.aphex/app.db` or `libsql://…` (Turso). May be undefined
	 * while the config is evaluated, as an env var is during a build; it is only
	 * required when the database actually connects.
	 */
	url: string | undefined;
	/** Auth token for remote libsql (Turso); ignored for local files. */
	authToken?: string;
	/**
	 * Tables to manage alongside the CMS's own, such as the auth tables from
	 * `@aphexcms/auth/schema/sqlite`. They are pushed on boot and available on `drizzleDb`.
	 */
	schema?: Record<string, unknown>;
	/** SvelteKit's build pass: skip pragmas and migrations. */
	building?: boolean;
	/**
	 * Push the schema on boot. Defaults to `true`. This uses `drizzle-kit`, so install
	 * it, or set this to `false` in a pruned production image and run `aphex migrate`.
	 */
	autoMigrate?: boolean;
	/** Drizzle query logger. */
	logger?: Logger;
	multiTenancy?: { enableHierarchy?: boolean };
}

type SqliteDrizzle = LibSQLDatabase<Record<string, unknown>>;

/**
 * Declare a SQLite database inline in `aphex.config.ts`. Nothing is opened until core
 * connects it on the first request.
 */
export function sqliteAdapter(
	options: SqliteAdapterOptions
): DatabaseDescriptor<SqliteDrizzle, Client> {
	return {
		kind: 'aphex/database',
		key: `sqlite:${options.url}`,
		connect: () => connectSqlite(options)
	};
}

async function connectSqlite(
	config: SqliteAdapterOptions
): Promise<ResolvedDatabase<SqliteDrizzle, Client>> {
	const { url } = config;
	if (!url) {
		throw new Error('[sqliteAdapter] `url` is required to connect, but it is undefined.');
	}
	const schema: Record<string, unknown> = { ...cmsTables, ...config.schema };

	if (url.startsWith('file:') && !url.startsWith('file::memory:')) {
		mkdirSync(dirname(resolve(url.slice('file:'.length))), { recursive: true });
	}

	const libsql = createClient({ url, authToken: config.authToken });

	if (!config.building) {
		// WAL, synchronous=NORMAL, busy_timeout — skips in-memory targets itself.
		await applyRecommendedPragmas(libsql, url);
		// Push the schema unless auto-migrate is disabled (then sync it as a separate step).
		if (config.autoMigrate !== false) {
			await withMigrationLock(url, async () => {
				const migration = await libsql.transaction('write');

				try {
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
							await migration.execute(
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
						const wanted = full.filter((sql) => {
							const createdTable = sql.match(/^CREATE TABLE\s+[\`"']?([^\`"'\s(]+)/i)?.[1];
							return createdTable ? missing.includes(createdTable) : false;
						});
						for (const sql of wanted) {
							await migration.execute(sql);
						}
					}
					const { statementsToExecute } = await pushSQLiteSchema(
						schema,
						drizzleLibsql(migration as never) as never
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
						await migration.execute(sql);
					}
					await migration.commit();
				} catch (error) {
					await migration.rollback();
					throw error;
				}
			});
		}
	}

	const drizzleDb = drizzleLibsql(libsql, { schema, logger: config.logger });
	const adapter = createSQLiteProvider({
		client: libsql,
		multiTenancy: config.multiTenancy
	}).createAdapter();

	return { adapter, drizzleDb, client: libsql, dialect: 'sqlite' };
}
