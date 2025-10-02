<div align="center">
  <img src="./apps/studio/static/images/aphex-darkmode.png" alt="AphexCMS Logo" width="80" />
  <h1>AphexCMS</h1>
</div>

A modern, extensible Content Management System built with **SvelteKit 5**, featuring a **portable core package**, **database/storage agnostic adapters**, and a **Sanity-inspired admin interface**.

## 🎯 Project Philosophy

AphexCMS follows a **monorepo architecture** with clear separation between framework-agnostic CMS logic (`@aphex/cms-core`) and application-specific concerns (auth, database connections, schemas). This design enables:

- **Easy upgrades**: Core CMS logic is packaged, allowing version bumps without breaking your app
- **Database agnostic**: PostgreSQL adapter included, MongoDB/SQLite/etc. can be added via ports & adapters pattern
- **Storage agnostic**: Local filesystem included, S3/GCS/etc. extensible
- **Auth flexibility**: Authentication handled in app layer - integrate any auth solution (Lucia, Auth.js, custom)
- **Type-safe schemas**: Define content models with full TypeScript support
- **Real-time validation**: Field-level validation with custom rules
- **Nested reference editing**: Sanity-style modal-based editing for complex content structures

## 📦 Packages

### `@aphex/cms-core` - Core CMS Package
Portable, framework-agnostic CMS logic:
- Database adapters (PostgreSQL, extensible to others)
- Storage adapters (Local filesystem, extensible to S3/GCS)
- Admin UI components (DocumentEditor, field types, validation)
- API route handlers (re-exportable in your app)
- Reference resolution with depth control
- Hash-based publish/draft workflow

### `@aphex/ui` - Shared UI Components
shadcn-svelte component library:
- Pre-configured shadcn components
- Shared Tailwind theme with CSS variables
- Cross-package compatible (`@lib` alias)
- Utilities: `cn()`, tailwind-variants

### `@aphex/studio` - Example Application
Reference implementation showing how to use the CMS:
- Content schemas (pages, catalogs, etc.)
- Database connection with pooling
- API route re-exports
- Auth implementation (custom session-based)
- Admin interface at `/admin`

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (recommended: use `nvm`)
- pnpm 9.0+ (package manager)
- Docker Desktop (includes Docker Compose on macOS/Windows)
  - **Linux users**: Install Docker Engine + Docker Compose plugin separately

### Installation

```bash
# Clone the repository
git clone https://github.com/IcelandicIcecream/aphex.git
cd tcr-cms

# Install dependencies
pnpm install

# Set up environment variables
cd apps/studio
cp .env.example .env
# Edit .env with your configuration (default values work for local development)
cd ../..

# Start PostgreSQL database
pnpm db:start

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

The admin interface will be available at `http://localhost:5173/admin`

### Database Setup (Detailed)

```bash
# 1. Start PostgreSQL container
pnpm db:start
# This runs: docker-compose up -d
# Default: postgres://postgres:password@localhost:5432/aphexcms

# 2. Push schema to database (development)
pnpm db:push
# Or generate migrations (production)
pnpm db:generate
pnpm db:migrate

# 3. (Optional) Open Drizzle Studio to view data
pnpm db:studio
```

## 🏗️ Architecture

### Monorepo Structure

```
aphex/
├── apps/
│   └── studio/              # Example app (@aphex/studio)
│       ├── src/
│       │   ├── lib/
│       │   │   ├── schemaTypes/    # Content schemas (YOUR MODELS)
│       │   │   ├── server/db/      # Database connection (YOUR CONFIG)
│       │   │   └── api/            # API client wrapper
│       │   ├── routes/
│       │   │   ├── api/            # Re-exports CMS handlers
│       │   │   │   ├── documents/+server.ts    # export { GET, POST } from '@aphex/cms-core/server'
│       │   │   │   └── schemas/[type]/+server.ts # Uses YOUR schemaTypes
│       │   │   └── (protected)/admin/  # Admin UI pages
│       │   └── hooks.server.ts     # Initialize CMS
│       └── aphex.config.ts         # CMS configuration
│
└── packages/
    ├── cms-core/            # @aphex/cms-core (THE PORTABLE CORE)
    │   ├── src/
    │   │   ├── components/  # Admin UI components
    │   │   ├── db/          # Database adapters & interfaces
    │   │   ├── storage/     # Storage adapters & interfaces
    │   │   ├── routes/      # API handlers (re-exportable)
    │   │   ├── services/    # Business logic
    │   │   └── types.ts     # Shared types
    │   └── package.json     # Exports: . (client), ./server
    │
    └── ui/                  # @aphex/ui (SHARED COMPONENTS)
        ├── src/lib/components/ui/  # shadcn components
        └── app.css          # Shared Tailwind theme
```

