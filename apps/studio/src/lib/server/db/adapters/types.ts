import type { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import type { PGlite } from '@electric-sql/pglite';
import type { Client } from '@libsql/client';
import type postgres from 'postgres';
import type { Logger } from 'drizzle-orm';
import type { DatabaseAdapter } from '@aphexcms/cms-core/server';
import type * as cmsSchema from '../cms-schema';
import type * as authSchema from '../auth-schema';

// The Postgres relational schema is the canonical typing for the raw Drizzle
// handle. The auth provider and a few routes use the `.query` relational
// surface, which libsql and pglite share with postgres-js — the sqlite/pglite
// adapters cast their driver's instance to this at the boundary (see each adapter).
type Schema = typeof cmsSchema & typeof authSchema;
export type DrizzleDb = ReturnType<typeof drizzlePostgres<Schema>>;

/** Everything the studio app needs from a database driver, in one object. */
export interface DatabaseBundle {
	/** Raw driver client. Retained for lifecycle/debugging; no direct consumers today. */
	client: postgres.Sql | PGlite | Client;
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
	/** Optional Drizzle query logger (slow-query logging in studio). */
	logger?: Logger;
	multiTenancy?: { enableRLS?: boolean; enableHierarchy?: boolean };
}
