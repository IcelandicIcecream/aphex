# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AphexCMS is a custom Content Management System built with SvelteKit 5, following a **monorepo architecture** with a **portable, upgradable core package** (`@aphex/cms-core`). The system uses Drizzle ORM, PostgreSQL, Tailwind CSS v4, and follows clean **ports and adapters architecture** for database and storage agnosticism.

## Repository Structure

This project uses **Turborepo** with **pnpm workspaces** for monorepo management:

```
aphex/
├── turbo.json              # Turborepo build configuration
├── pnpm-workspace.yaml     # PNPM workspace configuration
├── aphex.config.ts         # CMS configuration file
├── apps/
│   └── studio/             # @aphex/studio - Main CMS application
│       ├── src/
│       │   ├── lib/
│       │   │   ├── schemaTypes/    # Content schemas (app-defined)
│       │   │   ├── server/db/      # App database connection with pooling
│       │   │   │   ├── auth-schema.ts  # Better Auth tables (user, session, apikey)
│       │   │   │   └── schema.ts       # CMS tables (documents, assets)
│       │   │   ├── server/auth/    # Better Auth configuration with API keys
│       │   │   └── api/            # API client wrapper (app-specific)
│       │   ├── routes/
│       │   │   ├── api/            # Re-exports package route handlers
│       │   │   └── (protected)/admin/  # App-specific admin layout/pages
│       │   └── app.css             # App styles (imports shared theme)
│       ├── static/
│       ├── svelte.config.js        # Includes @lib alias for shared UI
│       ├── vite.config.ts          # SSR noExternal config
│       └── hooks.server.ts         # App initialization (imports aphex.config.ts)
│
└── packages/
    ├── ui/                 # @aphex/ui - Shared shadcn-svelte components
    │   ├── src/
    │   │   ├── lib/
    │   │   │   ├── components/ui/  # shadcn-svelte components
    │   │   │   └── utils.ts        # cn() utility, tailwind-variants
    │   │   └── app.css             # Shared Tailwind theme (CSS variables)
    │   ├── components.json         # shadcn-svelte config (uses @lib alias)
    │   └── package.json            # Exports: ./shadcn/*, ./utils, ./shadcn/css
    │
    ├── cms-core/           # @aphex/cms-core - Database-agnostic CMS package
    │   ├── src/
    │   │   ├── client/     # Client-safe exports (components, validation)
    │   │   ├── server/     # Server-only exports (interfaces, hooks, routes)
    │   │   ├── components/ # Admin UI components (DocumentEditor, fields)
    │   │   ├── db/         # Database interfaces & provider registry (NO DB DEPS)
    │   │   ├── storage/    # Storage adapters (local, S3, GCS)
    │   │   ├── routes/     # API route handlers (re-exportable)
    │   │   ├── services/   # Business logic (AssetService)
    │   │   └── types.ts    # Shared TypeScript types
    │   └── package.json    # Package config with peer dependencies (NO Drizzle)
    │
    └── postgresql-adapter/ # @aphex/postgresql-adapter - PostgreSQL implementation
        ├── src/
        │   ├── schema.ts         # Drizzle schema (documents, assets, schema_types)
        │   ├── document-adapter.ts  # PostgreSQL document operations
        │   ├── asset-adapter.ts     # PostgreSQL asset operations
        │   └── index.ts          # PostgreSQLAdapter & Provider
        └── package.json          # Exports: . (adapter), ./schema (migrations)
```

## Development Commands

