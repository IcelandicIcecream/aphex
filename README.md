<div align="center">
  <img src="./apps/studio/static/images/aphex-darkmode.png" alt="AphexCMS Logo" width="80" />
  <br>
  <h1>AphexCMS</h1>
  <p><strong>A Sanity-inspired, database-agnostic CMS built with SvelteKit V2 (Svelte 5)</strong></p>
</div>

<div align="center">
  <img src="./responsive-demo.gif" alt="AphexCMS Responsive Demo" width="100%" />
</div>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-V2-FF3E00?logo=svelte)](https://kit.svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)

</div>

## ✨ Features

- 🎨 **Sanity-inspired admin** - Responsive 3-panel editor with mobile navigation, auto-save, validation, version history, and visual preview
- 🔌 **Database adapters** - PostgreSQL, embedded Postgres via PGlite, and SQLite/libsql with a shared `DatabaseAdapter` contract
- ☁️ **Storage flexible** - Local filesystem or S3-compatible storage (R2, AWS S3, MinIO)
- 🔐 **Auth agnostic** - Bring your own auth; Better Auth integration ships with sessions, organizations, invitations, and API keys
- 📝 **Type-safe schemas** - Define content models in TypeScript and generate strongly typed Local API collections
- ✍️ **Portable Text rich content** - TipTap-backed block editor with custom blocks, inline objects, marks, and annotations
- 🔄 **Draft/publish workflow** - Auto-save, hash-based change detection, publish/unpublish, and rolling version history
- 👁️ **Visual editing** - Live preview with stega-encoded click-to-edit overlays via `@aphexcms/visual-editing`
- 🏢 **Multi-tenancy** - Organizations, parent/child hierarchy, capability RBAC, field-level access, and Postgres RLS
- 🔑 **API keys** - Org-scoped programmatic access with rate limiting, read/write scopes, and fine-grained capability allowlists
- 🚀 **Built-in APIs** - Local API, Zod-validated HTTP API, generated GraphQL, and Streamable HTTP MCP server
- 📚 **Reference resolution** - Nested depth control, circular protection, and publish guards for referenced content

## 📦 Packages

| Package                         | Description                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `@aphexcms/cms-core`            | Database-agnostic core engine with admin UI, API handlers, and built-in GraphQL |
| `@aphexcms/postgresql-adapter`  | PostgreSQL implementation with Drizzle ORM                                      |
| `@aphexcms/sqlite-adapter`      | SQLite/libsql implementation (local `file:` databases and Turso)                |
| `@aphexcms/storage-s3`          | S3-compatible storage (R2, AWS S3, MinIO, etc.)                                 |
| `@aphexcms/storage-vercel-blob` | Vercel Blob storage — zero-config when deployed on Vercel                       |
| `@aphexcms/nodemailer-adapter`  | Nodemailer/SMTP email adapter (with Mailpit helper for local dev)               |
| `@aphexcms/resend-adapter`      | Resend API email adapter for production                                         |
| `@aphexcms/ui`                  | Shared [shadcn-svelte](https://shadcn-svelte.com) component library             |
| `@aphexcms/visual-editing`      | Live preview overlay, stega helpers, and click-to-edit frontend integration     |
| `@aphexcms/base`                | Starter template scaffolded by `create-aphex`                                   |
| `@aphexcms/blog`                | Blog template with public frontend and visual editing examples                  |
| `@aphexcms/studio`              | Reference implementation app (drives the template)                              |
| `create-aphex`                  | Scaffolder invoked by `pnpm create aphex` / `npm create aphex@latest`           |

> 💡 **Architecture deep-dive**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design patterns and internals.
>
> 💡 **Adding UI components**: Run `pnpm shadcn <component-name>` to add shadcn-svelte components to `@aphexcms/ui`

## 🚀 Quick Start

### Deploy to Vercel (try it instantly)

No local setup — click the button, and Vercel provisions a Neon Postgres database and a Blob store for you automatically, wired up with zero extra config:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FIcelandicIcecream%2Faphex&root-directory=apps%2Fstudio&project-name=my-aphex-cms&repository-name=my-aphex-cms&demo-title=AphexCMS&demo-description=Sanity-inspired%2C%20database-agnostic%20headless%20CMS%20%E2%80%94%20spin%20up%20your%20own%20instance&env=BETTER_AUTH_SECRET&envDescription=Random%20secret%20Better%20Auth%20uses%20to%20sign%20session%20tokens.%20Generate%20one%20with%3A%20openssl%20rand%20-base64%2032&envLink=https%3A%2F%2Fgithub.com%2FIcelandicIcecream%2Faphex%2Fblob%2Fmain%2Fapps%2Fstudio%2F.env.example&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%5D&stores=%5B%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22public%22%7D%5D)

You'll be asked for one value, `BETTER_AUTH_SECRET` — any long random string (`openssl rand -base64 32` works). Everything else (database, file storage, the app's own URL) is detected automatically. Once it's live, visit `/admin` on your new deployment and sign up — the first account becomes super admin.

