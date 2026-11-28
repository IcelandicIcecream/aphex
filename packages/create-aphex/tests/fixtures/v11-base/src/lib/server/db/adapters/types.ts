import type { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import type { Client } from '@libsql/client';
import type postgres from 'postgres';
import type { Logger } from 'drizzle-orm';
import type { DatabaseAdapter } from '@aphexcms/cms-core/server';
import type * as cmsSchema from '../cms-schema';
import type * as authSchema from '../auth-schema';

// The Postgres relational schema is the canonical typing for the raw Drizzle
// handle. The auth provider and a few routes use the `.query` relational
// surface, which libsql shares with postgres-js — the sqlite adapter casts its
// driver's instance to this at the boundary (see the sqlite adapter).
type Schema = typeof cmsSchema & typeof authSchema;
export type DrizzleDb = ReturnType<typeof drizzlePostgres<Schema>>;

/** Everything the studio app needs from a database driver, in one object. */
export interface DatabaseBundle {
	/** Raw driver client. Retained for lifecycle/debugging; no direct consumers today. */
	client: postgres.Sql | Client;
	/** Raw Drizzle instance (relational `.query` surface) used by the auth provider + routes. */
	drizzleDb: DrizzleDb;
	/** The cms-core DatabaseAdapter handed to the engine and the auth provider. */
	db: DatabaseAdapter;
	/** Matches the auth provider's drizzle backend for the active driver. */
	dbDialect: 'pg' | 'sqlite';
}

/** Shared knobs every adapter accepts. */
export interface BaseAdapterConfig {
	/** SvelteKit build/analyse pass — skip migrations and touching real data dirs. */
	building: boolean;
	/**
	 * Run the driver's schema migration/push on boot. Defaults to `true` (matching
	 * the zero-config dev experience). Set `false` for production deployments that
	 * migrate as a separate deploy step (an init container / CI job before rollout) —
	 * the at-scale best practice, since a boot-migrate blocks every replica on the
	 * migration and can't gate the rollout on its success. Wired from
	 * `APHEX_DB_AUTO_MIGRATE`. When off, run `pnpm db:migrate` yourself.
	 */
	autoMigrate?: boolean;
	/** Optional Drizzle query logger (slow-query logging in studio). */
	logger?: Logger;
	multiTenancy?: { enableRLS?: boolean; enableHierarchy?: boolean };
}
