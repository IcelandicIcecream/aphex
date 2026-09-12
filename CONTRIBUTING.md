# Contributing to Aphex

Bug fixes, field types, database and storage adapters, UI work and docs are all welcome.

**The full guide lives at [docs.getaphex.com/contributing](https://docs.getaphex.com/contributing)** —
repository layout, the hot-reload table, releases, and the studio → template → scaffolder
sync chain. This file is the short version: enough to get a first PR open.

## Get it running

Node 22+ and pnpm 10 (`corepack enable` gets the pinned version).

```bash
git clone git@github.com:IcelandicIcecream/aphex.git
cd aphex
pnpm install

cp apps/studio/.env.example apps/studio/.env
echo 'APHEX_DATABASE=sqlite' >> apps/studio/.env

pnpm dev
```

Admin UI at `http://localhost:5173/admin`. The first account to sign up becomes super
admin. SQLite pushes its schema at boot, so there is nothing to start and nothing to
migrate — no Docker needed on this path.

For Postgres instead (required if you're touching row-level security, which is
Postgres-only):

```bash
pnpm db:start     # Postgres + Mailpit via Docker
pnpm db:migrate
pnpm dev
```

## Before you open a PR

```bash
pnpm lint         # Prettier + ESLint
pnpm check        # type-check every package
pnpm build
```

And the tests for whatever you touched:

```bash
pnpm -F @aphexcms/studio test           # Local API, HTTP, GraphQL, access, versioning
pnpm -F @aphexcms/sqlite-adapter test   # cross-dialect conformance (pglite + libsql)
pnpm -F @aphexcms/cms-core test
```

The conformance suite is the one worth knowing about: it runs the same assertions
against both dialects, so it's what catches a change that is only correct on one of
them. If you touch an adapter, run it.

## Conventions

- **Conventional Commits** — `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`.
- One feature or fix per PR. Aim for under 500 lines of diff.
- **Svelte 5 runes** (`$state`, `$derived`, `$effect`), never the Svelte 4 `$:` form.
- `kebab-case.ts`, `PascalCase.svelte`, `camelCase` values, `PascalCase` types.
- Prefer fixing a type at its source over an `as` cast or a `!` assertion.

## Changesets

If your PR touches a **published** package (anything in `packages/` or `plugins/` not
marked `private`), add one:

```bash
pnpm changeset
```

Pick the packages, the bump type, write a one-liner, and commit the generated
`.changeset/*.md` alongside your code. Skip it for docs-only or studio-only changes.

One non-obvious case: a **template-only** fix still needs a `create-aphex` changeset to
reach users, because the scaffolder downloads the template at a tag named after its own
version. Without a bump, the tag never moves and `pnpm create aphex` keeps handing out
the previous snapshot. [The
details](https://docs.getaphex.com/contributing#how-a-template-change-reaches-pnpm-create-aphex).

## Where things go

| Adding             | Where                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------- |
| A field type       | `packages/cms-core/src/lib/types/schemas.ts` + an editor under `components/admin/fields/` |
| A database adapter | A new package implementing `DatabaseAdapter`                                              |
| A storage adapter  | A new package implementing `StorageAdapter`                                               |
| An email adapter   | A new package implementing `EmailAdapter`                                                 |
| A custom route     | The `api(app)` hook in `aphex.config.ts`                                                  |

`apps/studio` is the working reference — features land there first, then flow to
`templates/base` via `./scripts/sync-template.sh`.

## Questions

Open a [discussion](https://github.com/IcelandicIcecream/aphex/discussions) or an
[issue](https://github.com/IcelandicIcecream/aphex/issues). For anything
security-related, see [SECURITY.md](./SECURITY.md) instead — please don't file a public
issue.

Aphex is maintained part-time, so reviews come in bursts rather than promptly. A PR
sitting for a week or two hasn't been rejected. Two things make one easy to merge on a
quiet evening: keep it small, and write the "how to verify" section so a reviewer doesn't
have to reconstruct your setup to see it working.