This deploys the reference `apps/studio` app straight from this repo — your own isolated instance, not a shared demo. It's meant for trying the product, not production use (see [Manual Installation](#manual-installation-development) for that).

> Want the blog starter instead (public frontend, visual editing, blog content model)? Its own Deploy button lives in [`templates/blog/README.md`](./templates/blog/README.md).

### Using `create-aphex` (Recommended)

The fastest way to get started:

```bash
pnpm create aphex my-app
# or
npm create aphex my-app
# or
npx create-aphex my-app
```

This will:

- Prompt you for a project name
- Scaffold a full Aphex CMS project
- Generate a `.env` file with all required environment variables
- Provide next steps for starting your project

Then:

```bash
cd your-project-name
pnpm install
pnpm db:start      # Start PostgreSQL via Docker
pnpm db:push       # Push database schema
pnpm dev           # Start development server
```

Prefer no Docker for local development? Use `APHEX_DATABASE=sqlite` for a local libsql file database, or `APHEX_DATABASE=pglite` for embedded Postgres semantics.

🎉 **Admin UI**: http://localhost:5173/admin

### Manual Installation (Development)

If you want to contribute to Aphex or work with the monorepo:

```bash
git clone https://github.com/IcelandicIcecream/aphex.git
cd aphex
pnpm install
```

Then pick a database.

#### With SQLite — no Docker, no migrations

The fastest path. The schema is pushed on boot, so there's nothing to run but the dev server:

```bash
cd apps/studio
cp .env.example .env
echo 'APHEX_DATABASE=sqlite' >> .env
cd ../..

pnpm dev
```

That's it. The database is created at `apps/studio/.aphex/studio.db` (gitignored). Email verification is off by default, so the first account you create can sign in immediately — no SMTP server needed.

#### With PostgreSQL

Needs Docker, and an explicit migration step:

```bash
cd apps/studio
cp .env.example .env   # default connection string works locally
cd ../..

pnpm db:start          # Postgres + Mailpit via Docker
pnpm db:migrate
pnpm dev
```

> Prefer Postgres semantics without Docker? Set `APHEX_DATABASE=pglite` for an embedded Postgres persisted to a local folder, then run `aphex migrate` once before `pnpm dev`.

🎉 **Admin UI**: http://localhost:5173/admin — the first user to sign up becomes super admin.

### Storage Configuration (Optional)

By default, uses **local filesystem** — fine for local dev, but it won't persist on serverless hosts like Vercel. `apps/studio` auto-detects cloud storage in this order: Vercel Blob (`BLOB_READ_WRITE_TOKEN`, set automatically when you use the Deploy button above or connect a Blob store) → S3-compatible (`R2_*` vars) → local filesystem fallback. See `apps/studio/src/lib/server/storage/index.ts`.

To wire either up by hand:

```bash
pnpm add @aphexcms/storage-s3
# or: pnpm add @aphexcms/storage-vercel-blob
```