```bash
# Development (Turborepo)
pnpm dev              # Run dev for all packages (turbo dev)
                      # - Runs cms-core in watch mode (svelte-package -w)
                      # - Runs studio dev server concurrently
pnpm build            # Build all packages (turbo build)
pnpm preview          # Preview production build

# Shadcn Components (Root)
pnpm shadcn <component>   # Install shadcn component to packages/ui
                          # e.g., pnpm shadcn button card

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
   - **App**: UI library, schemas, auth configuration, initialization, environment config

### Database Layer (Ports & Adapters)

**Core Package Layer** (`packages/cms-core/src/db/`):

- **Interfaces**: `db/interfaces/` - `DocumentAdapter`, `AssetAdapter`, `DatabaseAdapter`, `DatabaseConfig`
- **Providers**: `db/providers/database.ts` - Provider registry and factory for creating adapters
  - `DatabaseProviderRegistry` - Manages available database providers
  - `registerDatabaseProvider(provider)` - Register a database provider
  - `createDatabaseAdapter(providerName, config)` - Factory function that uses registry
  - **No database dependencies** - cms-core is truly database-agnostic

**PostgreSQL Adapter Package** (`packages/postgresql-adapter/`):

- **Schema**: `src/schema.ts` - Drizzle schema (documents, assets, schema_types)
- **Adapters**: `src/document-adapter.ts`, `src/asset-adapter.ts` - PostgreSQL implementations
- **Provider**: `PostgreSQLProvider` - Implements `DatabaseProvider` interface
- **Exports**: Main export for adapter, `/schema` subpath for migrations
- **Separate package**: Apps install `@aphex/postgresql-adapter` alongside `@aphex/cms-core`

**App Layer** (`apps/studio/src/lib/server/db/`):

- **Schema**: `schema.ts` - Combines CMS schema (from adapter) with auth schema
- **Configuration**: Connection string, pool size, timeouts (environment-specific)
- **Provider Registration**: `hooks.server.ts` registers database provider before CMS initialization

**Key Features**:

- **Provider Registry Pattern**: Extensible database support via provider registration
- **Zero Database Dependencies in Core**: Apps choose which database adapter to install
- **Separate Schema Export**: `/schema` subpath for drizzle-kit compatibility
- **Consistent Configuration**: `CMSConfig.database.options` maps to `DatabaseConfig.options`
- Hash-based versioning with `publishedHash` for change detection
- PostgreSQL enums: `document_status`, `schema_type`
- JSONB fields for flexible document storage (Sanity-compatible)
- Separated document/asset adapters for extensibility

### Storage Layer (Ports & Adapters)

**Package Layer** (`packages/cms-core/src/storage/`):

- **Interfaces**: `storage/interfaces/storage.ts` - `StorageAdapter`, `StorageConfig`, `StorageProvider`
- **Adapters**: `storage/adapters/` - `LocalStorageAdapter` (S3, GCS extensible)
- **Providers**: `storage/providers/storage.ts` - Provider registry and factory for creating adapters
  - `StorageProviderRegistry` - Manages available storage providers
  - `createStorageAdapter(providerName, config)` - Factory function that uses registry
  - `LocalStorageProvider` - Built-in local file system provider
- **Services**: `services/asset-service.ts` - Orchestrates storage + database

**Key Features**:

- **Provider Registry Pattern**: Extensible storage support via provider registration
- **Consistent Configuration**: `CMSConfig.storage.options` maps to `StorageConfig.options`
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
- **Imports**: All admin components use `@aphex/ui/shadcn/*` for UI components

**Shared UI Package** (`packages/ui/`):

- shadcn-svelte components installed via CLI
- Exported as `@aphex/ui/shadcn/*` (e.g., `@aphex/ui/shadcn/button`)
- Uses `@lib` alias (not `$lib`) for cross-package compatibility
- Shared Tailwind theme with CSS variables
- Utilities: `cn()` from `@aphex/ui/utils`

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
- Better Auth routes: `/api/auth/*` - handled by Better Auth
- Settings routes: `/api/settings/api-keys` - API key management

### Schema System

**App-Defined Schemas** (`src/lib/schemaTypes/`):

- Schemas live in the **app layer** (project-specific content models)
- Use `defineType()` from package for type safety
- Auto-loaded via `index.ts` export
- Passed to `createCMSConfig()` in `hooks.server.ts`

**Package Schema Utilities** (`packages/cms-core/src/schema-utils/`):

- `defineType()` - Type-safe schema definition helper
- Validation, cleanup, and schema processing utilities

### Authentication & API Keys

**Batteries-Included Auth System** (`apps/studio/src/lib/server/auth/`):

- **Better Auth** with Drizzle adapter and API Key plugin
- Session-based authentication (email/password)
- API Key support with rate limiting and permissions
- User profile sync with CMS

**Auth Schema** (`apps/studio/src/lib/server/db/auth-schema.ts`):

```typescript
export const user = pgTable('user', {
	/* ... */
});
export const session = pgTable('session', {
	/* ... */
});
export const apikey = pgTable('apikey', {
	id: text('id').primaryKey(),
	name: text('name'),
	key: text('key').notNull(),
	userId: text('user_id').references(() => user.id),
	rateLimitEnabled: boolean('rate_limit_enabled').default(true),
	rateLimitMax: integer('rate_limit_max').default(10000),
	permissions: text('permissions')
	// ... other fields
});
```

**Auth Configuration** (`apps/studio/src/lib/server/auth/index.ts`):

```typescript
export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true },
	plugins: [
		apiKey({
			apiKeyHeaders: ['x-api-key'],
			rateLimit: {
				enabled: true,
				timeWindow: 1000 * 60 * 60 * 24, // 1 day
				maxRequests: 10000
			}
		})
	]
});
```

**API Key Usage**:

- Generate keys from `/admin/settings`
- Pass via `x-api-key` header
- Rate limiting: 10,000 requests/day (configurable)
- Permission-based access control

### Initialization & Hooks

**App Configuration** (`aphex.config.ts`):

```typescript
import { createCMSConfig } from '@aphex/cms-core/server';
import { createPostgreSQLProvider } from '@aphex/postgresql-adapter';
import * as schemas from './src/lib/schemaTypes';
import { client } from './src/lib/server/db';

