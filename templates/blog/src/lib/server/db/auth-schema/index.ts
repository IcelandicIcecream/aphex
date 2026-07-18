// Better Auth tables, split by dialect. Postgres is the canonical typing
// source for the raw Drizzle handle (see adapters/types.ts), so `./auth-schema`
// resolves to it. Import `./auth-schema/sqlite` explicitly for the libsql tree.
export * from './pg';
