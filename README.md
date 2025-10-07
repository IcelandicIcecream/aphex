<div align="center">
  <img src="./apps/studio/static/images/aphex-darkmode.png" alt="AphexCMS Logo" width="80" />
  <br>
  <h1>AphexCMS</h1>
</div>

A modern, extensible Content Management System built with **SvelteKit V2 (Svelte 5)**, featuring a **portable core package**, **database/storage agnostic adapters**, and a **Sanity-inspired admin interface**.

<div align="center">
  <img src="./responsive-demo.gif" alt="AphexCMS Responsive Demo" width="100%" />
</div>

> ⚠️ **Early Development**: This project is in very early stages. Expect breaking changes, incomplete features, and rough edges. Not recommended for production use yet.

## 🎯 Project Philosophy

AphexCMS follows a **monorepo architecture** with clear separation between framework-agnostic CMS logic (`@aphex/cms-core`) and application-specific concerns (auth, database connections, schemas). This design enables:

- **Easy upgrades**: Core CMS logic is packaged, allowing version bumps without breaking your app
- **Database agnostic**: PostgreSQL adapter included, MongoDB/SQLite/etc. can be added via ports & adapters pattern
- **Storage agnostic**: Local filesystem and S3-compatible storage (AWS S3, Cloudflare R2, MinIO, etc.) included
- **Auth flexibility**: Authentication handled in app layer - integrate any auth solution (Lucia, Auth.js, custom)
- **Type-safe schemas**: Define content models with full TypeScript support
- **Real-time validation**: Field-level validation with custom rules
- **Nested reference editing**: Sanity-style modal-based editing for complex content structures

## 📦 Packages

### `@aphex/cms-core` - Core CMS Package

Portable, framework-agnostic CMS logic (database-agnostic, zero database dependencies):

- Database adapter interfaces and provider registry
- Storage adapters (Local filesystem)
- Admin UI components (DocumentEditor, field types, validation)
- API route handlers (re-exportable in your app)
- Reference resolution with depth control
- Hash-based publish/draft workflow

### `@aphex/postgresql-adapter` - PostgreSQL Database Adapter

PostgreSQL implementation of database interfaces:

- Document and asset CRUD operations with Drizzle ORM
- Provider registration pattern
- Connection pooling support
- Schema exports for migrations (drizzle-kit compatible)
- Re-exports universal CMS types for convenience

### `@aphex/storage-s3` - S3-Compatible Storage Adapter

Universal storage adapter for any S3-compatible service:

- **Cloudflare R2** - Zero egress fees, R2 public development URLs
- **AWS S3** - Industry standard object storage
- **MinIO** - Self-hosted S3-compatible storage
- **DigitalOcean Spaces** - Simple, scalable object storage
- **Backblaze B2** - Low-cost cloud storage
- Any other S3-compatible service

Features: Automatic buffer handling, public URL support, configurable file size/type limits

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
cd aphex

# Install dependencies (includes @aphex/postgresql-adapter)
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

> **Note on Database & Schema Setup**:
> The `studio` app's database connection is initialized in `src/lib/server/db/index.ts`. This is where the database adapter is created and exported as a singleton.
>
> The final database schema is also composed in this directory. It combines:
> *   **Core CMS Schema** (for `documents`, `assets`, etc.), which is imported from the `@aphex/postgresql-adapter`.
> *   **Auth Schema** (for `users`, `sessions`), which is provided by the "Better Auth" library's Drizzle adapter.
>
> This combined schema is used to create the single Drizzle client for the application (if needed for anything else other than auth).

### Database Setup (Detailed)

```bash
# 1. Start PostgreSQL container
pnpm db:start
# This runs: docker-compose up -d
# DATABASE_URL="postgres://root:mysecretpassword@localhost:5432/local"

# 2. Push schema to database (development)
pnpm db:push
# Or generate migrations (production)
pnpm db:generate
pnpm db:migrate

# 3. (Optional) Open Drizzle Studio to view data
pnpm db:studio
```

### Storage Configuration

By default, AphexCMS uses **local filesystem storage**. No configuration is needed. If the `storage` property is omitted from `aphex.config.ts`, the core CMS engine will automatically create a local storage adapter.

To override this default and use **cloud storage** (like Cloudflare R2 or AWS S3), you can create your own storage adapter instance and pass it to the configuration.

**Example: Setting up S3/R2**

