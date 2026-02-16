# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AphexCMS is a Sanity-inspired, database-agnostic CMS built with SvelteKit V2 (Svelte 5). It uses a monorepo managed by pnpm workspaces and Turborepo.

## Common Commands

```bash
# Development
pnpm dev              # Start studio app (via Turborepo)
pnpm dev:studio       # Start studio app directly
pnpm dev:package      # Start cms-core package only
pnpm build            # Build all packages (Turborepo)
pnpm clean            # Remove build artifacts

# Code Quality
pnpm format           # Format with Prettier
pnpm lint             # Prettier check + ESLint
pnpm check            # Type-check all packages (Turborepo)
pnpm test:package     # Build + type-check cms-core

# Database (proxied to apps/studio)
pnpm db:start         # Start PostgreSQL via Docker
pnpm db:push          # Push schema changes (dev)
pnpm db:generate      # Generate migration files
pnpm db:migrate       # Run migrations (prod)
pnpm db:studio        # Open Drizzle Studio at localhost:4983

# Tests (in apps/studio)
pnpm -F @aphexcms/studio test          # Run all tests
pnpm -F @aphexcms/studio test:watch    # Watch mode
pnpm -F @aphexcms/studio test:ui       # Vitest UI
pnpm -F @aphexcms/studio test:local    # Local API tests only
pnpm -F @aphexcms/studio test:http     # HTTP API tests only
pnpm -F @aphexcms/studio test:graphql  # GraphQL API tests only

# UI Components (adds shadcn-svelte components to @aphexcms/ui)
pnpm shadcn <component-name>
```

## Architecture

### Monorepo Layout

- **apps/studio** — Reference SvelteKit app (the actual CMS admin). Contains schema definitions, auth setup, DB/storage singletons, and API route re-exports.
- **packages/cms-core** — Database-agnostic core engine. Contains admin UI components, route handlers, field validation, schema utilities, plugin system, and TypeScript types. Exports via `@aphexcms/cms-core`, `@aphexcms/cms-core/server`, `@aphexcms/cms-core/client`, `@aphexcms/cms-core/schema`.
- **packages/postgresql-adapter** — PostgreSQL implementation using Drizzle ORM.
- **packages/storage-s3** — S3-compatible storage adapter (R2, AWS S3, MinIO).
- **packages/graphql-plugin** — Auto-generated GraphQL API from CMS schemas.
- **packages/ui** — Shared shadcn-svelte component library (`@aphexcms/ui`). Components imported as `@aphexcms/ui/shadcn/<component>`.
- **packages/cli, packages/create-aphex** — CLI tooling for scaffolding.
- **packages/nodemailer-adapter, packages/resend-adapter** — Email adapters.
- **templates/** — Starter project templates.

### Key Architecture Patterns

**Ports & Adapters (Hexagonal):** `cms-core` defines interfaces (`DatabaseAdapter`, `StorageAdapter`, `AuthProvider`); separate packages provide implementations. This keeps the core database-agnostic.

**Route Handler Re-exports:** API routes are defined in `cms-core/src/routes/` and re-exported in `apps/studio/src/routes/api/`. This avoids duplication while allowing customization.

**Singleton DI via Config:** The app creates singleton adapters (DB, storage, auth) and passes them to `createCMSConfig()` in `aphex.config.ts`. The `createCMSHook()` in `hooks.server.ts` initializes the CMS engine and injects services into `event.locals.aphexCMS`.

**Schema System:** Content schemas are TypeScript objects defined in `apps/studio/src/lib/schemaTypes/`. Two types: `document` (top-level entities) and `object` (reusable nested structures). Field types: `string`, `text`, `number`, `boolean`, `slug`, `image`, `array`, `object`, `reference`.

**Document Workflow:** Draft/published model with hash-based change detection. Auto-save every 2 seconds. Publishing copies draft data to published data with a content hash.

### Key Files

- `apps/studio/aphex.config.ts` — CMS configuration (schemas, DB, storage, auth, plugins)
- `apps/studio/src/hooks.server.ts` — CMS initialization via `sequence(authHook, aphexHook)`
- `apps/studio/src/lib/server/db/` — Database singleton and schema composition
- `apps/studio/src/lib/server/auth/` — Better Auth integration and AuthProvider
- `packages/cms-core/src/engine.ts` — CMSEngine class (orchestrator)
- `packages/cms-core/src/hooks.ts` — SvelteKit hook factory
- `packages/cms-core/src/routes-exports.ts` — Barrel file for route handler exports
- `packages/cms-core/src/components/admin/` — Admin UI components (Svelte 5)
- `packages/cms-core/src/components/admin/SchemaField.svelte` — Dynamic field renderer
- `packages/postgresql-adapter/src/schema.ts` — Drizzle database schema

## Code Conventions

- **Svelte 5 runes**: Use `$state`, `$derived`, `$effect` — not Svelte 3/4 `$:` syntax.
- **Commit messages**: Conventional Commits format (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`).
- **Naming**: `kebab-case.ts` files, `PascalCase.svelte` components, `camelCase` variables/functions, `PascalCase` types/interfaces.
- **Imports**: Use `import type` for type-only imports.
- **UI components**: Import from `@aphexcms/ui/shadcn/<component>`. Add new ones via `pnpm shadcn <name>`.
- **Styling**: Tailwind CSS v4 with shared CSS variables in `packages/ui/src/lib/app.css`.

## Environment Setup

- Copy `apps/studio/.env.example` to `apps/studio/.env` for local dev (defaults work).
- First user to sign up at `/login` becomes super admin.
- Admin UI is at `http://localhost:5173/admin`.
