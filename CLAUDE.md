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

# Template sync (apps/studio → templates/base)
./scripts/sync-template.sh           # Dry run — preview changes
./scripts/sync-template.sh --apply   # Apply changes
```

## Syncing studio → template → CLI

`apps/studio` is the reference app where new features land first. `templates/base` is the starter shipped to end users via `create-aphex`. To flow studio changes downstream:

1. **Sync studio → template** — `./scripts/sync-template.sh --apply`. Template-driven: walks every file tracked in `templates/base/` and copies the matching file from `apps/studio/` if it exists. Skips `src/lib/schemaTypes/**` (template keeps its own minimal example schema). Merges `package.json` preserving the template's `name` and `version`. Studio-only files (tests, seed routes, scripts, render route) never flow over because the template has no matching path.

2. **If studio added a genuinely new file/dir** (e.g. `src/lib/server/cache/`), create a placeholder in `templates/base/` first so the sync picks it up on the next run. This is the tradeoff of the template-driven approach — safe, but requires one manual step for new top-level additions.

3. **Update `templates/base/CHANGELOG.md`** — under `## Unreleased`, list the files that changed and a one-line reason. The template is meant to be customized, so syncs don't auto-apply to downstream projects — the changelog is how users know what to port into their own customized copy. When cutting a release, rename `Unreleased` to the new version.

4. **Push to standalone repo** — when changes to `templates/base/**` land on `main`, `.github/workflows/sync-template.yml` mirrors the folder to `IcelandicIcecream/aphex-base`, rewriting `workspace:*` deps to real versions before pushing. `create-aphex` fetches that repo at scaffold time via `giget` (no bundled templates), so once the workflow runs the new template is live for end users — no `create-aphex` republish needed.

5. **Test the scaffolder locally** — `pnpm -F create-aphex build && node packages/create-aphex/dist/index.js`. By default it pulls `github:IcelandicIcecream/aphex-base`; override with `APHEX_TEMPLATE=github:owner/repo#ref` to test an unpushed branch or a fork.

6. **Verify the template builds** — `pnpm -F @aphexcms/base build`. The template guards module-eval-time env reads with the SvelteKit `building` flag, so build does not require a real `.env`.

The `aphx` CLI (`packages/cli/`, `@aphexcms/cli`) is separate and minimal. Edit `src/index.ts`, run `pnpm -F @aphexcms/cli build`, then `node packages/cli/dist/index.js <cmd>` or `pnpm link --global` to test. The `aphex generate:types` command the template uses is a different bin, exposed by `@aphexcms/cms-core` at `packages/cms-core/src/cli/index.ts`.

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

**Schema System:** Content schemas are TypeScript objects defined in `apps/studio/src/lib/schemaTypes/`. Two types: `document` (top-level entities) and `object` (reusable nested structures). Field types: `string`, `text`, `number`, `boolean`, `slug`, `image`, `array`, `object`, `reference`, `date`, `datetime`.

**Block Content (Rich Text):** Rich text follows Sanity's Portable Text model — an array of blocks, not a standalone field type. Schema: `{ type: 'array', of: [{type: 'block'}, ...] }`. The `block` type is a built-in that activates the TipTap-based Portable Text editor. Configuration follows Sanity's conventions:

```ts
{
  name: 'content',
  type: 'array',
  title: 'Content',
  of: [
    {
      type: 'block',
      // All optional — sensible defaults if omitted
      styles: [{title: 'Normal', value: 'normal'}, {title: 'H1', value: 'h1'}, ...],
      lists: [{title: 'Bullet', value: 'bullet'}, {title: 'Number', value: 'number'}],
      marks: {
        decorators: [{title: 'Bold', value: 'strong'}, {title: 'Italic', value: 'em'}],
        annotations: [
          { name: 'internalLink', title: 'Internal Link', fields: [...] }
        ]
      },
      of: [
        // Inline objects — appear within text flow (e.g. footnotes, mentions)
        { type: 'footnote', title: 'Footnote', fields: [...] }
      ]
    },
    // Block-level custom types — siblings of block, appear between paragraphs
    { type: 'image', title: 'Image' },  // Built-in: opens asset browser
    { type: 'callout', title: 'Callout', fields: [...] },
    { type: 'codeBlock', title: 'Code Block', fields: [...] }
  ],
  validation: (Rule) => Rule.required()
}
```

Key points:

- `block` is never created manually — the editor manages text blocks automatically
- `image` is a built-in block type with asset browser integration (insert + replace)
- Other custom types use ObjectModal for editing
- Inline objects (`block.of`) render as chips within text; block-level types render as cards between paragraphs
- Validation works via the standard `Rule` class since block content is a regular array
- Stored as Portable Text JSON (spec: portabletext.org)
- Serializer: `packages/cms-core/src/lib/components/admin/fields/richtext/portable-text-serializer.ts`
- Editor: `packages/cms-core/src/lib/components/admin/fields/richtext/RichtextField.svelte`
- `ArrayField.svelte` detects `{type: 'block'}` in `of` and delegates to `RichtextField`

**Document Workflow:** Draft/published model with hash-based change detection. Auto-save every 2 seconds. Publishing copies draft data to published data with a content hash.

**API Contracts (Zod):** All cms-core API endpoints use zod as a single source of truth for request shapes. Schemas live in `packages/cms-core/src/lib/api/schemas/<resource>.ts` and are imported by both the route handler and the client (`packages/cms-core/src/lib/api/<resource>.ts`). Route handlers validate via `safeParse` and return `{ success: false, error, issues }` with status 400 on failure; clients consume `z.infer<>` request types so input shapes can't drift. For query strings use `Object.fromEntries(url.searchParams.entries())` + `z.coerce.number()`. Keep hand-written TS interfaces for **response** types (e.g. `Asset`, `Organization`) — zod `.passthrough()` adds an index signature that breaks strict assignment for callers. Studio routes import schemas via `@aphexcms/cms-core/api/schemas/<resource>` (the package's `./*` export wildcard). Skip schemas for GET-only endpoints and no-body POST/DELETE (publish, accept-invitation, etc).

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
