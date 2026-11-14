// The database the suite runs against: the one the app's config declares, resolved
// the same way the request hook resolves it.
import type { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { getAphex } from '@aphexcms/cms-core/server';
import cmsConfig from '../../aphex.config';
import type * as cmsSchema from '../../src/lib/server/db/cms-schema';
import type * as authSchema from '../../src/lib/server/db/auth-schema';

// The Postgres relational schema is the canonical typing for the raw Drizzle handle;
// libsql and pglite share its `.query` surface, so they are cast to it here.
type Schema = typeof cmsSchema & typeof authSchema;
type DrizzleDb = ReturnType<typeof drizzlePostgres<Schema>>;

const { database, config } = await getAphex(cmsConfig);
if (!database) throw new Error('aphex.config.ts should declare its database with a descriptor');

export const db = database.adapter;
export const client = database.client;
export const dbDialect = database.dialect;
export const drizzleDb = database.drizzleDb as unknown as DrizzleDb;
export const authProvider = config.auth?.provider;