```typescript
// apps/studio/src/lib/server/storage/index.ts
import { s3Storage } from '@aphexcms/storage-s3';

export const storageAdapter = s3Storage({
	bucket: env.R2_BUCKET,
	endpoint: env.R2_ENDPOINT,
	accessKeyId: env.R2_ACCESS_KEY_ID,
	secretAccessKey: env.R2_SECRET_ACCESS_KEY,
	publicUrl: env.R2_PUBLIC_URL
}).adapter;
```

```typescript
// aphex.config.ts
import { storageAdapter } from './src/lib/server/storage';

export default createCMSConfig({
	storage: storageAdapter // Pass your adapter
});
```

## 📖 Defining Content Schemas

Content models live in **your app** as TypeScript objects:

```typescript
// apps/studio/src/lib/schemaTypes/page.ts
export const page: SchemaType = {
	name: 'page',
	type: 'document',
	title: 'Page',
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title',
			validation: (Rule) => Rule.required().max(100)
		},
		{
			name: 'slug',
			type: 'slug',
			title: 'URL Slug',
			source: 'title', // Auto-generate from title
			validation: (Rule) => Rule.required()
		},
		{
			name: 'content',
			type: 'array',
			title: 'Content Blocks',
			of: [{ type: 'textBlock' }, { type: 'imageBlock' }, { type: 'catalogBlock' }]
		},
		{
			name: 'author',
			type: 'reference',
			title: 'Author',
			to: [{ type: 'author' }] // Reference to other documents
		}
	]
};
```

Register schemas in your config:

```typescript
// aphex.config.ts
import { page, author, textBlock } from './src/lib/schemaTypes';

export default createCMSConfig({
	schemaTypes: [page, author, textBlock]
	// ...
});
```

**Available field types**: `string`, `text`, `number`, `boolean`, `slug`, `url`, `date`, `datetime`, `image`, `file`, `array`, `object`, `reference`. Rich text uses Portable Text block arrays: `{ type: 'array', of: [{ type: 'block' }] }`.

## 🛠️ Tech Stack