### Key Architecture Patterns

#### 1. Ports & Adapters (Database/Storage)

**Interfaces define contracts**, adapters implement them:

```typescript
// packages/cms-core/src/db/interfaces/document.ts
export interface DocumentAdapter {
  findMany(filters?: DocumentFilters): Promise<Document[]>;
  findById(id: string, depth?: number): Promise<Document | null>;
  create(data: CreateDocumentData): Promise<Document>;
  // ...
}

// packages/cms-core/src/db/adapters/postgresql/document-adapter.ts
export class PostgreSQLDocumentAdapter implements DocumentAdapter {
  // Implementation for PostgreSQL
}

// Want MongoDB? Create MongoDBDocumentAdapter implementing the same interface!
```

#### 2. App-Layer Initialization

**Package never manages global state**. Apps initialize via hooks:

```typescript
// apps/studio/src/hooks.server.ts
import { createCMSHook } from '@aphex/cms-core/server';
import cmsConfig from '../aphex.config';

const aphexHook = createCMSHook(cmsConfig);
export const handle = sequence(aphexHook, yourAuthHook);
```

#### 3. Route Handler Re-exports

**Most routes simply re-export package handlers**:

```typescript
// apps/studio/src/routes/api/documents/+server.ts
export { GET, POST } from '@aphex/cms-core/server';
```

**Exception: Routes needing app-specific data** (like schemas):

```typescript
// apps/studio/src/routes/api/schemas/[type]/+server.ts
import { createSchemaByTypeHandler } from '@aphex/cms-core/server';
import { schemaTypes } from '$lib/schemaTypes/index.js';

export const GET = createSchemaByTypeHandler(schemaTypes);
```

#### 4. Schema Definition (App Layer)

Content models live in **your app**, not the package:

```typescript
// apps/studio/src/lib/schemaTypes/page.ts
import { defineType } from '@aphex/cms-core';

export default defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Title',
      validation: (Rule) => Rule.required()
    },
    {
      name: 'slug',
      type: 'slug',
      title: 'Slug',
      options: { source: 'title' }
    },
    {
      name: 'content',
      type: 'array',
      title: 'Content',
      of: [
        { type: 'hero' },
        { type: 'catalogBlock' }
      ]
    }
  ]
});
```

## 🔑 Core Dependencies

- **SvelteKit 5** - Framework (Svelte 5 runes, no virtual DOM)
- **Drizzle ORM** - Type-safe SQL with PostgreSQL
- **Turborepo** - Monorepo build orchestration
- **pnpm workspaces** - Package management
- **Tailwind CSS v4** - Styling (CSS-first config)
- **shadcn-svelte** - UI component primitives
- **postgres.js** - PostgreSQL client with connection pooling
- **Sharp** - Image processing for asset metadata

## 📚 Key Features

### Nested Reference Resolution with Depth Control

Resolve nested document references with the `depth` query parameter:

```bash
# No resolution (default) - references are just IDs
GET /api/documents?docType=page

# Depth 1 - resolve first-level references
GET /api/documents/123?depth=1

# Depth 2 - resolve references within references
GET /api/documents/123?depth=2

# Max depth 5 (clamped for performance)
GET /api/documents/123?depth=10  # Treated as depth=5
```

**Circular reference protection**: Visited documents are tracked to prevent infinite loops.

### Hash-Based Publishing

Documents use content hashing to detect changes:
- **Draft** state: Work in progress, not public
- **Publish**: Hash calculated, only published if content changed
- **Change detection**: `hasChanges` flag shows draft differs from published

### Mobile-First Admin Interface

- Responsive Sanity-style 3-panel layout
- Desktop: Side-by-side panels (types → documents → editor)
- Mobile: Stack navigation with breadcrumbs
- Nested reference editing with modal overlays
- Real-time validation with visual feedback

### Field Types

Included field types:
- `string`, `text` (textarea), `number`, `boolean`
- `slug` (auto-generate from source field)
- `image` (with asset upload & metadata)
- `array` (flexible list with multiple types)
- `object` (nested structures)
- `reference` (link to other documents)

Extend with custom field components!

## 🛠️ Development Commands

```bash
# Development
pnpm dev              # Start all packages in watch mode
pnpm dev:studio       # Start studio app only
pnpm dev:package      # Start cms-core package only

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

# UI Components
pnpm shadcn button    # Add shadcn component to packages/ui
```