1.  First, install the adapter:
    ```bash
    pnpm add @aphex/storage-s3
    ```

2.  Next, create a file at `apps/studio/src/lib/server/storage/index.ts` to build your S3 adapter:
    ```typescript
    // apps/studio/src/lib/server/storage/index.ts
    import { s3Storage } from '@aphex/storage-s3';
    import { env } from '$env/dynamic/private';

    export const storageAdapter = s3Storage({
        bucket: env.R2_BUCKET,
        endpoint: env.R2_ENDPOINT,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        publicUrl: env.R2_PUBLIC_URL || ''
    }).adapter;
    ```

3.  Finally, update your `aphex.config.ts` to import and use this new adapter:
    ```typescript
    // aphex.config.ts
    import { storageAdapter } from './src/lib/server/storage'; // <-- Import your adapter

    export default createCMSConfig({
        // ...
        storage: storageAdapter, // <-- Pass the instance here
    });
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
│       │   │   └── server/
│       │   │       ├── db/         # SINGLETON DB INSTANCE
│       │   │       ├── storage/    # SINGLETON STORAGE INSTANCE
│       │   │       └── auth/       # App-specific auth implementation
│       │   │           ├── service.ts    # AuthService orchestrator
│       │   │           └── better-auth/  # Better Auth specific code
│       │   └── hooks.server.ts     # Initializes CMS
│       └── aphex.config.ts         # Passes singleton instances to CMS
│
└── packages/
    ├── cms-core/            # @aphex/cms-core (DATABASE-AGNOSTIC CORE)
    │   ├── src/
    │   │   ├── auth/        # Auth contracts (AuthProvider)
    │   │   ├── db/          # Database interfaces (DatabaseAdapter)
    │   │   ├── services/    # Core services (AssetService)
    │   │   ├── storage/     # Storage interfaces
    │   │   └── types/       # SHARED BASE TYPES (CMSUser, Document, etc)
    │   │       └── index.ts   # Barrel file for all types
    │   └── package.json
    │
    ├── postgresql-adapter/  # @aphex/postgresql-adapter
    │   ├── src/
    │   │   ├── schema.ts         # Drizzle schema for core tables
    │   │   ├── document-adapter.ts
    │   │   ├── asset-adapter.ts
    │   │   └── user-adapter.ts   # User profile DB implementation
    │   └── package.json
    │
    └── ui/                  # @aphex/ui (SHARED COMPONENTS)
        ├── src/lib/components/ui/  # shadcn components                                                                                      │
            └── app.css          # Shared Tailwind theme
```

### Key Architecture Patterns

#### 1. Ports & Adapters (Database/Storage)

**Interfaces define contracts**, adapters implement them:

```typescript
// 1. The interface is defined in the core package:
// packages/cms-core/src/db/interfaces/document.ts
export interface DocumentAdapter {
	findMany(filters?: DocumentFilters): Promise<Document[]>;
	findById(id: string, depth?: number): Promise<Document | null>;
	create(data: CreateDocumentData): Promise<Document>;
	// ...
}

// 2. The implementation lives in its own adapter package:
// packages/postgresql-adapter/src/document-adapter.ts
export class PostgreSQLDocumentAdapter implements DocumentAdapter {
	// Implementation for PostgreSQL
}

// Want MongoDB? Create a new @aphex/mongodb-adapter package!
```

#### 2. Singleton Services & Dependency Injection

The `studio` app is responsible for creating and managing singleton instances of core services. This ensures that the entire application shares the same database connection and storage configuration.

```typescript
// apps/studio/src/lib/server/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createPostgreSQLProvider } from '@aphex/postgresql-adapter';
// ...

// 1. Create the raw client once
export const client = postgres(env.DATABASE_URL);
export const drizzleDb = drizzle(client, { schema });

// 2. Create and export the full adapter instance as a singleton
const provider = createPostgreSQLProvider({ client });
const adapter = provider.createAdapter();
export const db = adapter;
```

This singleton instance is then imported into `aphex.config.ts` and passed to the core engine.

```typescript
// apps/studio/aphex.config.ts
import { createCMSConfig } from '@aphex/cms-core/server';
import { db } from './src/lib/server/db'; // <-- Import the singleton adapter
import { storageAdapter } from './src/lib/server/storage';

export default createCMSConfig({
	schemas,
	database: db, // Pass the instance directly
	storage: storageAdapter,
	// ...
});
```

