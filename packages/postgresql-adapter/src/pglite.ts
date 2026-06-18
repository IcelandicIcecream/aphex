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
		// pglite only creates the leaf data dir, not parents — ensure the full path exists.
		if (!this.config.client && this.config.dataDir) {
			mkdirSync(this.config.dataDir, { recursive: true });
		}
		const client = this.config.client ?? new PGlite(this.config.dataDir);
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