## 🔐 Authentication & API Keys

AphexCMS comes **batteries-included** with a complete authentication system powered by **Better Auth**:

### Features
- ✅ **Session-based authentication**: Email/password login with secure sessions
- ✅ **API Key support**: Programmatic access with rate limiting and permissions
  - Generate API keys from `/admin/settings`
  - Use `x-api-key` header for API requests
  - Rate limiting: 10,000 requests per day (configurable)
  - Permission-based access control (read/write)
- ✅ **User management**: Built-in registration, login, logout flows
- ✅ **Profile integration**: Automatic CMS user profile creation on signup
- ✅ **Rate limiting**: Per-key rate limits with configurable time windows

### API Key Usage

```bash
# Create document with API key
curl -X POST http://localhost:5173/api/documents \
  -H "x-api-key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"type": "page", "draftData": {"title": "New Page"}}'

# List documents with API key
curl http://localhost:5173/api/documents?docType=page \
  -H "x-api-key: your-api-key-here"
```

### Authentication Setup

The auth system is configured in `apps/studio/src/lib/server/auth/index.ts` using Better Auth with:
- **Drizzle adapter** for PostgreSQL
- **API Key plugin** with rate limiting
- **User profile sync hooks** for CMS integration

No additional setup required - it works out of the box!

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Code Style

- **Format before committing**: `pnpm format`
- **Type-check**: `pnpm check`
- **Lint**: `pnpm lint`
- Use **Svelte 5 runes** (`$state`, `$derived`, `$effect`)
- Follow **ports & adapters** pattern for new adapters

### Adding a New Database Adapter

1. Create interface implementation:
```typescript
// packages/cms-core/src/db/adapters/mongodb/document-adapter.ts
import type { DocumentAdapter } from '../../interfaces/document.js';

export class MongoDBDocumentAdapter implements DocumentAdapter {
  async findMany(filters) { /* implementation */ }
  async findById(id, depth) { /* implementation */ }
  // ... implement all interface methods
}
```

2. Create factory function:
```typescript
// packages/cms-core/src/db/adapters/mongodb/index.ts
export function createMongoDBAdapter(connectionString: string) {
  return new MongoDBDocumentAdapter(connectionString);
}
```

3. Export from package:
```typescript
// packages/cms-core/src/server/index.ts
export { createMongoDBAdapter } from '../db/adapters/mongodb/index.js';
```

4. Document usage in `CLAUDE.md`

### Adding a New Storage Adapter

Follow the same pattern as database adapters, implementing `StorageAdapter` interface:

```typescript
// packages/cms-core/src/storage/interfaces/storage.ts
export interface StorageAdapter {
  store(data: UploadFileData): Promise<StorageResult>;
  delete(path: string): Promise<boolean>;
  getUrl(path: string): string;
}
```

### Adding a New Field Type

1. Create field component:
```typescript
// packages/cms-core/src/components/admin/fields/YourField.svelte
<script lang="ts">
  interface Props {
    field: YourFieldType;
    value: any;
    onUpdate: (value: any) => void;
  }
  let { field, value, onUpdate }: Props = $props();
</script>

<!-- Your field UI -->
```

2. Add type to schema:
```typescript
// packages/cms-core/src/types.ts
export type FieldType = 'string' | 'number' | ... | 'yourFieldType';

export interface YourField extends BaseField {
  type: 'yourFieldType';
  options?: YourFieldOptions;
}
```

3. Update `SchemaField.svelte` to render your field type

### Pull Request Guidelines

1. **Branch naming**: `feature/your-feature` or `fix/bug-description`
2. **Commits**: Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)
3. **Testing**: Ensure `pnpm build` and `pnpm check` pass
4. **Documentation**: Update README or CLAUDE.md if adding features
5. **Scope**: Keep PRs focused - one feature/fix per PR

### Reporting Issues

When reporting bugs, include:
- **Environment**: OS, Node version, pnpm version
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Error logs** (check browser console and terminal)

## 📄 License

[Your license here]

## 🙏 Acknowledgments

Inspired by [Sanity.io](https://sanity.io) - we love their DX but wanted more control and portability.

Built with:
- [SvelteKit](https://kit.svelte.dev) - The best full-stack framework
- [Drizzle ORM](https://orm.drizzle.team) - Type-safe SQL that feels like code
- [shadcn-svelte](https://shadcn-svelte.com) - Beautiful, accessible components
- [Turborepo](https://turbo.build) - Fast monorepo builds

---

**Questions?** Check `CLAUDE.md` for detailed architecture docs, or open an issue!