The auth system uses this to enable **Dependency Injection**. The `createCMSHook` receives the `databaseAdapter` and, at runtime, injects it into the `authProvider`'s methods (e.g., `getSession(request, db)`). This decouples the authentication logic from the database, making the system highly modular and testable.

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
			of: [{ type: 'hero' }, { type: 'catalogBlock' }]
		}
	]
});
```

## 🔑 Core Dependencies

- **SvelteKit V2** - Framework (Svelte 5 runes, no virtual DOM)
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

#### Important Note on Database Co-dependency

The "Better Auth" library requires its own database adapter to manage its tables (`users`, `sessions`, etc.). In this project, we use `better-auth/adapters/drizzle` which is configured to work with the PostgreSQL client.

If you were to change the main database from PostgreSQL to another database (e.g., MongoDB), you would also need to **change the adapter used by Better Auth**.

For example, if you switched to a hypothetical `better-auth/adapters/mongodb`, you would need to update `apps/studio/src/lib/server/auth/better-auth/instance.ts`:

```typescript
// Before (for PostgreSQL)
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
// ...
return betterAuth({
    database: drizzleAdapter(drizzleDb, { schema }),
    // ...
});

// After (for a hypothetical MongoDB)
import { mongoDBAdapter } from 'better-auth/adapters/mongodb';
// ...
return betterAuth({
    database: mongoDBAdapter(myMongoClient), // Pass the MongoDB client
    // ...
});
```

This shows that the `auth` implementation is tightly coupled to the chosen database type.

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Code Style

- **Format before committing**: `pnpm format`
- **Type-check**: `pnpm check`
- **Lint**: `pnpm lint`
- Use **Svelte 5 runes** (`$state`, `$derived`, `$effect`)
- Follow **ports & adapters** pattern for new adapters

### Adding a New Database Adapter

Database adapters are **separate packages** that implement CMS interfaces and provide type-safe configuration. This keeps `@aphex/cms-core` database-agnostic with zero database dependencies.

1. **Create a new package** (e.g., `packages/mongodb-adapter/`):

```bash
mkdir -p packages/mongodb-adapter/src
cd packages/mongodb-adapter
pnpm init
```

2. **Add dependencies**:

```json
{
	"name": "@aphex/mongodb-adapter",
	"type": "module",
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"dependencies": {
		"mongodb": "^6.0.0"
	},
	"peerDependencies": {
		"@aphex/cms-core": "workspace:*"
	},
	"devDependencies": {
		"@aphex/cms-core": "workspace:*",
		"tsup": "^8.0.0",
		"typescript": "^5.3.3"
	}
}
```

3. **Define adapter-specific config interface**:

```typescript
// packages/mongodb-adapter/src/index.ts
import { MongoClient } from 'mongodb';
import type { DatabaseAdapter, DatabaseProvider } from '@aphex/cms-core/server';
import { MongoDBDocumentAdapter } from './document-adapter.js';
import { MongoDBAssetAdapter } from './asset-adapter.js';

/**
 * MongoDB-specific configuration options
 */
export interface MongoDBConfig {
	/** MongoDB connection string */
	connectionString: string;
	/** Connection options */
	options?: {
		maxPoolSize?: number;
		minPoolSize?: number;
		[key: string]: any;
	};
}

/**
 * MongoDB adapter that implements the full DatabaseAdapter interface
 */
export class MongoDBAdapter implements DatabaseAdapter {
	private client: MongoClient;
	private documentAdapter: MongoDBDocumentAdapter;
	private assetAdapter: MongoDBAssetAdapter;

	constructor(client: MongoClient) {
		this.client = client;
		this.documentAdapter = new MongoDBDocumentAdapter(client);
		this.assetAdapter = new MongoDBAssetAdapter(client);
	}

	// Delegate document operations
	async findMany(filters?: any) {
		return this.documentAdapter.findMany(filters);
	}
	async findById(id: string, depth?: number) {
		return this.documentAdapter.findById(id, depth);
	}
	// ... delegate all methods

	// Delegate asset operations
	async createAsset(data: any) {
		return this.assetAdapter.createAsset(data);
	}
	// ... delegate all methods

	async disconnect() {
		await this.client.close();
	}
	async isHealthy(): Promise<boolean> {
		try {
			await this.client.db().admin().ping();
			return true;
		} catch {
			return false;
		}
	}
}

