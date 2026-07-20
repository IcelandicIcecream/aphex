// Better Auth tables, split by dialect. The app's static typing is Postgres-
// canonical (`DrizzleDb` is a postgres-js instance; PGlite/Postgres are both the
// 'pg' dialect), and the SQLite adapter casts its libsql instance to that type at
// the boundary — runtime SQL is driven by the db instance, not the table objects.
// So the barrel resolves to `./pg`; import `./auth-schema/sqlite` explicitly for
// the libsql schema push (see the sqlite adapter).
export * from './pg';
