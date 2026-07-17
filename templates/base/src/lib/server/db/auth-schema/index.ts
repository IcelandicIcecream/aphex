// Better Auth tables, split by dialect. The Postgres schema is the default
// (matches the default driver + drizzle-kit migrations), so `./auth-schema`
// resolves to it. Import `./auth-schema/sqlite` explicitly for the libsql tree.
export * from './pg';
