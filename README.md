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

Portable, framework-agnostic CMS logic:

- Database adapters (PostgreSQL, extensible to others)
- Storage adapters (Local filesystem)
- Admin UI components (DocumentEditor, field types, validation)
- API route handlers (re-exportable in your app)
- Reference resolution with depth control
- Hash-based publish/draft workflow

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

### Storage Configuration

By default, AphexCMS uses **local filesystem storage** (`./static/uploads`). No configuration needed!

For **cloud storage** (Cloudflare R2, AWS S3, MinIO, etc.), install and configure `@aphex/storage-s3`:

```bash
pnpm add @aphex/storage-s3
```

**Cloudflare R2:**
```typescript
// aphex.config.ts
import { s3Storage } from '@aphex/storage-s3';

export default createCMSConfig({
  storage: s3Storage({
    bucket: env.R2_BUCKET,
    endpoint: env.R2_ENDPOINT,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    publicUrl: env.R2_PUBLIC_URL
  })
});
```

**AWS S3:**
```typescript
import { s3Storage } from '@aphex/storage-s3';

export default createCMSConfig({
  storage: s3Storage({
    bucket: 'my-bucket',
    endpoint: 'https://s3.us-east-1.amazonaws.com',
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: 'us-east-1'
  })
});
```

**MinIO (self-hosted):**
```typescript
import { s3Storage } from '@aphex/storage-s3';

export default createCMSConfig({
  storage: s3Storage({
    bucket: 'my-bucket',
    endpoint: 'http://localhost:9000',
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin'
  })
});
```

**Customize local storage paths:**
```typescript
export default createCMSConfig({
  storage: {
    basePath: './my-custom-uploads',  // Default: './static/uploads'
    baseUrl: '/files'                  // Default: '/uploads'
  }
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

Database adapters follow the same pattern: **interfaces**, **adapters**, and **providers**.

1. **Interfaces** (already defined):

```typescript
// packages/cms-core/src/db/interfaces/document.ts
export interface DocumentAdapter {
	findMany(filters?: DocumentFilters): Promise<Document[]>;
	findById(id: string, depth?: number): Promise<Document | null>;
	create(data: CreateDocumentData): Promise<Document>;
	updateDraft(id: string, data: any, updatedBy?: string): Promise<Document | null>;
	deleteById(id: string): Promise<boolean>;
	publish(id: string): Promise<Document | null>;
	unpublish(id: string): Promise<Document | null>;
	// ...
}

// packages/cms-core/src/db/interfaces/asset.ts
export interface AssetAdapter {
	createAsset(data: CreateAssetData): Promise<Asset>;
	findAssetById(id: string): Promise<Asset | null>;
	findAssets(filters?: AssetFilters): Promise<Asset[]>;
	// ...
}

// packages/cms-core/src/db/interfaces/index.ts
export interface DatabaseAdapter extends DocumentAdapter, AssetAdapter {
	disconnect?(): Promise<void>;
	isHealthy(): Promise<boolean>;
}
```

2. **Create adapter implementations**:

```typescript
// packages/cms-core/src/db/adapters/mongodb/document-adapter.ts
import type { DocumentAdapter } from '../../interfaces/document.js';

export class MongoDBDocumentAdapter implements DocumentAdapter {
	private db: any; // MongoDB client

	constructor(client: any) {
		this.db = client;
	}

	async findMany(filters?: DocumentFilters): Promise<Document[]> {
		const collection = this.db.collection('documents');
		const query = filters?.type ? { type: filters.type } : {};
		return await collection.find(query).toArray();
	}

	async findById(id: string, depth?: number): Promise<Document | null> {
		const collection = this.db.collection('documents');
		const doc = await collection.findOne({ _id: id });
		// Resolve references if depth > 0
		return doc;
	}

	// ... implement all interface methods
}

// packages/cms-core/src/db/adapters/mongodb/asset-adapter.ts
export class MongoDBAssetAdapter implements AssetAdapter {
	// Similar implementation for assets
}

// packages/cms-core/src/db/adapters/mongodb/index.ts
import { MongoClient } from 'mongodb';
import type { DatabaseAdapter, DatabaseConfig } from '../../interfaces/index.js';
import { MongoDBDocumentAdapter } from './document-adapter.js';
import { MongoDBAssetAdapter } from './asset-adapter.js';

export class MongoDBAdapter implements DatabaseAdapter {
	private client: MongoClient;
	private documentAdapter: MongoDBDocumentAdapter;
	private assetAdapter: MongoDBAssetAdapter;

	constructor(config: DatabaseConfig) {
		this.client = new MongoClient(config.connectionString, config.options);
		const db = this.client.db();
		this.documentAdapter = new MongoDBDocumentAdapter(db);
		this.assetAdapter = new MongoDBAssetAdapter(db);
	}

	// Delegate document operations
	async findMany(filters?: any) {
		return this.documentAdapter.findMany(filters);
	}
	async findById(id: string) {
		return this.documentAdapter.findById(id);
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
```

3. **Create provider**:

```typescript
// packages/cms-core/src/db/providers/database.ts
import { MongoDBAdapter } from '../adapters/mongodb/index.js';

export class MongoDBProvider implements DatabaseProvider {
	name = 'mongodb';

	createAdapter(config: DatabaseConfig): DatabaseAdapter {
		return new MongoDBAdapter(config);
	}
}

// Register the provider
databaseProviders.register(new MongoDBProvider());

// Convenience factory function
export function createMongoDBAdapter(connectionString: string, options?: any): DatabaseAdapter {
	return createDatabaseAdapter('mongodb', {
		connectionString,
		options
	});
}
```

4. **Export from package**:

```typescript
// packages/cms-core/src/db/adapters/index.ts
export * from './mongodb/index.js';
```

5. **Use in your app**:

```typescript
// aphex.config.ts
export default createCMSConfig({
	schemas,
	database: {
		adapter: 'mongodb',
		connectionString: 'mongodb://localhost:27017/aphexcms'
	}
});
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
