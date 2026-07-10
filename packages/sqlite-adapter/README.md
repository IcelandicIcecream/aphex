# @aphexcms/sqlite-adapter

SQLite database adapter for [AphexCMS](https://github.com/IcelandicIcecream/aphex), built on [libsql](https://github.com/tursodatabase/libsql).

Implements the full `DatabaseAdapter` contract from `@aphexcms/cms-core`, so it is a drop-in alternative to `@aphexcms/postgresql-adapter`. Works against a local `file:` database (no Docker, no server) or a Turso-hosted `libsql://` URL.

## Install

```bash
pnpm add @aphexcms/sqlite-adapter @libsql/client
```

## Quick start

Let the adapter create and own the client:

```ts
import { createSQLiteProvider } from '@aphexcms/sqlite-adapter';

// Local file
const db = createSQLiteProvider({ url: 'file:.aphex/site.db' }).createAdapter();

// Turso
const db = createSQLiteProvider({
	url: 'libsql://mydb-me.turso.io',
	authToken: process.env.DATABASE_AUTH_TOKEN
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

### Bringing your own client

Apps usually share one libsql client between the adapter, Drizzle, and the auth provider. Pass it in — **the adapter never modifies a client it didn't create**, so apply pragmas yourself:

```ts
import { createClient } from '@libsql/client';
import { createSQLiteProvider, applyRecommendedPragmas } from '@aphexcms/sqlite-adapter';

const client = createClient({ url: 'file:.aphex/site.db' });
await applyRecommendedPragmas(client, 'file:.aphex/site.db');

const db = createSQLiteProvider({ client }).createAdapter();
```

## Pragmas

When the adapter creates the client from `url`, it applies a recommended set to local `file:` databases:

| Pragma         | Value    | Why                                                       |
| -------------- | -------- | --------------------------------------------------------- |
| `journal_mode` | `WAL`    | Reads proceed while a write is in flight                  |
| `synchronous`  | `NORMAL` | The safe pairing for WAL                                  |
| `busy_timeout` | `5000`   | Waits instead of throwing `SQLITE_BUSY` under concurrency |

In-memory and Turso URLs are skipped — Turso manages its own journaling.

```ts
// Default: recommended set
createSQLiteProvider({ url });

// Opt out entirely
createSQLiteProvider({ url, pragmas: false });

// Recommended set plus tuning (see SQLitePragmaOptions)
createSQLiteProvider({
	url,
	pragmas: { cacheSize: -65536 } // 64 MiB page cache (negative = KiB)
});

// Raw statements, run verbatim
createSQLiteProvider({ url, pragmas: 'PRAGMA busy_timeout=10000;' });
```

Pragmas apply to the client's main connection. libsql opens a fresh connection per interactive transaction, which gets SQLite defaults.

## Multi-tenancy

SQLite has **no Row-Level Security**. Organization isolation comes from the explicit `organizationId` WHERE clause every query applies — the same mechanism that actually isolates tenants on pooled Postgres, where the connection is the table owner and bypasses RLS anyway.

```ts
createSQLiteProvider({ url, multiTenancy: { enableHierarchy: true } });
```

`enableHierarchy` works as on Postgres. There is no `enableRLS` option.

## Migrations

Point `drizzle.config.ts` at `dialect: 'sqlite'` and re-export the CMS tables from `@aphexcms/sqlite-adapter/schema` instead of the Postgres adapter.

The `aphex migrate` CLI detects SQLite from `APHEX_DATABASE=sqlite`, or from a `DATABASE_URL` starting with `file:` / `libsql:`. Remote databases use `DATABASE_AUTH_TOKEN`.

## Behavioral parity

Both adapters run the same cross-dialect conformance suite (`tests/conformance.spec.ts`) against an in-memory libsql and an in-memory PGlite, so filters, sorting, versioning, references, and org isolation behave identically.

Two documented differences:

- **`contains` uses SQLite's `LIKE`**, which is case-insensitive for ASCII only. Postgres `ILIKE` handles full Unicode.
- **Document JSON filters and sorts compile to `json_extract`** (Postgres uses `->>`). Both are per-row extraction expressions.

### Query performance

Content stored in `draftData` / `publishedData` is JSON. Filtering or sorting by a field _inside_ that JSON — anything that isn't a real column like `type` or `status` — compiles to `json_extract(...)` with no index behind it, so it scans within the `(organization_id, type)` partition. This is true of the PostgreSQL adapter too. If you filter a field often, promote it to a real column or add an expression index.

## Exports

| Path                              | Contents                                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `@aphexcms/sqlite-adapter`        | `createSQLiteProvider`, `applyRecommendedPragmas`, `SQLiteAdapter`, types                          |
| `@aphexcms/sqlite-adapter/schema` | Drizzle table definitions (`documents`, `assets`, `organizations`, …) and the combined `cmsSchema` |

## License

MIT