- **[SvelteKit V2](https://kit.svelte.dev)** - Framework with Svelte 5 runes
- **[Drizzle ORM](https://orm.drizzle.team)** - Type-safe database queries
- **[Better Auth](https://better-auth.com)** - Authentication & sessions
- **[Turborepo](https://turbo.build)** - Monorepo build system
- **[Tailwind CSS v4](https://tailwindcss.com)** - Styling
- **[shadcn-svelte](https://shadcn-svelte.com)** - UI components

## 🎨 Admin Interface

The admin UI is a **responsive 3-panel layout** inspired by Sanity Studio:

- **Desktop**: Side-by-side panels (types → documents → editor)
- **Mobile**: Stack navigation with breadcrumbs
- **Real-time validation** with inline error messages
- **Auto-save** every 2 seconds (never lose work!)
- **Draft/publish/version history** with preview and restore
- **Visual editing** when a schema defines `previewUrl`
- **Nested reference editing** via modal overlays
- **Drag-and-drop** array field reordering

## 🔍 API Features

### Reference Resolution with Depth Control

```bash
# Just IDs (default)
GET /api/documents/123

# Resolve first-level references
GET /api/documents/123?depth=1

# Resolve nested references
GET /api/documents/123?depth=2
```

**Circular reference protection** prevents infinite loops. Max depth: 5.

### GraphQL API

GraphQL is built into `cms-core` and enabled by default. To customize:

```typescript
export default createCMSConfig({
	graphql: {
		path: '/api/graphql',
		enableGraphiQL: true
	}
});
```

Visit `/api/graphql` for GraphiQL interface with auto-generated schema.

### MCP Server

Aphex ships a Streamable HTTP MCP server for AI clients such as Claude Code and Cursor. Scaffolded apps expose it at `/mcp` with a one-line route re-export:

```typescript
export { POST, GET, DELETE } from '@aphexcms/cms-core/routes/mcp';
```

Authenticate with an org-scoped API key:

```bash
claude mcp add --transport http aphex http://localhost:5173/mcp \
  --header "x-api-key: your-api-key-here"
```

Current tools cover schema inspection, validation, document query/create/update/publish, singleton reads/writes, and asset listing.

## 🛠️ Development Commands

```bash
# Development
pnpm dev              # Start all packages in watch mode
pnpm dev:studio       # Start studio app only
pnpm dev:package      # Start cms-core package only
pnpm dev:docs         # Start dev server

# Building
pnpm build            # Build all packages (Turborepo)
pnpm preview          # Preview production build

# Database
pnpm db:start         # Start PostgreSQL (Docker)
pnpm db:push          # Push schema changes (dev)
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations (prod)
pnpm db:studio        # Open Drizzle Studio

# Code Quality
pnpm lint             # Prettier + ESLint check
pnpm format           # Format code with Prettier
pnpm check            # Type-check all packages

# UI Components (shadcn-svelte → @aphexcms/ui)
pnpm shadcn button    # Add button component
pnpm shadcn dialog    # Add dialog component
# Components shared between cms-core & studio
```

## 🔐 Authentication

**Batteries included** with [Better Auth](https://better-auth.com):

- ✅ Session-based auth (email/password)
- ✅ API keys with rate limiting (10k requests/day)
- ✅ Multi-tenancy with organizations
- ✅ Row-Level Security (RLS)

### API Key Usage

```bash
curl http://localhost:5173/api/documents?docType=page \
  -H "x-api-key: your-api-key-here"
```

Generate keys from `/admin/settings`.

> **Bring your own auth**: Implement the `AuthProvider` interface to use Auth.js, Lucia, or custom solutions.

## 🤝 Contributing

### Code Standards

- ✅ Format before committing: `pnpm format`
- ✅ Type-check: `pnpm check`
- ✅ Use Svelte 5 runes (`$state`, `$derived`, `$effect`)
- ✅ Follow [Conventional Commits](https://www.conventionalcommits.org/)

### Adding Features

- **Database Adapters**: Implement `DatabaseAdapter` interface in a new package + AuthProvider
- **Storage Adapters**: Implement `StorageAdapter` interface
- **Field Types**: Add Svelte component + TypeScript type
- **Custom API routes**: Register Hono routes/middleware through the `api(app)` config hook
- **Plugins**: A first-class plugin API is planned; today, use schemas, custom routes, adapters, and app-level Svelte components

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed extension guides.

### Reporting Issues

Include:

- OS, Node version, pnpm version
- Steps to reproduce
- Expected vs actual behavior
- Error logs (browser console + terminal)

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Deep dive into design patterns and internals
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Development guidelines and PR process

## 🎯 Roadmap

### Shipped

- [x] **CLI scaffolding** — `pnpm create aphex` / `npm create aphex@latest` (published as [`create-aphex`](https://www.npmjs.com/package/create-aphex))
- [x] **CI/CD pipeline** — `release.yml` + `sync-template.yml` + Changesets
- [x] **Unified Local/HTTP/GraphQL API** — one schema, three surfaces, Zod-validated contracts
- [x] **Auto-generated GraphQL** — queries, mutations, filters, GraphiQL
- [x] **MCP server** — Streamable HTTP endpoint with schema, validation, content, singleton, publish, and asset tools
- [x] **Draft/published workflow** — hash-based change detection + auto-save
- [x] **Version history** — rolling per-document versions with configurable `maxVersions` (`GET /api/documents/{id}/versions`)
- [x] **Multi-tenancy** — organizations with parent/child hierarchy + Postgres RLS
- [x] **Email + invitations** — Better Auth + Resend/Nodemailer adapters, Mailpit in dev
- [x] **Capability-based access control** — editable built-in roles, custom per-org roles, schema-level and field-level access rules, policy functions
- [x] **API keys** — rate-limited, per-organization, with either coarse `read`/`write` scopes or a fine-grained `capabilities` allowlist
- [x] **In-memory caching** — `InMemoryCacheAdapter` for `published` reads + API-key lookups
- [x] **Preview config** — `preview: { select: { title, subtitle } }` (with dot-paths) on document + object types; rendered in document list, array item rows, and reference picker
- [x] **Visual editing** — `previewUrl`, live preview iframe, stega encoding, click-to-edit overlay, and `@aphexcms/visual-editing`
- [x] **Rich text / block editor** — Portable Text model with TipTap editor, built-in image blocks, custom block types, inline objects, marks, and annotations
- [x] **Singletons** — schemas marked `singleton: true` expose a `SingletonCollection<T>` surface with `get`/`update`/`getSingletonId` and hide Create/Delete in admin
- [x] **PostgreSQL, PGlite, and SQLite adapters** — Docker Postgres, embedded Postgres, local `file:` SQLite, and Turso/libsql support
- [x] **Base and blog templates** — full auth/storage/email/cache setup plus a public blog/visual-editing example
- [x] **Standalone build** — `pnpm build` works without any `.env` (server modules guarded with `building` flag); `Dockerfile` + `Procfile` ship in the template for Docker / buildpack deploys
- [x] **One-line Vite config** — `aphex()` plugin bundles HMR + dayjs alias + SSR/optimizeDeps tuning so consumers don't copy boilerplate
- [x] **Fast schema HMR** — schema edits hot-swap the engine config without restarting the Vite dev server (~10× faster than restart-on-change)
- [x] **Documentation site** — [docs.getaphex.com](https://docs.getaphex.com) with LLM-friendly `llms.txt`, per-page markdown, and "Copy / Open in ChatGPT / Open in Claude" actions

### Near-term (Priority)

- [ ] **Public docs cleanup** — keep README, docs site, templates, and package exports aligned with shipped capabilities
- [ ] **Polish admin UI** — improve empty states, settings flows, onboarding, global navigation, and rough edges
- [ ] **Audit log** — append-only actor/action/resource log with admin UI for compliance and client handoff
- [ ] **Command palette** — global `Cmd+K` for document search, creation, settings, media, org switching, and common actions
- [ ] **Plugin/module API** — Sanity-style build-time plugin registration with a declarative permission manifest
- [ ] **Image transforms** — on-the-fly resize / format / crop (see [`TODO-image-transforms.md`](./TODO-image-transforms.md))
- [ ] **Contributor docs expansion** — adapter authoring guides, field type authoring guide, plugin/module authoring guide

### Mid-term

- [ ] **Template library** — more starters beyond `base` and `blog`, including premium vertical templates
- [ ] **Migration tools** — import/export utilities for content portability between instances
- [ ] **Webhook system** — event-driven integrations on publish / unpublish / delete
- [ ] **Scheduled publishing** — publish-at / unpublish-at timestamps
- [ ] **Media library enhancements** — folders, tags, bulk actions
- [ ] **Redis-backed cache adapter** — drop-in replacement for `InMemoryCacheAdapter`
- [ ] **Advanced field types** — code editor, color picker, geopoint
- [ ] **Schema-plane MCP tools** — validated schema creation/update helpers that write schema files and run type generation in dev

### Long-term

- [ ] **Business modules** — first-party CRM, customers, people/staff, products/services, bookings/calendar, payments, reviews, and forms
- [ ] **Automation engine** — event triggers, conditions, actions, retries, logs, and workflow history
- [ ] **Capability toggles** — enable native modules without plugin installation or compatibility drift
- [ ] **Localization (i18n) support** — multi-language content with field-level or document-level translation
- [ ] **Real-time collaboration** — multiplayer editing with presence awareness
- [ ] **Approval workflows** — review → approve → publish with role gating
- [ ] **Monitoring & observability** — built-in analytics, slow-query tracking, audit log UI
- [ ] **MySQL adapter** — additional first-party `DatabaseAdapter` implementation

## 🙏 Acknowledgments

Inspired by [Sanity.io](https://sanity.io) • Built with [SvelteKit](https://kit.svelte.dev), [Drizzle ORM](https://orm.drizzle.team), [Better Auth](https://better-auth.com), and [shadcn-svelte](https://shadcn-svelte.com)

---

<div align="center">
  <strong>Questions?</strong> Open an <a href="https://github.com/IcelandicIcecream/aphex/issues">issue</a> or start a <a href="https://github.com/IcelandicIcecream/aphex/discussions">discussion</a>
</div>
