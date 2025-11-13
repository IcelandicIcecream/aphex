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

> ⚠️ **Early Development**: Expect breaking changes and incomplete features. Not recommended for production use yet.

## ✨ Features

- 🎨 **Sanity-inspired UI** - Responsive 3-panel admin interface
- 🔌 **Database Agnostic** - PostgreSQL included, MongoDB/SQLite via adapters
- ☁️ **Storage Flexible** - Local filesystem or S3-compatible (R2, AWS S3, MinIO)
- 🔐 **Auth Agnostic** - Bring your own auth (Better Auth included by default)
- 📝 **Type-Safe Schemas** - Define content models with full TypeScript support
- ✅ **Real-time Validation** - Field-level validation with Sanity-style fluent API
- 🔄 **Auto-Save** - Never lose work with smart draft management
- 📦 **Hash-Based Publishing** - Sanity-style change detection with future versioning support
- 🏢 **Multi-Tenancy** - Built-in organization support with Row-Level Security
- 🔑 **API Keys** - Programmatic access with rate limiting
- 🚀 **GraphQL Plugin** - Auto-generated GraphQL API from your schemas
- 📚 **Reference Resolution** - Nested depth control with circular protection

## 📦 Packages

| Package                        | Description                                                         |
| ------------------------------ | ------------------------------------------------------------------- |
| `@aphexcms/cms-core`           | Database-agnostic core engine with admin UI and API handlers        |
| `@aphexcms/postgresql-adapter` | PostgreSQL implementation with Drizzle ORM                          |
| `@aphexcms/storage-s3`         | S3-compatible storage (R2, AWS S3, MinIO, etc.)                     |
| `@aphexcms/graphql-plugin`     | Auto-generated GraphQL API from schemas                             |
| `@aphexcms/ui`                 | Shared [shadcn-svelte](https://shadcn-svelte.com) component library |
| `@aphexcms/studio`             | Reference implementation app                                        |
| `create-aphex`                 | CLI tool for scaffolding new Aphex CMS projects                     |

> 💡 **Architecture deep-dive**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design patterns and internals.
>
> 💡 **Adding UI components**: Run `pnpm shadcn <component-name>` to add shadcn-svelte components to `@aphexcms/ui`

## 🚀 Quick Start

### Using the CLI (Recommended)

The fastest way to get started is using the `create-aphex` CLI:

```bash
npx create-aphex
# or
pnpm create aphex
# or
npm create aphex
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

🎉 **Admin UI**: http://localhost:5173/admin

### Manual Installation (Development)

If you want to contribute to Aphex or work with the monorepo:

```bash
# Clone and install
git clone https://github.com/IcelandicIcecream/aphex.git
cd aphex
pnpm install

# Configure environment
cd apps/studio
cp .env.example .env
# Default values work for local development
cd ../..

# Start database and migrate
pnpm db:start
pnpm db:migrate

# Start dev server
pnpm dev
```

🎉 **Admin UI**: http://localhost:5173/admin

### Storage Configuration (Optional)

By default, uses **local filesystem**. For cloud storage:

```bash
pnpm add @aphexcms/storage-s3
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

**Available field types**: `string`, `text`, `number`, `boolean`, `slug`, `image`, `array`, `object`, `reference`

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

```typescript
// Install plugin
import { createGraphQLPlugin } from '@aphexcms/graphql-plugin';

export default createCMSConfig({
	plugins: [
		createGraphQLPlugin({
			endpoint: '/api/graphql',
			enableGraphiQL: true
		})
	]
});
```

Visit `/api/graphql` for GraphiQL interface with auto-generated schema.

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
- **Plugins**: Implement `CMSPlugin` interface

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

### Near-term (Priority)
1. [ ] **Unified API layer** - Single interface for local dev, HTTP, and GraphQL APIs
2. [ ] **Polish admin UI** - Fix half-baked implementations (see [issues](https://github.com/IcelandicIcecream/aphex/issues))
3. [ ] **Template library** - Starter templates using published npm packages (e.g., [newsletter template](https://getaphex.com))
4. [x] **CLI scaffolding** - `create-aphex` CLI for project scaffolding ✅
5. [ ] **Documentation** - Comprehensive guides, API docs, and tutorials
6. [ ] **CI/CD pipeline** - Automated builds, tests, and npm package publishing

### Mid-term
- [ ] **Plugin ecosystem** - Documentation and tooling for third-party plugin development
- [ ] **Migration tools** - Import/export utilities for content portability
- [ ] **Performance optimization** - Query caching, lazy loading, bundle size reduction
- [ ] **Webhook system** - Event-driven integrations for content lifecycle events
- [ ] **Advanced field types** - Rich text editor (TipTap), code editor, date/time pickers

### Long-term
- [ ] **Version history with rollback** - Time-travel content management
- [ ] **Content preview system** - Live preview before publishing
- [ ] **Localization (i18n) support** - Multi-language content management
- [ ] **Real-time collaboration** - Multiplayer editing with presence awareness
- [ ] **Advanced workflows** - Approval processes, scheduled publishing
- [ ] **Media library enhancements** - Folders, tags, image optimization, CDN integration
- [ ] **Monitoring & observability** - Built-in analytics and performance tracking

## 🙏 Acknowledgments

Inspired by [Sanity.io](https://sanity.io) • Built with [SvelteKit](https://kit.svelte.dev), [Drizzle ORM](https://orm.drizzle.team), [Better Auth](https://better-auth.com), and [shadcn-svelte](https://shadcn-svelte.com)

---

<div align="center">
  <strong>Questions?</strong> Open an <a href="https://github.com/IcelandicIcecream/aphex/issues">issue</a> or start a <a href="https://github.com/IcelandicIcecream/aphex/discussions">discussion</a>
</div>
