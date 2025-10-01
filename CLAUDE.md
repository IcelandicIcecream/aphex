# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TCR-CMS is a custom Content Management System built with SvelteKit 5, following a **monorepo architecture** with a **portable, upgradable core package** (`@aphex/cms-core`). The system uses Drizzle ORM, PostgreSQL, Tailwind CSS v4, and follows clean **ports and adapters architecture** for database and storage agnosticism.

## Repository Structure

```
tcr-cms/
├── aphex.config.ts         # CMS configuration file
├── packages/
│   └── cms-core/           # @aphex/cms-core - Portable CMS package
│       ├── src/
│       │   ├── client/     # Client-safe exports (components, validation)
│       │   ├── server/     # Server-only exports (adapters, hooks, routes)
│       │   ├── components/ # Admin UI components (DocumentEditor, fields)
│       │   ├── db/         # Database adapters (PostgreSQL, interfaces)
│       │   ├── storage/    # Storage adapters (local, S3, GCS)
│       │   ├── routes/     # API route handlers (re-exportable)
│       │   ├── services/   # Business logic (AssetService)
│       │   └── types.ts    # Shared TypeScript types
│       └── package.json    # Package config with peer dependencies
│
└── src/                    # Application layer (project-specific)
    ├── lib/
    │   ├── components/ui/  # App-specific UI components (shadcn/bits-ui)
    │   ├── schemaTypes/    # Content schemas (app-defined)
    │   ├── server/db/      # App database connection with pooling
    │   ├── api/            # API client wrapper (app-specific)
    │   └── graphql/        # GraphQL schema/resolvers (optional)
    ├── routes/
    │   ├── api/            # Re-exports package route handlers
    │   └── (protected)/admin/  # App-specific admin layout/pages
    └── hooks.server.ts     # App initialization (imports aphex.config.ts)
```

## Development Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm preview          # Preview production build

# Code Quality
pnpm lint             # Run Prettier and ESLint checks
pnpm format           # Format code with Prettier
pnpm check            # Type-check with svelte-check
pnpm check:watch      # Watch mode for type checking

# Database
pnpm db:start         # Start PostgreSQL with Docker Compose
pnpm db:push          # Push schema changes to database
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Drizzle Studio
```

## Architecture

### Package Design Philosophy

**`@aphex/cms-core`** is designed as an **upgradable, framework-agnostic package**:

1. **No Singletons in Package**: Package exports factories and classes, never manages global state
2. **App-Layer Initialization**: Apps initialize CMS via `createCMSHook()` in `hooks.server.ts`
3. **Connection Pooling**: Package provides defaults, apps configure for their infrastructure
4. **Ports & Adapters**: Clean interfaces for database, storage, and services
5. **Separation of Concerns**:
   - **Package**: Core CMS logic, adapters, components, route handlers
   - **App**: UI library, schemas, GraphQL, initialization, environment config

### Database Layer (Ports & Adapters)

**Package Layer** (`packages/cms-core/src/db/`):
- **Schema**: `packages/cms-core/src/db/schema.ts` - Drizzle schema (documents, assets, schema_types)
- **Interfaces**: `db/interfaces/` - `DocumentAdapter`, `AssetAdapter`, `DatabaseAdapter`
- **Adapters**: `db/adapters/postgresql/` - PostgreSQL implementation with connection pooling
- **Providers**: `db/providers/database.ts` - Factory for creating adapters

**App Layer** (`src/lib/server/db/`):
- **Connection**: `src/lib/server/db/index.ts` - Drizzle client with pooling config
- **Configuration**: Connection string, pool size, timeouts (environment-specific)

**Key Features**:
- Hash-based versioning with `publishedHash` for change detection
- PostgreSQL enums: `document_status`, `schema_type`
- JSONB fields for flexible document storage (Sanity-compatible)
- Separated document/asset adapters for extensibility

### Storage Layer (Ports & Adapters)

**Package Layer** (`packages/cms-core/src/storage/`):
- **Interfaces**: `storage/interfaces/storage.ts` - `StorageAdapter` interface
- **Adapters**: `storage/adapters/` - `LocalStorageAdapter` (S3, GCS extensible)
- **Providers**: `storage/providers/storage.ts` - Factory for creating adapters
- **Services**: `services/asset-service.ts` - Orchestrates storage + database

**Key Features**:
- Sanity-style asset architecture (assets as documents with metadata)
- Reference pattern: Image fields store asset IDs, not file paths
- Automatic metadata extraction (dimensions, EXIF, color palettes via Sharp)
- Filename preservation with duplicate handling

### Admin Interface

**Package Components** (`packages/cms-core/src/components/admin/`):
- `DocumentEditor.svelte` - Main document editor with auto-save and hash-based publishing
- `DocumentTypesList.svelte` - List view of document types
- `SchemaField.svelte` - Dynamic field renderer based on schema
- **Field Components** (`components/admin/fields/`):
  - `StringField.svelte`, `TextareaField.svelte`, `NumberField.svelte`
  - `BooleanField.svelte`, `SlugField.svelte`, `ImageField.svelte`
  - `ArrayField.svelte`, `ReferenceField.svelte`

**App Components** (`src/lib/components/ui/`):
- shadcn/bits-ui components (Button, Input, Dialog, etc.)
- App-specific layout and styling (Tailwind CSS v4)

**Admin Features**:
- Sanity Studio-style three-panel responsive layout
- Mobile-first navigation with breadcrumbs
- Auto-save, publish/draft workflow
- Hash-based change detection
- Real-time validation with Rule system
- Drag & drop image upload

### API Routes & Handlers

**Package Route Handlers** (`packages/cms-core/src/routes/`):
- `documents.ts` - GET/POST `/api/documents`
- `documents-by-id.ts` - GET/PUT/DELETE `/api/documents/:id`
- `documents-publish.ts` - POST/DELETE `/api/documents/:id/publish`
- `assets.ts` - GET/POST `/api/assets`
- `assets-by-id.ts` - GET/DELETE `/api/assets/:id`
- `schemas.ts`, `schemas-by-type.ts` - Schema metadata endpoints

**App Routes** (`src/routes/api/`):
- Re-export package handlers: `export { GET, POST } from '@aphex/cms-core/server'`
- Add app-specific routes (e.g., GraphQL endpoint)

### Schema System

**App-Defined Schemas** (`src/lib/schemaTypes/`):
- Schemas live in the **app layer** (project-specific content models)
- Use `defineType()` from package for type safety
- Auto-loaded via `index.ts` export
- Passed to `createCMSConfig()` in `hooks.server.ts`

**Package Schema Utilities** (`packages/cms-core/src/schema-utils/`):
- `defineType()` - Type-safe schema definition helper
- Validation, cleanup, and schema processing utilities

### Initialization & Hooks

**App Configuration** (`aphex.config.ts`):
```typescript
import { createCMSConfig } from '@aphex/cms-core/server';
import * as schemas from './src/lib/schemaTypes';
import { DATABASE_URL } from '$env/static/private';