export default createCMSConfig({
	schemas,
	// Type-safe database provider with adapter-specific options
	database: createPostgreSQLProvider({
		client // Pre-initialized postgres client (recommended for connection pooling)
		// OR use connectionString:
		// connectionString: DATABASE_URL,
		// options: {
		//   max: 10, // Max connections in pool
		//   idle_timeout: 20, // Close idle connections after 20s
		//   connect_timeout: 10 // Connection timeout
		// }
	}),
	storage: {
		adapter: 'local',
		basePath: './static/uploads',
		baseUrl: '/uploads',
		options: {
			maxFileSize: 10 * 1024 * 1024 // 10MB
		}
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

// Database provider is configured in aphex.config.ts
const aphexHook = createCMSHook(cmsConfig);
export const handle = sequence(aphexHook, ...otherHooks);
```

**Package Hook** (`packages/cms-core/src/hooks.ts`):

- Creates singleton adapter instances at app startup using provider registry
- Factory functions: `createDocumentRepositoryInstance()`, `createAssetServiceInstance()`, `createStorageAdapterInstance()`, `createDatabaseAdapterInstance()`
- All imports at top (no dynamic imports in factory functions)
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
	max: 10, // Maximum connections in pool
	idle_timeout: 20, // Close idle connections after 20s
	connect_timeout: 10 // Connection timeout in seconds
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
- Database and storage **interfaces** (not implementations)
- Provider registry for database and storage adapters
- Admin UI components (DocumentEditor, field components)
- API route handlers (re-exportable)
- Validation system (Rule class, field validation)
- Type definitions and interfaces
- Schema definition utilities (`defineType`)
- Content hashing utilities

❌ **Should NOT Include**:

- Database implementations (Drizzle, MongoDB, etc.) - separate adapter packages
- Database dependencies (drizzle-orm, postgres, etc.) - zero database dependencies
- UI component library (Button, Input, Dialog) - app choice
- Content schemas - app-specific
- Authentication implementation - app-specific
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
- Authentication configuration (Better Auth with API keys)
- API route re-exports
- App-specific layouts and pages

## Ports and Adapters Compliance

### Database Adapters

**Interface-Driven Design with Separate Packages**:

Database adapters are **separate packages** that implement CMS interfaces and provide type-safe configuration. This keeps `@aphex/cms-core` database-agnostic with zero database dependencies.

1. **Create separate adapter package** (e.g., `packages/mongodb-adapter/`)
2. **Define adapter-specific config interface** (e.g., `MongoDBConfig`)
3. **Implement interfaces** from `@aphex/cms-core/server`: `DocumentAdapter`, `AssetAdapter`, `DatabaseAdapter`
4. **Create provider** that implements `DatabaseProvider`
5. **Export factory function** that takes typed config and returns provider
6. **Apps install and use** the adapter with type-safe config

**Example: Adding MongoDB Adapter**:

```typescript
// packages/mongodb-adapter/src/index.ts
import type { DatabaseAdapter, DatabaseProvider } from '@aphex/cms-core/server';
import { MongoClient } from 'mongodb';

// Step 1: Define adapter-specific config interface
export interface MongoDBConfig {
	connectionString: string;
	options?: {
		maxPoolSize?: number;
		minPoolSize?: number;
		[key: string]: any;
	};
}

// Step 2: Implement DatabaseAdapter
export class MongoDBAdapter implements DatabaseAdapter {
	private client: MongoClient;

	constructor(client: MongoClient) {
		this.client = client;
	}

	async findMany(filters) {
		/* implementation */
	}
	async isHealthy() {
		/* implementation */
	}
	// ... all required methods
}

// Step 3: Implement DatabaseProvider (stores config internally)
class MongoDBProvider implements DatabaseProvider {
	name = 'mongodb';
	private config: MongoDBConfig;

	constructor(config: MongoDBConfig) {
		this.config = config;
	}

	createAdapter(): DatabaseAdapter {
		const client = new MongoClient(this.config.connectionString, this.config.options);
		return new MongoDBAdapter(client);
	}
}

// Step 4: Export factory function with type-safe config
export function createMongoDBProvider(config: MongoDBConfig): DatabaseProvider {
	return new MongoDBProvider(config);
}

// apps/studio/aphex.config.ts - Use with type-safe config!
import { createMongoDBProvider } from '@aphex/mongodb-adapter';

export default createCMSConfig({
	schemas,
	database: createMongoDBProvider({
		connectionString: 'mongodb://localhost:27017/aphexcms',
		options: { maxPoolSize: 10 } // TypeScript knows these options!
	})
});
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
	async store(data: UploadFileData) {
		/* S3 upload */
	}
	async delete(path: string) {
		/* S3 delete */
	}
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

**Database Adapters** (separate packages):

1. Create new package in `packages/{database}-adapter/`
2. Add `@aphex/cms-core` as peer dependency
3. Define adapter-specific config interface (e.g., `MongoDBConfig`)
4. Implement `DocumentAdapter`, `AssetAdapter`, `DatabaseAdapter` from `@aphex/cms-core/server`
5. Create `DatabaseProvider` implementation that stores config
6. Export factory function that takes typed config: `createXProvider(config): DatabaseProvider`
7. Apps install package and use in `aphex.config.ts` with type-safe config
8. Document in CLAUDE.md

**Key Pattern**: Provider is configured once via factory, then `createAdapter()` takes no parameters.

**Storage Adapters** (can be in cms-core or separate packages):

1. Create interface in `packages/cms-core/src/storage/interfaces/` (if new)
2. Implement adapter in `packages/cms-core/src/storage/adapters/{name}/`
3. Register provider in `packages/cms-core/src/storage/providers/`
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
