# @aphexcms/postgresql-adapter

PostgreSQL database adapter for [AphexCMS](https://github.com/IcelandicIcecream/aphex), built on [Drizzle ORM](https://orm.drizzle.team).

Implements the full `DatabaseAdapter` contract from `@aphexcms/cms-core`. Ships two drivers behind one interface: a `postgres-js` client for a real server, and an embedded [PGlite](https://pglite.dev) for running Postgres semantics with no Docker and no server process.

📚 **Documentation: [docs.getaphex.com/database](https://docs.getaphex.com/database)**

## Install

```bash
pnpm add @aphexcms/postgresql-adapter
pnpm add @electric-sql/pglite   # only for the embedded driver
```

## Quick start

```ts
import { createPostgreSQLProvider } from '@aphexcms/postgresql-adapter';

const db = createPostgreSQLProvider({
	connectionString: process.env.DATABASE_URL
}).createAdapter();
```

Then hand it to `createCMSConfig()`:

```ts
import { createCMSConfig } from '@aphexcms/cms-core/server';

export default createCMSConfig({
	schemaTypes,
	database: db
	// …
});
```

## Embedded Postgres (PGlite)

Same adapter, same SQL, no server — persisted to a local folder. Useful when you want to develop against Postgres behaviour (row-level security in particular) without running one:

```ts
import { createPgliteProvider } from '@aphexcms/postgresql-adapter/pglite';

const db = createPgliteProvider({ dataDir: '.aphex/pgdata' }).createAdapter();
```

PGlite is a **single-writer** embedded database: a second process opening the same data directory blocks on the lock rather than failing. One process per data directory.

## Migrations

Unlike the SQLite adapter, this one does not push its schema at boot — the migration history in `drizzle/` is the source of truth:

```bash
aphex migrate
```

In production with multiple replicas, run migrations as a separate deploy step (an init container or a CI job before rollout) and set `APHEX_DB_AUTO_MIGRATE=false`.

## Exports

| Import                                | Contents                                            |
| ------------------------------------- | --------------------------------------------------- |
| `@aphexcms/postgresql-adapter`        | `createPostgreSQLProvider`, `PostgreSQLAdapter`     |
| `@aphexcms/postgresql-adapter/pglite` | `createPgliteProvider`, `createPgliteClient`        |
| `@aphexcms/postgresql-adapter/schema` | The Drizzle schema (`cms_documents`, `cms_jobs`, …) |

## Note on development

This package is consumed from `dist`, not from source — so a change here needs a rebuild and a dev-server restart before the studio sees it. `cms-core` is the exception to that rule, not the norm.

## License

MIT