export default createCMSConfig({
  schemas,
  database: {
    adapter: 'postgresql',
    connectionString: DATABASE_URL
  },
  storage: {
    adapter: 'local',
    basePath: './static/uploads',
    baseUrl: '/uploads'
  },
  customization: {
    branding: {
      title: 'Your CMS Name'
    }
  }
});
```

**App Initialization** (`src/hooks.server.ts`):
```typescript
import { createCMSHook } from '@aphex/cms-core/server';
import cmsConfig from '../aphex.config';

const aphexHook = createCMSHook(cmsConfig);
export const handle = sequence(aphexHook, ...otherHooks);
```

**Package Hook** (`packages/cms-core/src/hooks.ts`):
- Creates singleton adapter instances at app startup
- Injects services into `event.locals.aphexCMS`
- Manages adapter lifecycle (no per-request instantiation)

## Key Files and Patterns

### Core Configuration Files

**`aphex.config.ts`** (Project root):
- Central CMS configuration
- Imports schemas from `src/lib/schemaTypes/`
- Defines database and storage adapters
- Customization options (branding, theme)
- Imported by `src/hooks.server.ts` for initialization

### Package Structure

**Exports** (`packages/cms-core/package.json`):
- `.` → Client-safe exports (components, validation, types)
- `./server` → Server-only exports (adapters, hooks, route handlers)
- `./client` → Explicit client exports (same as `.`)

**Core Interfaces**:
- `db/interfaces/document.ts` - `DocumentAdapter` (CRUD, publish/unpublish)
- `db/interfaces/asset.ts` - `AssetAdapter` (asset CRUD, metadata)
- `storage/interfaces/storage.ts` - `StorageAdapter` (file operations)

**API Client** (`src/lib/api/`):
- App-specific wrapper around package APIs
- `client.ts` - Base HTTP client with error handling
- `documents.ts` - Document API methods
- `schemas.ts` - Schema metadata methods

### Connection Pooling Configuration

**Package Defaults** (`packages/cms-core/src/db/adapters/postgresql/index.ts`):
```typescript
const defaultOptions = {
  max: 10,                // Maximum connections in pool
  idle_timeout: 20,       // Close idle connections after 20s
  connect_timeout: 10     // Connection timeout in seconds
};
```

**App Override** (`src/lib/server/db/index.ts`):
```typescript
const client = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});
```

## What Belongs in Package vs App

### Package (`@aphex/cms-core`)
✅ **Should Include**:
- Core CMS logic (document/asset management)
- Database and storage adapters
- Admin UI components (DocumentEditor, field components)
- API route handlers (re-exportable)
- Validation system (Rule class, field validation)
- Type definitions and interfaces
- Schema definition utilities (`defineType`)
- Content hashing utilities

❌ **Should NOT Include**:
- UI component library (Button, Input, Dialog) - app choice
- Content schemas - app-specific
- GraphQL schema/resolvers - optional app feature
- Environment configuration - app-specific
- Database connection initialization - app manages pooling
- Singletons or global state - app manages lifecycle

### App (`src/`)
✅ **Should Include**:
- UI component library (shadcn/bits-ui)
- Content schemas (`src/lib/schemaTypes/`)
- Database connection with pooling
- Environment configuration (`.env`, `hooks.server.ts`)
- CMS initialization via `createCMSHook()`
- API route re-exports
- Optional features (GraphQL, custom routes)
- App-specific layouts and pages

## Ports and Adapters Compliance

### Database Adapters
**Interface-Driven Design**:
1. Define interface: `DocumentAdapter`, `AssetAdapter`
2. Implement adapter: `PostgreSQLAdapter`, `SQLiteAdapter`, `MongoDBAdapter`
3. Register in provider: `db/providers/database.ts`

**Adding New Database**:
```typescript
// 1. Implement interfaces
export class MongoDBAdapter implements DatabaseAdapter {
  async findMany(filters) { /* implementation */ }
  // ... other methods
}

