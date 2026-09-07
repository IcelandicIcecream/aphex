# Studio test suite

Integration tests for the whole stack. Studio is the reference app, so it's the
only place where `cms-core`, a real database adapter, a real storage adapter and
the auth provider are wired together — which makes it the only place most of this
behaviour can be tested end to end.

This file covers the parts of the setup that are surprising. It deliberately does
**not** list the test files; `ls tests/*.test.ts` is always right, and the version
of this document that listed them named four out of forty-five.

## Running them

```bash
pnpm -F @aphexcms/studio test          # everything
pnpm -F @aphexcms/studio test:watch    # watch mode
pnpm -F @aphexcms/studio test <name>   # one file, by substring

pnpm -F @aphexcms/studio test:local    # Local API only
pnpm -F @aphexcms/studio test:http     # HTTP API only
pnpm -F @aphexcms/studio test:graphql  # GraphQL only
```

## Pick the database with `APHEX_DATABASE`

The suite runs against whichever driver is configured, and the point of having
three is that they're interchangeable:

```bash
APHEX_DATABASE=sqlite pnpm -F @aphexcms/studio test   # no Docker, no server, no .env
APHEX_DATABASE=pglite pnpm -F @aphexcms/studio test   # embedded Postgres, no Docker
pnpm -F @aphexcms/studio test                          # postgres-js — needs DATABASE_URL
```

Only the `postgres-js` path needs a connection string, and `tests/setup.ts` only
enforces one on that path. Anything Postgres-specific — row-level security, most
obviously — will not be exercised by the SQLite run.

Cross-dialect adapter conformance lives elsewhere, in
`packages/sqlite-adapter/tests/conformance.spec.ts`, which runs the same suite
against pglite and libsql.

## Every fork gets its own database

Vitest runs each test file in a separate fork, and both embedded drivers are
single-writer. Left alone, PGlite forks block on the data-directory lock _forever_
rather than failing — the run looks slow when it's actually deadlocked — and libsql
forks produce a storm of `SQLITE_BUSY`. So `tests/setup.ts` gives each fork its own
path keyed on `VITEST_POOL_ID`, and `tests/teardown.ts` removes them.

Two consequences worth knowing before you debug something strange:

- **A test can't see data another test file created.** Seed what you need.
- **`$env/dynamic/private` had to be made genuinely dynamic.** SvelteKit bakes those
  values in when the Vite config resolves, in the main process, before any worker
  exists — so a per-fork `process.env` assignment was invisible to the app code
  reading it, and every fork opened the _same_ PGlite dir. The `liveDynamicEnv`
  plugin in `vitest.config.ts` replaces the virtual module with a proxy over the
  live `process.env`.

`maxWorkers` is capped at 4 (override with `APHEX_TEST_MAX_FORKS`). Unbounded,
Vitest sizes the pool to the core count and a 16-core machine starts sixteen
in-process Postgres instances, which gets the run OOM-killed with exit 137 rather
than a failing test.

## `api-key-rbac` is excluded by default

It needs two things the default run can't provide: a dev server on `:5173`, and
the _shared_ database that server opened rather than the per-fork copy. It mints
API keys with drizzle directly and expects the running server to see them.

```bash
pnpm -F @aphexcms/studio test:rbac
```

Leaving it in the default glob only ever produced a permanent red line.

## Assert on causes, not on clocks

`cache-benchmark.test.ts` is the worked example. It reports latency, but it
_asserts_ on query counts — a cache that works issues fewer database queries,
deterministically, whereas wall-clock timing is a property of the machine. On a
shared CI runner a descheduled process makes a working cache look slower than the
database, and the failure lands on whichever PR was unlucky rather than on the
change that broke something.

## Logging

The logger defaults to `debug` outside production and the write path is chatty —
`field-validation` alone logs eleven times per field, per document. `setup.ts`
pins it to `warn`; raise it for one run when you need the trace:

```bash
APHEX_TEST_LOG_LEVEL=debug pnpm -F @aphexcms/studio test <name>
```

## Layout

| Path                     | What's in it                                                     |
| ------------------------ | ---------------------------------------------------------------- |
| `fixtures/config.ts`     | The CMS config the tests build their Local API from              |
| `fixtures/schema-types/` | Schema types that exist only for tests (access-control cases, …) |
| `helpers/`               | Seeding, shared constants (`TEST_ORG_ID`), drizzle schema access |
| `setup.ts`               | Per-fork env: driver, database path, log level                   |
| `teardown.ts`            | Removes the per-fork databases                                   |

A new schema type used by a test belongs in `fixtures/schema-types/` and must be
registered in that directory's `index.ts` — the config builds its collections from
that barrel, so an unregistered type simply isn't there at runtime.