/**
 * MongoDB database provider
 */
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

/**
 * Create a MongoDB database provider with type-safe configuration
 */
export function createMongoDBProvider(config: MongoDBConfig): DatabaseProvider {
	return new MongoDBProvider(config);
}
```

4. **Use in your app** (type-safe!):

```typescript
// apps/studio/aphex.config.ts
import { createMongoDBProvider } from '@aphex/mongodb-adapter';

export default createCMSConfig({
	schemas,
	database: createMongoDBProvider({
		connectionString: 'mongodb://localhost:27017/aphexcms',
		options: { maxPoolSize: 10 } // MongoDB-specific typed options!
	})
});
```

5. **Install in your app**:

```bash
pnpm add @aphex/mongodb-adapter
```

### Adding a New Storage Adapter

Storage adapters follow the same pattern: **interfaces**, **adapters**, and **providers**.

1. **Interface** (already defined):

```typescript
// packages/cms-core/src/storage/interfaces/storage.ts
export interface StorageAdapter {
	store(data: UploadFileData): Promise<StorageFile>;
	delete(path: string): Promise<boolean>;
	exists(path: string): Promise<boolean>;
	getUrl(path: string): string;
	getStorageInfo(): Promise<{ totalSize: number; availableSpace?: number }>;
	isHealthy(): Promise<boolean>;
}
```

2. **Create adapter implementation**:

```typescript
// packages/cms-core/src/storage/adapters/s3-storage-adapter.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type {
	StorageAdapter,
	UploadFileData,
	StorageFile,
	StorageConfig
} from '../interfaces/storage.js';

export class S3StorageAdapter implements StorageAdapter {
	private client: S3Client;
	private bucket: string;
	private baseUrl: string;

	constructor(config: StorageConfig) {
		this.client = new S3Client({
			region: config.options?.region,
			credentials: config.options?.credentials
		});
		this.bucket = config.options?.bucket || '';
		this.baseUrl = config.baseUrl || '';
	}

	async store(data: UploadFileData): Promise<StorageFile> {
		const key = `uploads/${Date.now()}-${data.filename}`;
		await this.client.send(
			new PutObjectCommand({
				Bucket: this.bucket,
				Key: key,
				Body: data.buffer,
				ContentType: data.mimeType
			})
		);

		return {
			path: key,
			url: `${this.baseUrl}/${key}`,
			size: data.size
		};
	}

	async delete(path: string): Promise<boolean> {
		await this.client.send(
			new DeleteObjectCommand({
				Bucket: this.bucket,
				Key: path
			})
		);
		return true;
	}

	async exists(path: string): Promise<boolean> {
		/* implementation */
	}
	getUrl(path: string): string {
		return `${this.baseUrl}/${path}`;
	}
	async getStorageInfo() {
		return { totalSize: 0 };
	}
	async isHealthy(): Promise<boolean> {
		return true;
	}
}
```

3. **Create provider**:

```typescript
// packages/cms-core/src/storage/providers/storage.ts
import { S3StorageAdapter } from '../adapters/s3-storage-adapter.js';

export class S3StorageProvider implements StorageProvider {
	name = 's3';

	createAdapter(config: StorageConfig): StorageAdapter {
		return new S3StorageAdapter(config);
	}
}

// Register the provider
storageProviders.register(new S3StorageProvider());
```

4. **Export from package**:

```typescript
// packages/cms-core/src/storage/adapters/index.ts
export * from './s3-storage-adapter.js';
```

5. **Use in your app**:

```typescript
// aphex.config.ts
export default createCMSConfig({
	storage: {
		adapter: 's3',
		baseUrl: 'https://cdn.example.com',
		options: {
			bucket: 'my-bucket',
			region: 'us-east-1',
			credentials: {
				/* ... */
			}
		}
	}
});
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

## 🙏 Acknowledgments

Inspired by [Sanity.io](https://sanity.io)

Built with:

- [SvelteKit](https://kit.svelte.dev)
- [Drizzle ORM](https://orm.drizzle.team)
- [shadcn-svelte](https://shadcn-svelte.com)
- [Turborepo](https://turbo.build)
- [BetterAuth](https://www.better-auth.com/)

---

**Questions?** Check `CLAUDE.md` for detailed architecture docs, or open an issue!
