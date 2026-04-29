# Contributing to AphexCMS

Thanks for considering a contribution. This guide covers the dev loop, code standards, and how to add features without breaking the database-agnostic core.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Code Standards](#code-standards)
4. [Project Structure](#project-structure)
5. [Adding Features](#adding-features)
6. [Testing](#testing)
7. [Pull Request Process](#pull-request-process)
8. [Releases & Publishing](#releases--publishing)
9. [Template & Docs Sync](#template--docs-sync)
10. [Reporting Issues](#reporting-issues)

---

## Getting Started

### Prerequisites

- **Node.js 20+** (use `nvm` for version management)
- **pnpm 10+** (required for the monorepo's workspace protocol)
- **Docker** + Docker Compose (for PostgreSQL and Mailpit)
- **Git** with SSH keys configured for GitHub

### Initial setup

```bash
# Fork the repo on GitHub, then clone your fork
git clone git@github.com:YOUR_USERNAME/aphex.git
cd aphex
git remote add upstream git@github.com:IcelandicIcecream/aphex.git

# Install dependencies
pnpm install

# Configure environment
cd apps/studio
cp .env.example .env
cd ../..

# Start Postgres + Mailpit (and pgvector init)
pnpm db:start

# Push the schema to the database (dev)
pnpm db:push

# Start the dev server (studio + cms-core via Turborepo)
pnpm dev
```

Admin UI is at `http://localhost:5173/admin`. Mailpit's web UI is at `http://localhost:8025`.

### Creating your first account

The very first user to sign up is auto-assigned the `super_admin` instance role and gets a default organization seeded as `owner`. Create your account at `/login` and you're set up.

---

## Development Workflow

### Daily loop

```bash
# Update your fork
git fetch upstream
git checkout main
git merge upstream/main

# Branch
git checkout -b feature/my-feature

# Code → test → lint
pnpm dev
pnpm format        # Prettier
pnpm check         # type-check via Turborepo
pnpm lint          # Prettier check + ESLint
pnpm build         # full build
```

### Hot reload behavior

| Change                      | Behavior                                                         |
| --------------------------- | ---------------------------------------------------------------- |
| Schema files (`schemaTypes/*`) | Picked up on the next request — Vite plugin flags as dirty.   |
| Component changes           | Instant via Vite HMR.                                            |
| Drizzle schema changes      | Requires `pnpm db:push` (dev) or a generate + migrate cycle.     |
| `cms-core` source           | Live — consumed from source via the workspace protocol.          |
| `postgresql-adapter` source | **Requires a rebuild** + dev server restart — consumed from `dist`. |
| `storage-s3` source         | **Requires a rebuild** + dev server restart — consumed from `dist`. |

### Database commands

```bash
# Dev (push schema directly — never use against prod)
pnpm db:push

# Prod (generate + apply migrations)
pnpm db:generate   # produces drizzle/0NNN_*.sql
pnpm db:migrate    # applies pending migrations

# Inspect the database
pnpm db:studio     # http://localhost:4983
```

### Package-level commands

```bash
# Work on a single package
pnpm dev:package   # cms-core only
pnpm dev:studio    # studio only

# Build + type-check cms-core in isolation
pnpm test:package

# Add shadcn-svelte components to @aphexcms/ui
pnpm shadcn button
pnpm shadcn dialog
```

### UI components

AphexCMS uses [shadcn-svelte](https://shadcn-svelte.com) via the `@aphexcms/ui` package, shared between `cms-core` (admin UI) and `apps/studio` (your app).

```ts
// Import once, available in both places
import { Button } from '@aphexcms/ui/shadcn/button';
import { Dialog } from '@aphexcms/ui/shadcn/dialog';
```

Components live in `packages/ui/src/lib/components/ui/`. Edit them directly — there's no eject step.

---

## Code Standards

### TypeScript

```ts
// Use `import type` for type-only imports
import type { SchemaType } from '@aphexcms/cms-core';

// Explicit return types on exported functions
export function createAdapter(): DatabaseAdapter {
  // ...
}

// Interfaces for object shapes
interface UserProfile {
  userId: string;
  role: 'super_admin' | 'admin' | 'editor' | 'viewer';
}
```

`any` is tolerated for fast iteration but should be tightened before merge if it's on a public surface.

### Svelte 5 (runes only)

```svelte
<script lang="ts">
  // Reactivity
  let count = $state(0);
  const doubled = $derived(count * 2);

  $effect(() => {
    console.log('count:', count);
  });

  // Props
  let { title }: { title: string } = $props();
</script>
```

Don't use Svelte 3/4's `$:` labels or `export let` — runes only.

### Naming

- **Files** — `kebab-case.ts`, `PascalCaseComponent.svelte`
- **Variables / functions** — `camelCase`
- **Types / interfaces** — `PascalCase`
- **Constants** — `UPPER_SNAKE_CASE` for true constants
- **Private fields** — prefix with `_` or use `#`

### Comments

Default to writing **no** comments. Only add one when the *why* is non-obvious — a hidden constraint, a workaround for a bug, a subtle invariant. Don't restate what the code does.

### Commits

Conventional Commits format:

```
feat: add MongoDB adapter
fix: resolve circular reference in schema resolution
docs: update ARCHITECTURE for Hono migration
refactor: simplify auth provider interface
test: add coverage for capability resolution
chore: update dependencies
```

Format: `<type>(<scope>): <description>`. Scope is optional. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

---

## Project Structure

```
aphex/
├── apps/
│   └── studio/                       # Reference app (the actual CMS)
│       ├── src/
│       │   ├── lib/
│       │   │   ├── schemaTypes/      # Content models live here
│       │   │   └── server/
│       │   │       ├── auth/         # Better Auth + AuthProvider
│       │   │       ├── cache/        # InMemoryCacheAdapter singleton
│       │   │       ├── db/           # Postgres adapter singleton
│       │   │       ├── email/        # Resend / Mailpit adapter
│       │   │       └── storage/      # Local / S3 adapter
│       │   ├── routes/
│       │   │   ├── (protected)/admin/    # Admin UI
│       │   │   ├── api/                  # Hono catch-all + a few shims
│       │   │   ├── login/                # Login page
│       │   │   ├── invite/               # Invitation accept page
│       │   │   ├── invitations/          # Pending-invitation list
│       │   │   ├── reset-password/
│       │   │   └── verify-email/
│       │   └── hooks.server.ts           # auth → CMS hook sequence
│       ├── tests/                        # vitest integration tests
│       └── aphex.config.ts               # CMS configuration
│
├── docs/aphex-docs/                  # Fumadocs site (Next.js)
│
├── packages/
│   ├── cms-core/                     # Database-agnostic core
│   │   └── src/lib/
│   │       ├── auth/                 # AuthProvider + capability helpers
│   │       ├── cache/                # CacheAdapter + InMemoryCacheAdapter
│   │       ├── components/           # Admin UI (Svelte 5)
│   │       ├── db/                   # Database interfaces
│   │       ├── email/                # EmailAdapter interface
│   │       ├── engine.ts             # CMSEngine
│   │       ├── field-validation/     # Sanity-style Rule API
│   │       ├── graphql/              # Generated GraphQL schema + resolvers
│   │       ├── hooks.ts              # createCMSHook factory
│   │       ├── local-api/            # Type-safe Local API
│   │       ├── schema-utils/         # Schema helpers (incl. singleton id)
│   │       ├── server/api/           # Hono routers (documents, roles, …)
│   │       ├── storage/              # StorageAdapter interface
│   │       └── types/                # Shared TS types
│   │
│   ├── postgresql-adapter/           # Postgres + Drizzle implementation
│   ├── storage-s3/                   # S3-compatible storage
│   ├── nodemailer-adapter/           # SMTP email
│   ├── resend-adapter/               # Resend email
│   ├── ui/                           # Shared shadcn-svelte components
│   ├── cli/                          # `aphx` user-facing CLI
│   └── create-aphex/                 # `pnpm create aphex` scaffolder
│
├── templates/base/                   # Starter project template (Dockerfile + prod.docker-compose.yml live here)
└── ARCHITECTURE.md                   # Internal deep dive
```

### Key principles

1. **`cms-core` is database-agnostic** — no database imports anywhere.
2. **Adapters are separate packages** — Postgres, S3, Resend, etc. each ship independently.
3. **App layer owns singletons** — adapter instances are created in `apps/studio` and passed to `createCMSConfig()`.
4. **Routes go through Hono** — most API logic lives in Hono routers in `cms-core`. The studio's `/api/[...slug]/+server.ts` is a catch-all that forwards to the Hono app.
5. **Schemas live in app code** — content models are TypeScript objects in `apps/studio/src/lib/schemaTypes/`, not in the database.
6. **UI components are shared** — `@aphexcms/ui` provides shadcn-svelte components to both cms-core and studio.

---

## Adding Features

### Adding a database adapter

See [ARCHITECTURE.md → Database Adapter](./ARCHITECTURE.md#database-adapter) for the full breakdown. Quick overview:

1. Create a new package (e.g. `@aphexcms/mysql-adapter`).
2. Implement every sub-interface of `DatabaseAdapter` (`DocumentAdapter`, `AssetAdapter`, `UserProfileAdapter`, `SchemaAdapter`, `OrganizationAdapter`, `InstanceAdapter`).
3. Export a provider factory that returns `{ createAdapter(): DatabaseAdapter }`.
4. Wire it up in `apps/studio/src/lib/server/db/index.ts`.

The PostgreSQL adapter is the canonical reference.

### Adding a storage adapter

1. Implement `StorageAdapter` (the six required methods + any optional ones you need).
2. Optionally export a helper that returns `{ adapter, disableLocalStorage: true }` to skip the default local fallback.
3. Pass to `createCMSConfig({ storage })`.

### Adding a field type

1. Extend the `FieldType` union in `packages/cms-core/src/lib/types/schemas.ts`.
2. Add a per-field type interface (e.g. `MyField extends BaseField { type: 'myType'; ... }`).
3. Create the editor component in `packages/cms-core/src/lib/components/admin/fields/` using Svelte 5 runes.
4. Wire it into `SchemaField.svelte`'s field switch.
5. (Optional) Add validation rules in `packages/cms-core/src/lib/field-validation/`.
6. (Optional) Update the GraphQL type mapper in `packages/cms-core/src/lib/graphql/schema.ts`.

### Extending the HTTP API

The legacy `CMSPlugin` system is gone. Custom routes, middleware, and overrides go through the `api(app)` config hook — see [ARCHITECTURE.md → API Layer](./ARCHITECTURE.md#api-layer):

```ts title="aphex.config.ts"
createCMSConfig({
  api: (app) => {
    // Brand-new endpoint
    app.post('/send-invoice', async (c) => {
      const { aphexCMS, auth } = c.var;
      // ...
      return c.json({ success: true });
    });

    // Wrap a built-in route with a side effect
    app.use('/organizations/invitations', async (c, next) => {
      await next();
      if (c.res.status === 201) sendCustomEmail();
    });
  }
});
```

The function runs before the built-in routes mount. Hono is first-match-wins, so registering before built-ins lets you intercept or override them.

---

## Testing

### Vitest suites

Integration tests live in `apps/studio/tests/` and exercise the API against a real Postgres. Run them via the workspace filter:

```bash
pnpm -F @aphexcms/studio test          # all tests
pnpm -F @aphexcms/studio test:watch    # watch mode
pnpm -F @aphexcms/studio test:ui       # vitest UI

pnpm -F @aphexcms/studio test:local    # Local API only
pnpm -F @aphexcms/studio test:http     # HTTP API only
pnpm -F @aphexcms/studio test:graphql  # GraphQL only
pnpm -F @aphexcms/studio test:all      # comprehensive batch
```

Tests assume a running database — start it with `pnpm db:start` first.

### Manual QA

Before opening a PR, sanity-check:

- `pnpm build` succeeds
- `pnpm check` passes (type-check across all packages via Turborepo)
- `pnpm lint` passes (Prettier + ESLint)
- `pnpm dev` runs cleanly with no console errors
- The admin UI loads and the feature you touched still works
- If you changed Drizzle schema: `pnpm db:push` (dev) and the affected migration generated correctly

---

## Pull Request Process

### Before submitting

```bash
# Make sure your changes are clean
pnpm format
pnpm check
pnpm lint
pnpm build

# Sync with upstream
git fetch upstream
git rebase upstream/main
```

### PR description should cover

- **What** — one-paragraph summary of the change.
- **Why** — the motivation (issue link if there is one).
- **How** — implementation approach for non-obvious changes.
- **Testing** — what you ran / observed.
- **Screenshots / video** — if it's a UI change.

### PR guidelines

- One feature or fix per PR — easier to review and revert.
- Aim for under 500 lines of diff. Larger refactors should be split.
- Don't reformat unrelated files.
- No breaking changes without prior discussion in an issue.

### Review

CI runs lint + type-check + build. A maintainer reviews architecture and code; address feedback in additional commits (don't squash until merge).

---

## Releases & Publishing

Releases are managed by [Changesets](https://github.com/changesets/changesets) and automated via `.github/workflows/release.yml`. Maintainers don't tag or publish manually — every change to `packages/*` flows through the same loop.

### What gets published

Anything under `packages/*` with a `package.json` that has `"private": false`. The Changesets config explicitly **ignores** these so they never publish:

```json title=".changeset/config.json"
"ignore": ["@aphexcms/studio", "@aphexcms/base", "aphex-docs"]
```

| Published                    | Description                                   |
| ---------------------------- | --------------------------------------------- |
| `@aphexcms/cms-core`         | Core engine + admin UI                        |
| `@aphexcms/postgresql-adapter` | Postgres + Drizzle adapter                  |
| `@aphexcms/storage-s3`       | S3-compatible storage adapter                 |
| `@aphexcms/nodemailer-adapter` | Nodemailer/SMTP email adapter               |
| `@aphexcms/resend-adapter`   | Resend API email adapter                      |
| `@aphexcms/ui`               | Shared shadcn-svelte components               |
| `create-aphex`               | Scaffolder invoked via `pnpm create aphex`    |
| `@aphexcms/cli`              | Thin `aphx` wrapper that delegates to `create-aphex` |

`@aphexcms/studio`, `@aphexcms/base`, and `aphex-docs` are intentionally not published — studio is the dev reference, the template ships via the standalone `aphex-base` mirror, and the docs ship via the standalone `aphex-docs` mirror.

### Recording a change

Every PR that touches a published package needs a changeset:

```bash
pnpm changeset
```

The CLI prompts for:

1. Which packages changed (space-bar to select).
2. Bump type — `patch` (bug fix), `minor` (new feature, backwards-compatible), `major` (breaking).
3. A summary that becomes the changelog entry.

It writes a markdown file to `.changeset/<random-name>.md`. Commit it with the rest of your PR.

Skip the changeset if the PR is docs-only, internal refactoring with no API surface change, or a fix to studio/base/docs only.

### How a release ships

When PRs merge to `main`, the `release.yml` workflow runs `changesets/action@v1` which:

1. **If pending changesets exist** → opens (or updates) a PR titled `chore: version packages` that bumps versions in every affected `package.json`, regenerates `CHANGELOG.md` for each package, and deletes the consumed changeset files.
2. **If no pending changesets but the version PR was just merged** → publishes to npm via `pnpm release`, which is `turbo build --filter='./packages/*' && changeset publish --provenance`.

The `--provenance` flag attaches an SLSA provenance statement signed by GitHub's OIDC token — npm verifies it and badges packages as "Provenance" on npmjs.com. This is why `release.yml` sets `id-token: write` and why pushes need to come from GitHub Actions, not a local machine.

### Required secrets

| Secret              | Where             | Why                                                         |
| ------------------- | ----------------- | ----------------------------------------------------------- |
| `GITHUB_TOKEN`      | Auto-provided     | Lets the workflow open the version PR.                      |
| `NPM_TOKEN`         | Repo secrets      | Required unless trusted publishing is configured on npm.    |

If you set up [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) for the org, `NPM_TOKEN` becomes optional — the OIDC token from `id-token: write` authenticates instead. Otherwise add an automation token from npm under repo settings → Secrets and variables → Actions, name it `NPM_TOKEN`, and reference it in the env block of the publish step.

### Manual publish (escape hatch)

Don't do this normally — the workflow is the source of truth. If you need to publish out-of-band (broken release, urgent security fix during workflow downtime):

```bash
pnpm install
pnpm changeset version       # bump versions, regenerate CHANGELOGs
git commit -am "chore: version packages"
pnpm release                 # builds and publishes
git push --follow-tags
```

You'll need to be logged into npm (`pnpm npm login`) with publish rights to the `@aphexcms` scope, and you lose provenance attestation.

---

## Template & Docs Sync

Two separate "subtree mirror" workflows ship subdirectories of the monorepo to standalone public repos so end users can clone/fork them without dragging the whole monorepo. The monorepo is always the source of truth — the mirrors are read-only from the user's perspective.

### Studio → templates/base

`apps/studio` is the dev reference where new features land first. `templates/base` is the starter shipped to end users via `pnpm create aphex` (or `npm create aphex@latest`). To flow studio changes downstream:

```bash
# Preview what would change (template-driven — only files that already
# exist in templates/base get considered)
./scripts/sync-template.sh

# Apply the changes
./scripts/sync-template.sh --apply
```

The script walks every file tracked in `templates/base/` and copies the matching file from `apps/studio/` if it exists. Files that only live in the template (Dockerfile, README, prod.docker-compose.yml) are left alone. Files that only live in studio (tests, seed routes, dev fixtures) never copy — so studio-only drift can't leak into the template.

Special-cased paths:

- **`src/lib/schemaTypes/**`** — skipped. Template keeps its minimal `post.ts` example instead of inheriting studio's dev fixtures.
- **`src/app.css`** — skipped. Template references `node_modules/@aphexcms/*/dist` for Tailwind `@source`; studio uses monorepo-relative paths.
- **`package.json`** — merged. Studio's content overrides, but the template's `name` and `version` are preserved.

If studio adds a genuinely new top-level file or directory (e.g. `src/lib/server/cache/`), create a placeholder in `templates/base/` first — otherwise the template-driven walk skips it.

After syncing, **always update `templates/base/CHANGELOG.md`** under `## Unreleased`. The template is meant to be customized, so syncs don't auto-apply downstream — the changelog is how users know what to port into their own projects. When cutting a release, rename `Unreleased` to the version number.

### templates/base → standalone repo (`aphex-base`)

`.github/workflows/sync-template.yml` mirrors `templates/base/` to [`IcelandicIcecream/aphex-base`](https://github.com/IcelandicIcecream/aphex-base) on every push to `main` that touches `templates/base/**`. Before pushing, it rewrites `workspace:*` deps in the template's `package.json` to real versions so the standalone repo is installable with plain `pnpm install`.

| Secret                       | What it is                                       |
| ---------------------------- | ------------------------------------------------ |
| `TEMPLATE_REPO_DEPLOY_KEY`   | SSH **private** key with write access to `aphex-base`. |

The matching public key lives on the destination repo under Settings → Deploy keys with "Allow write access" enabled. Generate a new keypair with `ssh-keygen -t ed25519 -f aphex_base_deploy -N ""`, paste the `.pub` into the destination's Deploy keys, paste the private key (full file content including `-----BEGIN`/`-----END` markers and trailing newline) into the source repo's secret.

### docs/aphex-docs → standalone repo (`aphex-docs`)

Identical pattern: `.github/workflows/sync-docs.yml` mirrors `docs/aphex-docs/` to [`IcelandicIcecream/aphex-docs`](https://github.com/IcelandicIcecream/aphex-docs) on pushes to `main` that touch `docs/aphex-docs/**`. The destination repo is what powers `https://docs.getaphex.com` (deployed independently — typically Vercel or Cloudflare Pages).

| Secret                  | What it is                                    |
| ----------------------- | --------------------------------------------- |
| `DOCS_REPO_DEPLOY_KEY`  | SSH private key with write access to `aphex-docs`. |

### create-aphex scaffolder refresh

`packages/create-aphex/templates/` is a **build-time copy** of `templates/` with `workspace:*` resolved to real versions. After changing the root `templates/`:

```bash
pnpm -F create-aphex build       # runs scripts/copy-templates.js then tsc
```

This is what `pnpm create aphex` (or `npm create aphex@latest`) actually ships — the root `templates/` directory is for the monorepo's working state and the standalone mirror, not for end users.

To smoke-test locally:

```bash
node packages/create-aphex/dist/index.js my-test-app
# or
cd packages/create-aphex && pnpm link --global   # then `create-aphex my-test-app`
```

### Other CLIs

| Package           | Bin              | What it does                                              |
| ----------------- | ---------------- | --------------------------------------------------------- |
| `create-aphex`    | `create-aphex`   | The scaffolder. Auto-resolved by `pnpm create aphex` / `npm create aphex@latest`. |
| `@aphexcms/cli`   | `aphx`           | Thin wrapper. `aphx create` just spawns `npx create-aphex`. Kept for ergonomics; not the primary entry point. |
| `@aphexcms/cms-core` | `aphex`       | Internal codegen — `aphex generate:types` reads `aphex.config.ts` and emits TS interfaces. Lives at `packages/cms-core/src/cli/index.ts`, used inside template projects. |

The three bins are intentionally split — `cms-core` doesn't ship a scaffolder (would bloat the runtime install), and `create-aphex` doesn't import `cms-core` (would force a heavy install just to scaffold).

---

## Reporting Issues

### Before reporting

1. Search existing issues — your bug may already be tracked.
2. Update to latest `main` and re-test.
3. Reduce to a minimal reproduction.

### Bug reports — include

- **Environment:** OS, Node version, pnpm version, browser (if UI).
- **Steps to reproduce:** numbered list.
- **Expected vs actual** behavior.
- **Logs:** browser console + terminal output.

### Feature requests — include

- **Use case:** "As a *role*, I want to *action* so that *benefit*."
- **Proposed solution:** rough sketch.
- **Alternatives considered:** anything you've already ruled out.

---

## Resources

- [README.md](./README.md) — quick start and high-level features
- [ARCHITECTURE.md](./ARCHITECTURE.md) — internal deep dive
- [Docs site](https://docs.getaphex.com) — user-facing documentation
- [GitHub Discussions](https://github.com/IcelandicIcecream/aphex/discussions) — questions and ideas
- [GitHub Issues](https://github.com/IcelandicIcecream/aphex/issues) — bugs and feature requests

Questions? Open a discussion or an issue. Every contribution helps.
