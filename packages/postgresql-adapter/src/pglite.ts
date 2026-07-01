// pglite provider — runs the CMS on an embedded Postgres (pglite, Postgres-in-WASM) for
// zero-infra dev and single-container self-hosting. pglite IS Postgres, so this reuses the
// entire PostgreSQLAdapter (schema, RLS policies, queries, the SET LOCAL transaction context).
//
// The one pglite-specific concern: pglite connects as the `postgres` superuser, and superusers
// BYPASS row-level security. So we create a non-superuser role and SET ROLE to it on the (single,
// serialized) connection — then the org-isolation policies actually apply. Migrations run before
// this (as superuser) via `aphex migrate`.
import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import type { DatabaseAdapter, DatabaseProvider } from '@aphexcms/cms-core/server';
import { PostgreSQLAdapter } from './index';
import { cmsSchema } from './schema';

declare global {
	// Kept on globalThis so they survive Vite HMR module re-execution.
	// eslint-disable-next-line no-var
	var __aphexPgliteClients: Map<string, PGlite> | undefined;
	// eslint-disable-next-line no-var
	var __aphexPgliteShutdownHooked: boolean | undefined;
}

/**
 * Create (or reuse) a PGlite client safely.
 *
 * PGlite is single-connection: a second `new PGlite()` on the same data dir
 * corrupts it. Two things routinely open a second instance — Vite HMR
 * re-executing the DB module during dev, and an abrupt process exit leaving the
 * data dir mid-write (PGlite lacks Postgres's WAL crash recovery). This guards
 * both: one instance per data dir per process (cached on globalThis so it
 * survives HMR), plus a shutdown hook that closes PGlite cleanly.
 *
 * Prefer this over `new PGlite(dataDir)` anywhere a persistent client is created.
 */
export function createPgliteClient(dataDir?: string): PGlite {
	if (dataDir) mkdirSync(dataDir, { recursive: true }); // pglite doesn't create parent dirs
	const key = dataDir ?? '__memory__';
	const clients = (globalThis.__aphexPgliteClients ??= new Map<string, PGlite>());
	let client = clients.get(key);
	if (!client) {
		client = new PGlite(dataDir);
		clients.set(key, client);
	}
	registerPgliteShutdown();
	return client;
}

/**
 * Close every managed PGlite client cleanly on process shutdown. Registered once
 * per process. Best-effort on signals (other SIGINT/SIGTERM handlers may run
 * too), but it flushes on the normal Ctrl-C / container-stop / natural-exit path,
 * which is where the data dir would otherwise be left mid-write.
 */
function registerPgliteShutdown(): void {
	if (globalThis.__aphexPgliteShutdownHooked) return;
	globalThis.__aphexPgliteShutdownHooked = true;

	const closeAll = async (): Promise<void> => {
		const clients = globalThis.__aphexPgliteClients;
		if (!clients) return;
		for (const client of clients.values()) {
			try {
				await client.close();
			} catch {
				// already closing / closed — nothing to do
			}
		}
	};

	process.once('beforeExit', () => void closeAll());
	for (const signal of ['SIGINT', 'SIGTERM'] as const) {
		process.once(signal, () => {
			void closeAll().finally(() => process.exit(0));
		});
	}
}

export interface PgliteConfig {
	/** An existing PGlite client. If omitted, one is created from `dataDir` (file-backed) or in-memory. */
	client?: PGlite;
	/** Filesystem directory for persistence, e.g. `'.aphex/pgdata'`. Omit (and no `client`) for in-memory. */
	dataDir?: string;
	/**
	 * Non-superuser role queries run as, so RLS policies apply (pglite's default role is a
	 * superuser, which bypasses RLS). Created and granted on init. Default `'aphex_app'`.
	 */
	role?: string;
	multiTenancy?: {
		enableRLS?: boolean;
		enableHierarchy?: boolean;
	};
}

class PglineProvider implements DatabaseProvider {
	name = 'pglite';
	private config: PgliteConfig;

	constructor(config: PgliteConfig) {
		this.config = config;
	}

	createAdapter(): DatabaseAdapter {
		// Reuse a caller-supplied client, else create a guarded singleton (handles
		// mkdir, HMR-safe reuse, and graceful shutdown).
		const client = this.config.client ?? createPgliteClient(this.config.dataDir);
		// drizzle/pglite and drizzle/postgres-js produce structurally identical query APIs
		// (both PgDatabase); the adapter only uses that shared surface.
		const db = drizzle({ client, schema: cmsSchema }) as unknown as ReturnType<
			typeof import('drizzle-orm/postgres-js').drizzle
		>;

		const enableRLS = this.config.multiTenancy?.enableRLS ?? true;
		if (enableRLS) {
			// Sanitize the role name (it's interpolated into DDL) and apply the RLS-role setup.
			// Queued on the single serialized connection, so it runs before any adapter query.
			const role = (this.config.role ?? 'aphex_app').replace(/[^a-zA-Z0-9_]/g, '');
			client
				.exec(
					`DO $$ BEGIN
						IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${role}') THEN
							CREATE ROLE "${role}" NOLOGIN;
						END IF;
					END $$;
					GRANT USAGE ON SCHEMA public TO "${role}";
					GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${role}";
					SET ROLE "${role}";`
				)
				.catch((err: unknown) => {
					console.error(
						'[pglite] failed to set up the RLS role — tenant isolation may not apply:',
						err
					);
				});
		}

		return new PostgreSQLAdapter({
			db,
			tables: cmsSchema,
			multiTenancy: this.config.multiTenancy,
			// pglite has a single connection — withOrgContext must run work on the tx handle,
			// not the main db (which would deadlock). See PostgreSQLAdapter.runOrgContextSingle.
			singleConnection: true
		});
	}
}

/**
 * Create a pglite-backed database provider.
 *
 * @example
 * // zero-infra dev / single-container self-host
 * const provider = createPgliteProvider({ dataDir: '.aphex/pgdata' });
 * const db = provider.createAdapter();
 */
export function createPgliteProvider(config: PgliteConfig = {}): DatabaseProvider {
	return new PglineProvider(config);
}