// 2. Register provider
export function createMongoDBAdapter(connectionString: string) {
  return new MongoDBAdapter({ connectionString });
}
```

### Storage Adapters
**Interface-Driven Design**:
1. Define interface: `StorageAdapter`
2. Implement adapter: `LocalStorageAdapter`, `S3Adapter`, `GCSAdapter`
3. Register in provider: `storage/providers/storage.ts`

**Adding New Storage**:
```typescript
// 1. Implement interface
export class S3Adapter implements StorageAdapter {
  async store(data: UploadFileData) { /* S3 upload */ }
  async delete(path: string) { /* S3 delete */ }
  // ... other methods
}

// 2. Register provider
export function createS3Adapter(config: StorageConfig) {
  return new S3Adapter(config);
}
```

## Upgrading Package

When upgrading `@aphex/cms-core`:

1. **Package manages**: Core logic, adapters, components
2. **App manages**: Initialization, pooling, schemas, UI library
3. **Breaking changes**: Check adapter interfaces, hook signatures
4. **Safe upgrades**: Internal improvements, bug fixes, new adapters

**Migration Pattern**:
```bash
# Update package
pnpm add @aphex/cms-core@latest

# Check for breaking changes in:
# - createCMSHook() signature
# - Adapter interfaces (DocumentAdapter, StorageAdapter)
# - Component props (DocumentEditor, fields)

# App-specific code (schemas, UI, routes) unaffected
```

## Best Practices

### Package Development
1. **No Global State**: Export factories, not singletons
2. **Interface-First**: Define interfaces before implementations
3. **Peer Dependencies**: Let apps choose versions of SvelteKit, Drizzle
4. **Composable Exports**: Separate client/server exports
5. **Documentation**: Update CLAUDE.md when adding adapters

### App Development
1. **Connection Pooling**: Always configure max connections
2. **Environment Config**: Use `.env` for secrets, URLs
3. **Schema Organization**: Group related schemas in `schemaTypes/`
4. **UI Consistency**: Use package components for admin, app components for UI
5. **API Re-exports**: Don't duplicate route handlers, re-export from package

### Adding New Adapters
1. Create interface in `packages/cms-core/src/{db|storage}/interfaces/`
2. Implement adapter in `packages/cms-core/src/{db|storage}/adapters/{name}/`
3. Register provider in `packages/cms-core/src/{db|storage}/providers/`
4. Export from `packages/cms-core/src/server/index.ts`
5. Document in CLAUDE.md

## Open Source Contributions

The monorepo design facilitates contributions:

- **Core improvements**: Submit PRs to `packages/cms-core/`
- **New adapters**: Add to `db/adapters/` or `storage/adapters/`
- **Example apps**: Create new apps in workspace (e.g., `apps/blog/`)
- **Documentation**: Update CLAUDE.md for architectural changes

### Contribution Checklist
- [ ] Follow ports and adapters pattern
- [ ] Add TypeScript types and interfaces
- [ ] Include error handling
- [ ] Export from appropriate package entry (`./server` or `.`)
- [ ] Update CLAUDE.md with usage examples
- [ ] Run `pnpm lint` and `pnpm check`

## Testing and Quality Assurance

Always run `pnpm lint` and `pnpm check` before committing changes to ensure code quality and type safety.
