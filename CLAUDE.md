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
- **packages/ui** — Shared shadcn-svelte component library (`@aphexcms/ui`). Components imported as `@aphexcms/ui/shadcn/<component>`.
- **packages/cli, packages/create-aphex** — CLI tooling for scaffolding.
- **packages/nodemailer-adapter** — Nodemailer/SMTP email adapter (includes `createMailpitAdapter()` for local dev).
- **packages/resend-adapter** — Resend API email adapter (production).
- **templates/base** — Starter project template for new AphexCMS projects.

### Key Architecture Patterns

**Ports & Adapters (Hexagonal):** `cms-core` defines interfaces (`DatabaseAdapter`, `StorageAdapter`, `AuthProvider`); separate packages provide implementations. This keeps the core database-agnostic.

**Route Handler Re-exports:** API routes are defined in `cms-core/src/routes/` and re-exported in `apps/studio/src/routes/api/`. This avoids duplication while allowing customization.

**Singleton DI via Config:** The app creates singleton adapters (DB, storage, auth) and passes them to `createCMSConfig()` in `aphex.config.ts`. The `createCMSHook()` in `hooks.server.ts` initializes the CMS engine and injects services into `event.locals.aphexCMS`.

**Schema System:** Content schemas are TypeScript objects defined in `apps/studio/src/lib/schemaTypes/`. Two types: `document` (top-level entities) and `object` (reusable nested structures). Field types: `string`, `text`, `number`, `boolean`, `slug`, `image`, `array`, `object`, `reference`.

**Document Workflow:** Draft/published model with hash-based change detection. Auto-save every 2 seconds. Publishing copies draft data to published data with a content hash.

**Email System:** Ports & adapters pattern — `cms-core` defines the `EmailAdapter` interface (`send()`, optional `sendBatch()`), with Nodemailer and Resend implementations in separate packages. Email templates are Svelte 5 components using `better-svelte-email`, rendered server-side via a shared `Renderer` to email-safe HTML with Tailwind support. Templates live in each app at `src/lib/server/email/components/` (EmailLayout, PasswordReset, EmailVerification, Invitation). The renderer at `src/lib/server/email/renderer.ts` produces both HTML and plain text (`toPlainText()`). Three email types: password reset, email verification, and organization invitation. Dev uses Mailpit (localhost:1025, UI at localhost:8025); prod uses Resend. Emails are sent via Better Auth callbacks (auth flows) and fire-and-forget in route handlers (invitations). The adapter is injected via `createCMSConfig()` and available at `event.locals.aphexCMS.emailAdapter`.

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
- `apps/studio/src/lib/server/email/` — Email adapter selection, config, renderer, and Svelte email components
- `apps/studio/src/lib/server/auth/better-auth/instance.ts` — Better Auth setup (sends password reset & verification emails)
- `packages/cms-core/src/lib/email/interfaces/email.ts` — EmailAdapter interface & types

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
