# AphexCMS Architecture

> **A deep dive into the internal architecture, design patterns, and implementation details of AphexCMS**

AphexCMS is a **Sanity-inspired**, **type-safe**, **database-agnostic** Content Management System built with SvelteKit V2 (Svelte 5). This document explains the core architectural decisions, patterns, and systems that make AphexCMS flexible, maintainable, and extensible.

---

## Table of Contents

1. [Philosophy & Design Goals](#philosophy--design-goals)
2. [Monorepo Structure](#monorepo-structure)
3. [Core Architecture Patterns](#core-architecture-patterns)
4. [Schema System](#schema-system)
5. [CMS Engine](#cms-engine)
6. [Authentication & Multi-Tenancy](#authentication--multi-tenancy)
7. [Document Workflow & Publishing](#document-workflow--publishing)
8. [Field System & Validation](#field-system--validation)
9. [Storage & Assets](#storage--assets)
10. [API Layer](#api-layer)
11. [Plugin System](#plugin-system)
12. [Frontend Architecture](#frontend-architecture)

---

## Philosophy & Design Goals

AphexCMS follows these core principles:

### 1. **Framework-Agnostic Core**

The `@aphex/cms-core` package contains zero database-specific dependencies. All database operations go through adapter interfaces, making it possible to swap PostgreSQL for MongoDB, SQLite, or any other database.

### 2. **Type Safety First**

From schema definitions to API responses, TypeScript types flow through the entire system. Schema types are defined once and used everywhere - validation, UI rendering, API responses, and database operations.

### 3. **Sanity-Inspired DX**

- Declarative schema definitions with fluent validation API
- Nested reference editing with modal overlays
- Real-time validation feedback
- Auto-save with hash-based change detection
- Portable content with reference resolution

### 4. **Batteries-Included, but Swappable**

Ships with PostgreSQL adapter, S3-compatible storage, and Better Auth integration, but all can be replaced with your own implementations.

### 5. **Monorepo for Upgradability**

Core CMS logic lives in versioned packages. Upgrading means bumping a version number, not copying code.

---

## Monorepo Structure

```
aphex/
├── apps/
│   └── studio/                    # Reference implementation (YOUR APP)
│       ├── src/
│       │   ├── lib/
│       │   │   ├── schemaTypes/        # Content models (pages, catalogs, etc.)
│       │   │   └── server/
│       │   │       ├── auth/           # Auth implementation (Better Auth)
│       │   │       ├── db/             # Database singleton & schema composition
│       │   │       └── storage/        # Storage adapter singleton
│       │   ├── routes/
│       │   │   ├── admin/              # Admin UI routes
│       │   │   └── api/                # Re-exported API handlers
│       │   └── hooks.server.ts         # CMS initialization
│       └── aphex.config.ts             # CMS configuration
│
└── packages/
    ├── cms-core/                  # 🧠 Core CMS engine (DATABASE-AGNOSTIC)
    │   ├── src/
    │   │   ├── auth/                   # Auth contracts (AuthProvider interface)
    │   │   ├── db/                     # Database interfaces & contracts
    │   │   ├── storage/                # Storage interfaces & local adapter
    │   │   ├── services/               # Business logic (AssetService, etc.)
    │   │   ├── components/             # Admin UI (Svelte 5, uses @aphex/ui)
    │   │   ├── api/                    # Client-side API utilities
    │   │   ├── routes/                 # Server route handlers
    │   │   ├── field-validation/       # Sanity-style validation rules
    │   │   ├── schema-utils/           # Schema validation & utilities
    │   │   ├── plugins/                # Plugin system contracts
    │   │   ├── types/                  # Shared TypeScript types
    │   │   ├── engine.ts               # CMS engine orchestration
    │   │   ├── hooks.ts                # SvelteKit hook factory
    │   │   └── routes-exports.ts       # Exportable route handlers
    │   └── package.json
    │
    ├── postgresql-adapter/        # 🐘 PostgreSQL implementation
    │   ├── src/
    │   │   ├── schema.ts               # Drizzle schema (documents, assets, etc.)
    │   │   ├── document-adapter.ts     # Document CRUD implementation
    │   │   ├── asset-adapter.ts        # Asset CRUD implementation
    │   │   ├── user-adapter.ts         # User profile implementation
    │   │   ├── schema-adapter.ts       # Schema registration implementation
    │   │   ├── organization-adapter.ts # Multi-tenancy implementation
    │   │   └── index.ts                # PostgreSQLAdapter (combines all)
    │   └── package.json
    │
    ├── storage-s3/                # ☁️ S3-compatible storage
    │   └── src/s3-storage-adapter.ts
    │
    ├── graphql-plugin/            # 🔌 GraphQL API plugin
    │   └── src/
    │       ├── index.ts                # Plugin definition
    │       ├── schema.ts               # GraphQL schema generator
    │       └── resolvers.ts            # GraphQL resolvers
    │
    └── ui/                        # 🎨 Shared shadcn-svelte component library
        ├── src/lib/components/ui/      # shadcn components (button, dialog, etc.)
        ├── tailwind.config.ts          # Shared Tailwind config
        └── app.css                     # Global styles & CSS variables
```

---

## Core Architecture Patterns

### 1. Ports & Adapters (Hexagonal Architecture)

The CMS core defines **interfaces** (ports), and separate packages provide **implementations** (adapters).

#### Example: Database Adapter

**Interface (Port)** - defined in `cms-core`:

```typescript
// packages/cms-core/src/db/interfaces/document.ts
export interface DocumentAdapter {
	findMany(filters?: DocumentFilters): Promise<Document[]>;
	findById(id: string, depth?: number): Promise<Document | null>;
	create(data: CreateDocumentData): Promise<Document>;
	update(id: string, data: UpdateDocumentData): Promise<Document>;
	delete(id: string): Promise<boolean>;
	// ... more methods
}
```

**Implementation (Adapter)** - in separate package:

```typescript
// packages/postgresql-adapter/src/document-adapter.ts
export class PostgreSQLDocumentAdapter implements DocumentAdapter {
	private db: ReturnType<typeof drizzle>;
	private tables: CMSSchema;

	async findMany(filters?: DocumentFilters): Promise<Document[]> {
		// PostgreSQL-specific implementation using Drizzle ORM
		const query = this.db.select().from(this.tables.documents);
		// ... filtering logic
		return await query;
	}
	// ... other methods
}
```

**Why?** This pattern keeps `cms-core` **completely database-agnostic**. Want MongoDB? Create `@aphex/mongodb-adapter` without touching core code.

### 2. Singleton Services with Dependency Injection

The `studio` app creates singleton instances of adapters and services, then passes them to the CMS engine.

#### Database Singleton

```typescript
// apps/studio/src/lib/server/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createPostgreSQLProvider } from '@aphex/postgresql-adapter';
import * as cmsSchema from './cms-schema';
import * as authSchema from './auth-schema';

// 1. Create raw database client (singleton)
export const client = postgres(env.DATABASE_URL, { max: 10 });

// 2. Compose full schema (CMS tables + Auth tables)
const schema = { ...cmsSchema, ...authSchema };
export const drizzleDb = drizzle(client, { schema });

// 3. Create and export database adapter (singleton)
const provider = createPostgreSQLProvider({ client });
const adapter = provider.createAdapter();
export const db = adapter as DatabaseAdapter;
```

#### Configuration with Dependency Injection

```typescript
// apps/studio/aphex.config.ts
import { createCMSConfig } from '@aphex/cms-core/server';
import { schemaTypes } from './src/lib/schemaTypes/index.js';
import { authProvider } from './src/lib/server/auth';
import { db } from './src/lib/server/db'; // ← Singleton database adapter
import { storageAdapter } from './src/lib/server/storage'; // ← Singleton storage adapter

export default createCMSConfig({
	schemaTypes, // Your content models

	// Inject singleton instances
	database: db,
	storage: storageAdapter, // Optional: defaults to local filesystem

	auth: {
		provider: authProvider,
		loginUrl: '/login'
	},

	plugins: [
		createGraphQLPlugin({
			endpoint: '/api/graphql',
			enableGraphiQL: true,
			defaultPerspective: 'draft'
		})
	],

	customization: {
		branding: { title: 'Aphex' }
	}
});
```

#### Hook Initialization

The config is passed to `createCMSHook()` which initializes the CMS and injects services into `event.locals`:

```typescript
// apps/studio/src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { createCMSHook } from '@aphex/cms-core/server';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import cmsConfig from '../aphex.config.js';
import { auth } from '$lib/server/auth';

// 1. Auth hook (handles /api/auth/* routes)
const authHook = ({ event, resolve }) => svelteKitHandler({ event, resolve, auth, building });

// 2. CMS hook (initializes engine, injects services, protects routes)
const aphexHook = createCMSHook(cmsConfig);

// 3. Combine hooks
export const handle = sequence(authHook, aphexHook);
```

**What `createCMSHook` does:**

1. **Initializes CMS engine** (singleton) on first request
2. **Registers schema types** in database
3. **Installs plugins** (e.g., GraphQL)
4. **Injects services** into `event.locals.aphexCMS`:
   - `databaseAdapter`
   - `storageAdapter`
   - `assetService`
   - `cmsEngine`
   - `auth` (if configured)
5. **Protects admin routes** via auth provider

### 3. Provider Pattern for Adapters

Adapters use a **provider pattern** to decouple configuration from instantiation:

```typescript
// packages/postgresql-adapter/src/index.ts
export interface DatabaseProvider {
	name: string;
	createAdapter(): DatabaseAdapter;
}

export function createPostgreSQLProvider(config: { client: PostgresClient }): DatabaseProvider {
	return {
		name: 'postgresql',
		createAdapter(): DatabaseAdapter {
			const db = drizzle(config.client, { schema: cmsSchema });
			return new PostgreSQLAdapter({ db, tables: cmsSchema });
		}
	};
}
```

**Usage in app:**

```typescript
// apps/studio/src/lib/server/db/index.ts
const provider = createPostgreSQLProvider({ client });
export const db = provider.createAdapter(); // DatabaseAdapter instance
```

**Why?** Providers allow type-safe configuration at the adapter level while keeping the core agnostic.

### 4. Route Handler Re-exports

Most API routes **re-export handlers from cms-core** to avoid duplication:

```typescript
// 1. Handler defined in cms-core
// packages/cms-core/src/routes/documents.ts
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, locals }) => {
	const { databaseAdapter } = locals.aphexCMS;
	const docType = url.searchParams.get('docType');

	const documents = await databaseAdapter.findMany({ type: docType });
	return json({ success: true, data: documents });
};
```

```typescript
// 2. Re-exported in cms-core barrel file
// packages/cms-core/src/routes-exports.ts
export { GET as getDocuments, POST as createDocument } from './routes/documents.js';
export { GET as getAssets, POST as createAsset } from './routes/assets.js';
```

```typescript
// 3. Re-imported in studio app
// apps/studio/src/routes/api/documents/+server.ts
export { getDocuments as GET, createDocument as POST } from '@aphex/cms-core/server';
```

**Why?**

- ✅ No code duplication
- ✅ Easy upgrades (bump package version)
- ✅ Still customizable (import and wrap if needed)

---

## Schema System

The schema system is **the heart of AphexCMS**. It's inspired by Sanity's schema definition pattern, providing a type-safe, declarative way to define content models.

### Schema Definition

Schemas are defined in your app layer using plain TypeScript objects:

```typescript
// apps/studio/src/lib/schemaTypes/page.ts
import type { SchemaType } from '@aphex/cms-core';

export const page: SchemaType = {
	type: 'document', // or 'object'
	name: 'page',
	title: 'Page',
	description: 'Website pages with Hero, Content blocks, and SEO',

	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Page Title',
			validation: (Rule) => Rule.required().max(100)
		},
		{
			name: 'slug',
			type: 'slug',
			title: 'URL Slug',
			source: 'title', // Auto-generate from title field
			validation: (Rule) => Rule.required()
		},
		{
			name: 'hero',
			type: 'object',
			title: 'Hero Section',
			fields: [
				{ name: 'heading', type: 'string', title: 'Heading' },
				{ name: 'image', type: 'image', title: 'Background Image' }
			]
		},
		{
			name: 'content',
			type: 'array',
			title: 'Content Blocks',
			of: [
				{ type: 'textBlock' }, // References another schema
				{ type: 'imageBlock' },
				{ type: 'catalogBlock' }
			]
		},
		{
			name: 'relatedPages',
			type: 'reference',
			title: 'Related Pages',
			to: [{ type: 'page' }] // Reference to other documents
		}
	]
};
```

### Schema Registry

All schemas are collected and passed to the CMS config:

```typescript
// apps/studio/src/lib/schemaTypes/index.ts
import page from './page.js';
import textBlock from './textBlock.js';
import catalog from './catalog.js';

export const schemaTypes = [
	page, // Document type
	catalog, // Document type
	textBlock // Object type (used in arrays)
];
```

### Schema Types

AphexCMS supports two schema types:

1. **Document Types** (`type: 'document'`)
   - Top-level content entities
   - Have their own database records
   - Appear in the admin sidebar
   - Examples: pages, blog posts, products

2. **Object Types** (`type: 'object'`)
   - Reusable nested structures
   - Embedded in documents or other objects
   - Examples: hero sections, SEO metadata, content blocks

### Field Types

Built-in field types:

| Field Type  | Description                | Example                          |
| ----------- | -------------------------- | -------------------------------- |
| `string`    | Short text input           | Page titles, names               |
| `text`      | Multi-line textarea        | Descriptions, paragraphs         |
| `number`    | Numeric input              | Prices, quantities               |
| `boolean`   | Checkbox                   | Published status, featured       |
| `slug`      | URL-friendly string        | Auto-generated from source field |
| `image`     | Image upload with metadata | Hero images, thumbnails          |
| `array`     | List of items              | Content blocks, tags             |
| `object`    | Nested structure           | Hero section, SEO metadata       |
| `reference` | Link to other documents    | Related pages, authors           |

### Schema Storage & Registration

**Why store schemas in the database?**

Schemas are stored in the database for:

1. **Runtime introspection** - API can query available schemas
2. **GraphQL generation** - Plugin generates types from DB schemas
3. **Admin UI** - Load document types dynamically

**However**, schemas are **loaded from code files**, not the database, because:

- ❌ **Validation functions are lost** when serializing to JSON
- ❌ **TypeScript types don't survive** database round-trip
- ✅ **Hot-reloading works** with file system watchers

**Registration Flow:**

```typescript
// packages/cms-core/src/engine.ts
export class CMSEngine {
	async initialize(): Promise<void> {
		// Register all schema types from config into database
		for (const schemaType of this.config.schemaTypes) {
			await this.db.registerSchemaType(schemaType);
		}
		console.log('✅ CMS initialized successfully');
	}
}
```

The database stores schema **metadata** (name, title, fields structure) for runtime queries, but the actual validation logic lives in code.

---

## CMS Engine

The `CMSEngine` is the orchestrator that ties everything together.

```typescript
// packages/cms-core/src/engine.ts
export class CMSEngine {
	private db: DatabaseAdapter;
	public config: CMSConfig;

	constructor(config: CMSConfig, dbAdapter: DatabaseAdapter) {
		this.config = config;
		this.db = dbAdapter;
	}

	// Initialize - register schemas in database
	async initialize(): Promise<void> {
		console.log('🚀 Initializing CMS...');

		for (const schemaType of this.config.schemaTypes) {
			await this.db.registerSchemaType(schemaType);
		}

		console.log('✅ CMS initialized successfully');
	}

	// Schema utilities
	async getSchemaType(name: string): Promise<SchemaType | null> {
		return this.db.getSchemaType(name);
	}

	getSchemaTypeByName(name: string): SchemaType | null {
		return this.config.schemaTypes.find((s) => s.name === name) || null;
	}

	async listDocumentTypes(): Promise<Array<{ name: string; title: string }>> {
		return this.db.listDocumentTypes();
	}

	// Hot-reload support for dev mode
	updateConfig(newConfig: CMSConfig): void {
		this.config = newConfig;
		console.log('🔄 CMS config updated');
	}
}
```

**Singleton Pattern:**

```typescript
let cmsInstance: CMSEngine | null = null;

export function createCMS(config: CMSConfig, dbAdapter: DatabaseAdapter): CMSEngine {
	if (!cmsInstance) {
		cmsInstance = new CMSEngine(config, dbAdapter);
	}
	return cmsInstance;
}

export function getCMS(): CMSEngine {
	if (!cmsInstance) {
		throw new Error('CMS not initialized. Call createCMS() first.');
	}
	return cmsInstance;
}
```

The engine is created once in `createCMSHook()` and reused for all requests.

---

## Authentication & Multi-Tenancy

### Auth Provider Interface

AphexCMS **delegates authentication** to the app layer via the `AuthProvider` interface:

```typescript
// packages/cms-core/src/auth/provider.ts
export interface AuthProvider {
	// Session-based auth
	getSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth | null>;
	requireSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth>;

	// API key auth
	validateApiKey(request: Request, db: DatabaseAdapter): Promise<ApiKeyAuth | null>;
	requireApiKey(
		request: Request,
		db: DatabaseAdapter,
		permission?: 'read' | 'write'
	): Promise<ApiKeyAuth>;

	// User management
	getUserById(userId: string): Promise<{ id: string; name?: string; email: string } | null>;
	changeUserName(userId: string, name: string): Promise<void>;
}

export interface SessionAuth {
	type: 'session';
	user: CMSUser;
	session: { id: string; expiresAt: Date };
	organizationId: string; // Multi-tenancy: user's active org
	organizationRole: string; // User's role in this org
}

export interface ApiKeyAuth {
	type: 'apiKey';
	key: string;
	organizationId: string;
	permissions: string[];
}
```

**Why this pattern?**

- ✅ **Flexibility**: Use any auth library (Better Auth, Auth.js, Lucia, custom)
- ✅ **Best practices**: Leverage battle-tested auth solutions
- ✅ **Separation of concerns**: Core stays auth-agnostic

### Better Auth Integration

The reference implementation uses [Better Auth](https://better-auth.com):

```typescript
// apps/studio/src/lib/server/auth/index.ts
import type { AuthProvider } from '@aphex/cms-core/server';
import { db, drizzleDb } from '$lib/server/db';
import { createAuthInstance } from './better-auth/instance.js';
import { authService } from './service';

// 1. Create Better Auth instance
export const auth = createAuthInstance(db, drizzleDb);

// 2. Export authService
export { authService } from './service';

// 3. Export authProvider for CMS
export const authProvider: AuthProvider = {
	getSession: (request, db) => authService.getSession(request, db),
	requireSession: (request, db) => authService.requireSession(request, db),
	validateApiKey: (request, db) => authService.validateApiKey(request, db),
	requireApiKey: (request, db, permission) => authService.requireApiKey(request, db, permission),
	getUserById: (userId) => authService.getUserById(userId),
	changeUserName: (userId, name) => authService.changeUserName(userId, name)
};
```

**Key sync pattern**: Better Auth hooks sync user profiles with CMS on signup/deletion:

```typescript
// apps/studio/src/lib/server/auth/better-auth/instance.ts
const userSyncHooks = createAuthMiddleware(async (ctx) => {
	// Create CMS user profile on signup
	if (ctx.path === '/sign-up/email' && ctx.context.user) {
		await db.createUserProfile({
			userId: ctx.context.user.id,
			role: 'editor'
		});
	}

	// Clean up CMS data on deletion
	if (ctx.path === '/user/delete-user' && ctx.context.user) {
		await db.deleteUserProfile(ctx.context.user.id);
	}
});
```

### Multi-Tenancy (Organizations)

AphexCMS includes **built-in multi-tenancy** with organization support and **hierarchical organization structure**.

**Key concepts:**

- Every resource (documents, assets) belongs to an **organization**
- Users can belong to multiple organizations with different **roles per org**
- **Row-Level Security (RLS)** enforces data isolation at the database level
- Users have an **active organization** that determines their working context
- **Parent-child hierarchy** allows parent organizations to access child content (top-down visibility)

**Organization structure:**

```typescript
interface Organization {
	id: string;
	name: string;
	slug: string;
	parentId: string | null; // Parent organization for hierarchy
	settings: {
		defaultRole: 'admin' | 'editor' | 'viewer';
	};
}

interface OrganizationMembership {
	userId: string;
	organizationId: string;
	role: 'owner' | 'admin' | 'editor' | 'viewer';
	joinedAt: Date;
}
```

**Hierarchical Access (Top-Down):**

```
Company (Parent Org)
├── Marketing Team (Child Org)
│   └── Only sees Marketing content
├── Engineering Team (Child Org)
│   └── Only sees Engineering content
└── Sales Team (Child Org)
    └── Only sees Sales content

Parent "Company" sees: ALL child org content + own content
Child orgs see: ONLY their own content (isolated)
```

**How it works:**

1. User logs in → `authService.getSession()` returns their **active organizationId**
2. All API requests include `organizationId` in the auth context
3. Database adapters filter queries by `organizationId` automatically
4. **RLS policies** enforce hierarchy:
   - **Child orgs**: Can ONLY access their own content (strict isolation)
   - **Parent orgs**: Can access their own content + ALL descendant content
   - **Sibling orgs**: CANNOT access each other's content

**RLS Policy Logic:**

```sql
-- Simplified example of hierarchical RLS
CREATE POLICY "org_hierarchy_access" ON documents
  FOR SELECT
  USING (
    -- User can access if:
    -- 1. Document belongs to their active org
    organization_id = current_user_org_id()
    OR
    -- 2. Their org is a parent/ancestor of the document's org
    organization_id IN (
      SELECT child_id FROM get_org_descendants(current_user_org_id())
    )
  );
```

**Examples:**

**Scenario 1: Child org user**

```typescript
// User in "Marketing Team" organization
const documents = await db.findMany({
	organizationId: auth.organizationId, // "Marketing Team" ID
	type: 'page'
});

// Returns:
// - All "Marketing Team" documents ONLY
// - NO parent "Company" documents
// - NO sibling "Engineering Team" or "Sales Team" documents
```

**Scenario 2: Parent org user**

```typescript
// User in "Company" organization
const documents = await db.findMany({
	organizationId: auth.organizationId, // "Company" ID
	type: 'page'
});

// Returns:
// - All "Company" documents
// - All "Marketing Team" documents
// - All "Engineering Team" documents
// - All "Sales Team" documents
```

**Configuration:**

```typescript
// apps/studio/src/lib/server/db/index.ts
const adapter = provider.createAdapter({
	multiTenancy: {
		enableRLS: true, // Enable Row-Level Security
		enableHierarchy: true // Enable parent → child access
	}
});
```

**Use cases:**

- **Agency**: Parent agency can oversee all client orgs, clients are isolated
- **Enterprise**: Executive team sees all departments, departments are isolated from each other
- **SaaS**: Platform admin sees all tenants, tenants are isolated from each other

### API Key Authentication

For programmatic access, AphexCMS supports **API keys** with rate limiting:

**Features:**

- Per-key permissions (`read`, `write`)
- Rate limiting (10,000 requests/day by default)
- Organization-scoped keys
- Managed through `/admin/settings`

**Usage:**

```bash
curl -X GET http://localhost:5173/api/documents?docType=page \
  -H "x-api-key: your-api-key-here"
```

---

## Document Workflow & Publishing

### Document Structure

Documents follow a **draft/published** pattern inspired by Sanity:

```typescript
interface Document {
	id: string;
	type: string; // Schema type name
	status: 'draft' | 'published' | null;

	draftData: any; // Current working copy
	publishedData: any; // Public version
	publishedHash: string | null; // Content hash for change detection

	createdBy: string;
	updatedBy: string | null;
	publishedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}
```

### Hash-Based Change Detection

**The Problem:** How do you know if a draft has unpublished changes?

**The Solution:** Content hashing with timestamp-based change tracking.

```typescript
// packages/cms-core/src/utils/content-hash.ts

// Create hash from draft data (includes timestamp)
export function createContentHash(data: any, includeTimestamp = true): string {
	const hashData = includeTimestamp ? { ...data, _lastModified: new Date().toISOString() } : data;

	const stableJson = JSON.stringify(sortObject(hashData));
	return simpleHash(stableJson);
}

// Check if draft differs from published version
export function hasUnpublishedChanges(draftData: any, publishedHash: string | null): boolean {
	if (!publishedHash) return true; // Never published = has changes

	const publishedDataHash = createPublishedHash(draftData);
	return publishedDataHash !== publishedHash;
}
```

**Why timestamps?**

- **Sanity-style UX**: Any edit → "Publish" button becomes active
- **Future versioning**: Timestamp trail enables version history
- **Simple rollback**: Compare hashes to detect content changes

### Auto-Save System

The `DocumentEditor` auto-saves drafts every **2 seconds** when changes are detected:

```typescript
// packages/cms-core/src/components/admin/DocumentEditor.svelte
let hasUnsavedChanges = $state(false);
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

// Track changes
$effect(() => {
	const _data = documentData;
	hasUnsavedChanges = true;

	// Clear existing timer
	if (autoSaveTimer) clearTimeout(autoSaveTimer);

	// Schedule auto-save
	autoSaveTimer = setTimeout(() => {
		if (hasUnsavedChanges && !hasValidationErrors) {
			saveDocument(false); // Save without publishing
		}
	}, 2000);
});
```

**Auto-save benefits:**

- ✅ Never lose work
- ✅ Smooth transition from "create" → "edit" mode
- ✅ No manual "Save Draft" button needed

### Publishing Flow

1. **Edit** → Draft data updated, hash shows changes
2. **Auto-save** → Draft persisted to database
3. **Publish** → Draft data copied to `publishedData`, hash calculated
4. **Change detection** → New edits create diff from published hash

```typescript
// Publish handler
async function publishDocument() {
	await documents.publish(documentId!, {
		draftData: documentData,
		publishedHash: createHashForPublishing(documentData)
	});

	publishSuccess = new Date(); // Show "Published!" toast
}
```

**Future enhancement**: Hash trail will enable simple **version history** and **rollback**.

---

## Field System & Validation

### Field Component Architecture

Fields are **auto-rendered** based on `field.type` via `SchemaField.svelte`:

```typescript
// packages/cms-core/src/components/admin/SchemaField.svelte
<script lang="ts">
  import StringField from './fields/StringField.svelte';
  import NumberField from './fields/NumberField.svelte';
  import ArrayField from './fields/ArrayField.svelte';
  // ... other field imports

  let { field, value, onUpdate }: Props = $props();
</script>

{#if field.type === 'string'}
  <StringField {field} {value} {onUpdate} />
{:else if field.type === 'number'}
  <NumberField {field} {value} {onUpdate} />
{:else if field.type === 'array'}
  <ArrayField {field} {value} {onUpdate} />
{:else if field.type === 'object'}
  <ObjectField {field} {value} {onUpdate} />
{:else if field.type === 'reference'}
  <ReferenceField {field} {value} {onUpdate} />
{/if}
```

**Adding a custom field:**

1. Create `CustomField.svelte` component
2. Add case to `SchemaField.svelte`
3. Add type to `FieldType` union in `types/schemas.ts`

### Validation System

AphexCMS uses a **Sanity-style fluent validation API**:

```typescript
// Define validation rules
{
  name: 'email',
  type: 'string',
  title: 'Email',
  validation: (Rule) => Rule.required().email()
}

{
  name: 'price',
  type: 'number',
  title: 'Price',
  validation: (Rule) => Rule.required().positive().min(0.01)
}

{
  name: 'slug',
  type: 'slug',
  title: 'URL Slug',
  validation: (Rule) => Rule.required().max(200)
}
```

**Validation Rules:**

```typescript
// packages/cms-core/src/field-validation/rule.ts
export class Rule {
	required(): Rule;
	optional(): Rule;

	// String
	min(length: number): Rule;
	max(length: number): Rule;
	email(): Rule;
	uri(options?): Rule;
	regex(pattern: RegExp): Rule;

	// Number
	positive(): Rule;
	negative(): Rule;
	integer(): Rule;
	greaterThan(num: number): Rule;
	lessThan(num: number): Rule;

	// Custom
	custom<T>(fn: CustomValidator<T>): Rule;

	// Messages
	error(message?: string): Rule;
	warning(message?: string): Rule;
}
```

**Validation execution:**

- Runs **on field blur** (not on every keystroke)
- Shows **inline error messages** below fields
- Prevents **auto-save** when validation errors exist
- Blocks **publishing** until all errors resolved

### Reference Field Resolution

Reference fields support **nested depth resolution** with circular reference protection:

```bash
# No resolution (just IDs)
GET /api/documents/page-123

# Depth 1 - resolve direct references
GET /api/documents/page-123?depth=1

# Depth 2 - resolve nested references
GET /api/documents/page-123?depth=2
```

**Example:**

```typescript
// Page references Author
{
  "title": "My Post",
  "author": "author-456"  // Just ID at depth=0
}

// With depth=1
{
  "title": "My Post",
  "author": {  // Resolved!
    "id": "author-456",
    "name": "John Doe",
    "avatar": "image-789"  // Still just ID
  }
}

// With depth=2
{
  "title": "My Post",
  "author": {
    "id": "author-456",
    "name": "John Doe",
    "avatar": {  // Resolved!
      "id": "image-789",
      "url": "https://cdn.example.com/avatar.jpg"
    }
  }
}
```

**Max depth:** 5 (clamped for performance)

---

## Storage & Assets

### Storage Adapter Interface

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

### Built-in Adapters

**1. Local Filesystem (Default)**

```typescript
// Automatically used if no storage config provided
const storageAdapter = createStorageAdapter('local', {
	basePath: './static/uploads',
	baseUrl: '/uploads'
});
```

**2. S3-Compatible Storage**

```typescript
// packages/storage-s3/src/s3-storage-adapter.ts
import { s3Storage } from '@aphex/storage-s3';

const storageAdapter = s3Storage({
	bucket: env.R2_BUCKET,
	endpoint: env.R2_ENDPOINT,
	accessKeyId: env.R2_ACCESS_KEY_ID,
	secretAccessKey: env.R2_SECRET_ACCESS_KEY,
	publicUrl: env.R2_PUBLIC_URL
}).adapter;
```

**Supported services:**

- Cloudflare R2
- AWS S3
- MinIO
- DigitalOcean Spaces
- Backblaze B2
- Any S3-compatible service

### Asset Management

Assets are **first-class CMS entities** with metadata:

```typescript
interface Asset {
	id: string;
	organizationId: string;
	assetType: 'image' | 'file';

	// Storage
	filename: string;
	originalFilename: string;
	path: string;
	url: string;
	storageAdapter: string;

	// Metadata
	mimeType: string;
	size: number;
	width?: number;
	height?: number;
	metadata?: any;

	// CMS fields
	title?: string;
	description?: string;
	alt?: string;
	creditLine?: string;

	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
}
```

**Image processing:** Uses Sharp for automatic metadata extraction (dimensions, EXIF, etc.)

---

## API Layer

### Server-Side API (Route Handlers)

Route handlers are defined in `cms-core` and re-exported:

```typescript
// 1. Define in cms-core
// packages/cms-core/src/routes/documents.ts
export const GET: RequestHandler = async ({ url, locals }) => {
	const { databaseAdapter } = locals.aphexCMS;
	const auth = locals.auth;

	const documents = await databaseAdapter.findMany({
		organizationId: auth.organizationId,
		type: url.searchParams.get('docType')
	});

	return json({ success: true, data: documents });
};
```

```typescript
// 2. Re-export in barrel file
// packages/cms-core/src/routes-exports.ts
export { GET as getDocuments, POST as createDocument } from './routes/documents.js';
```

```typescript
// 3. Import in app
// apps/studio/src/routes/api/documents/+server.ts
export { getDocuments as GET, createDocument as POST } from '@aphex/cms-core/server';
```

### Client-Side API (Type-Safe)

The client-side API provides **type-safe** access to CMS endpoints:

```typescript
// packages/cms-core/src/api/documents.ts
export class DocumentsApi {
	static async list(filters?: DocumentFilters): Promise<ApiResponse<Document[]>> {
		return apiClient.get<Document[]>('/documents', filters);
	}

	static async getById(id: string, depth?: number): Promise<ApiResponse<Document>> {
		return apiClient.get<Document>(`/documents/${id}`, { depth });
	}

	static async create(data: CreateDocumentData): Promise<ApiResponse<Document>> {
		return apiClient.post<Document>('/documents', data);
	}
}

// Convenience exports
export const documents = {
	list: DocumentsApi.list.bind(DocumentsApi),
	getById: DocumentsApi.getById.bind(DocumentsApi),
	create: DocumentsApi.create.bind(DocumentsApi),
	update: DocumentsApi.update.bind(DocumentsApi),
	delete: DocumentsApi.delete.bind(DocumentsApi)
};
```

**Usage in components:**

```typescript
// Svelte component
<script lang="ts">
  import { documents } from '@aphex/cms-core/client';

  const result = await documents.list({ type: 'page' });
  if (result.success) {
    console.log(result.data);  // Fully typed!
  }
</script>
```

**Generic API client:**

```typescript
// packages/cms-core/src/api/client.ts
export class ApiClient {
	async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>>;
	async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>>;
	async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>>;
	async delete<T>(endpoint: string): Promise<ApiResponse<T>>;
}
```

**Benefits:**

- ✅ Type-safe request/response
- ✅ Consistent error handling
- ✅ Automatic JSON serialization
- ✅ Request timeouts

---

## Plugin System

### Plugin Interface

```typescript
// packages/cms-core/src/plugins/README.md (types defined in source)
export interface CMSPlugin {
	name: string;
	version: string;
	config?: Record<string, any>;

	// Route handlers this plugin provides
	routes?: Record<string, (event: RequestEvent) => Promise<Response> | Response>;

	// Initialization hook
	install: (cms: CMSInstances) => Promise<void>;
}
```

### GraphQL Plugin Example

The GraphQL plugin demonstrates the full plugin pattern:

```typescript
// packages/graphql-plugin/src/index.ts
export function createGraphQLPlugin(config: GraphQLPluginConfig = {}): CMSPlugin {
	const endpoint = config.endpoint ?? '/api/graphql';
	let yogaApp: any = null;

	return {
		name: '@aphex/graphql-plugin',
		version: '0.1.0',

		// Define routes
		routes: {
			[endpoint]: async (event: RequestEvent) => {
				if (!yogaApp) {
					return new Response('GraphQL not initialized', { status: 500 });
				}
				return yogaApp.fetch(event.request, event);
			}
		},

		// Install during CMS startup
		install: async (cms: CMSInstances) => {
			// Generate GraphQL schema from CMS schemas
			const typeDefs = generateGraphQLSchema(cms.config.schemaTypes);
			const resolvers = createResolvers(cms, cms.config.schemaTypes);

			yogaApp = createYoga({
				schema: createSchema({ typeDefs, resolvers }),
				graphqlEndpoint: endpoint,
				context: async (event) => ({
					organizationId: event.locals.auth.organizationId,
					auth: event.locals.auth
				})
			});

			console.log(`✅ GraphQL plugin installed at ${endpoint}`);
		}
	};
}
```

**Plugin features:**

- ✅ **Auto-generated types** from CMS schemas
- ✅ **Perspective filtering** (`draft` vs `published`)
- ✅ **Nested reference resolution**
- ✅ **GraphiQL interface** for development

**Using the plugin:**

```typescript
// aphex.config.ts
import { createGraphQLPlugin } from '@aphex/graphql-plugin';

export default createCMSConfig({
	// ...
	plugins: [
		createGraphQLPlugin({
			endpoint: '/api/graphql',
			enableGraphiQL: true,
			defaultPerspective: 'draft'
		})
	]
});
```

---

## Frontend Architecture

### UI Component Library

AphexCMS uses **[shadcn-svelte](https://shadcn-svelte.com)** for all UI components, shared between `cms-core` and `studio`:

**Key benefits:**

- ✅ **Copy-paste architecture**: Components live in your codebase, not node_modules
- ✅ **Fully customizable**: Modify components without ejecting
- ✅ **Shared package**: `@aphex/ui` exports components for both cms-core and studio
- ✅ **Consistent theming**: Shared Tailwind config and CSS variables

**Adding components:**

```bash
# Add any shadcn-svelte component to @aphex/ui
pnpm shadcn button
pnpm shadcn dialog
pnpm shadcn dropdown-menu

# Components are automatically available in:
# - packages/cms-core/src/components (admin UI)
# - apps/studio/src/routes (your app)
```

**Package structure:**

```typescript
// packages/ui/src/lib/components/ui/button/index.ts
export { default as Button } from './button.svelte';

// Import in cms-core
import { Button } from '@aphex/ui/shadcn/button';

// Import in studio
import { Button } from '@aphex/ui/shadcn/button';
```

**Theming:**

```css
/* packages/ui/src/lib/app.css */
@layer base {
	:root {
		--background: 0 0% 100%;
		--foreground: 222.2 84% 4.9%;
		--primary: 221.2 83.2% 53.3%;
		/* ... shared CSS variables */
	}
}
```

All UI components (buttons, dialogs, forms, etc.) are **consistent across the entire CMS** because they come from the same `@aphex/ui` package.

### Admin UI Structure

The admin interface is a **Sanity-style 3-panel layout**:

```
┌─────────────────────────────────────────────────────┐
│  [Logo]  Sidebar              Header     [User ▾]   │
├────────────┬─────────────────┬────────────────────────┤
│            │                 │                        │
│  Document  │   Document      │    Document Editor     │
│   Types    │   List          │                        │
│            │                 │   ┌──────────────────┐ │
│ • Pages    │  ✓ Homepage     │   │ Title:           │ │
│ • Catalogs │    About        │   │ [____________]   │ │
│            │    Contact      │   │                  │ │
│            │                 │   │ Slug:            │ │
│            │  + New Page     │   │ [homepage____]   │ │
│            │                 │   │                  │ │
│            │                 │   │ Content:         │ │
│            │                 │   │ [ + Add block ]  │ │
│            │                 │   │                  │ │
│            │                 │   └──────────────────┘ │
│            │                 │   [Publish] [Delete]   │
└────────────┴─────────────────┴────────────────────────┘
```

**Responsive behavior:**

- **Desktop**: Side-by-side panels
- **Tablet**: Panels stack with breadcrumb navigation
- **Mobile**: Full-screen panels with back buttons

### Key Components

**1. AdminApp.svelte**

- Root component
- Manages navigation state
- Renders 3-panel layout

**2. DocumentEditor.svelte**

- Schema-driven form rendering
- Auto-save logic
- Validation orchestration
- Publish workflow

**3. SchemaField.svelte**

- Dynamic field component selector
- Passes props to field-specific components

**4. Field Components**

- `StringField.svelte`, `NumberField.svelte`, etc.
- Validation display
- Change handlers

**5. ArrayField.svelte**

- Drag-and-drop reordering
- Block-type selection
- Nested object editing

**6. ReferenceField.svelte**

- Document picker
- Modal-based nested editing
- Reference resolution preview

### Svelte 5 Runes

AphexCMS uses **Svelte 5 runes** for reactivity:

```typescript
// State
let documentData = $state<Record<string, any>>({});
let saving = $state(false);

// Derived
const hasChanges = $derived(hasUnpublishedChanges(documentData, fullDocument?.publishedHash));

// Effects
$effect(() => {
	// Runs when documentData changes
	hasUnsavedChanges = true;
	scheduleAutoSave();
});
```

**Benefits:**

- ✅ More explicit reactivity
- ✅ Better TypeScript inference
- ✅ No virtual DOM overhead

---

## Extending AphexCMS

### Adding a Database Adapter

See README.md section "Adding a New Database Adapter" for full example.

**Quick overview:**

1. Create package (e.g., `@aphex/mongodb-adapter`)
2. Implement `DocumentAdapter`, `AssetAdapter`, etc.
3. Create `DatabaseProvider` with `createAdapter()` method
4. Export typed config interface
5. Use in app: `createMongoDBProvider({ connectionString: '...' })`

### Adding a Storage Adapter

See README.md section "Adding a New Storage Adapter" for full example.

**Quick overview:**

1. Implement `StorageAdapter` interface
2. Create provider class
3. Register with storage registry
4. Use in config: `storage: { adapter: 'myStorage', options: {...} }`

### Adding Custom Field Types

1. **Create field component:**

```typescript
// MyCustomField.svelte
<script lang="ts">
  interface Props {
    field: MyCustomFieldType;
    value: any;
    onUpdate: (value: any) => void;
  }
  let { field, value, onUpdate }: Props = $props();
</script>

<!-- Your custom UI -->
```

2. **Add type definition:**

```typescript
// packages/cms-core/src/types/schemas.ts
export type FieldType = 'string' | 'number' | ... | 'myCustomType';

export interface MyCustomField extends BaseField {
  type: 'myCustomType';
  options?: MyCustomFieldOptions;
}
```

3. **Update SchemaField.svelte:**

```typescript
{#if field.type === 'myCustomType'}
  <MyCustomField {field} {value} {onUpdate} />
{/if}
```

---

## Development Workflow

### Hot Module Replacement (HMR)

- **Schema changes**: Auto-reload without server restart
- **Component changes**: Instant updates with Vite HMR
- **Database changes**: Requires migration (`pnpm db:push`)

### Testing Strategy

**Current state:** No automated tests yet (early development)

**Planned:**

- Unit tests for validation rules, content hashing
- Integration tests for database adapters
- E2E tests for admin UI workflows

### Debugging Tips

**Enable verbose logging:**

```typescript
// Check auth flow
console.log('[AuthService]: getSession called');

// Track document saves
console.log('[DocumentEditor]: Auto-saving', documentId);

// Inspect schema registration
console.log('✅ CMS initialized successfully');
```

**Drizzle Studio:**

```bash
pnpm db:studio
# Open http://localhost:4983 to inspect database
```

**GraphiQL:**

- Navigate to `/api/graphql`
- Explore schema, run queries interactively

---

## Performance Considerations

### Database Queries

- **Connection pooling**: PostgreSQL adapter uses `postgres.js` with `max: 10`
- **Eager loading**: Reference resolution with depth control prevents N+1 queries
- **Indexing**: Primary keys, foreign keys, and `organizationId` indexed

### Asset Optimization

- **Image metadata**: Extracted once during upload (Sharp)
- **CDN-ready**: S3 adapters return public URLs for CDN caching
- **Lazy loading**: Assets loaded on-demand in admin UI

### Frontend Performance

- **Code splitting**: SvelteKit auto-splits routes
- **No virtual DOM**: Svelte 5 compiles to vanilla JS
- **Selective reactivity**: `$derived` and `$effect` minimize re-renders

---

## Security

### Authentication

- **Session-based**: Secure HTTP-only cookies (Better Auth)
- **API keys**: Hashed storage, rate-limited
- **Password hashing**: bcrypt/argon2 (via Better Auth)

### Multi-Tenancy (RLS)

- **Row-Level Security**: Database-enforced data isolation
- **Organization context**: All queries filtered by `organizationId`
- **Role-based access**: Permissions per organization membership

### Input Validation

- **Schema validation**: All fields validated against rules
- **SQL injection**: Parameterized queries (Drizzle ORM)
- **XSS protection**: SvelteKit auto-escapes template content

### File Uploads

- **Type validation**: MIME type checking
- **Size limits**: Configurable max file size
- **Path traversal protection**: Filenames sanitized

---

## Future Roadmap

### Planned Features

1. **Version History**
   - Content hash trail enables simple versioning
   - Rollback to previous published states
   - Diff view between versions

2. **Real-time Collaboration**
   - WebSocket-based presence indicators
   - Conflict resolution for concurrent edits

3. **Advanced Workflows**
   - Approval workflows (draft → review → published)
   - Scheduled publishing
   - Content expiration

4. **Localization (i18n)**
   - Multi-language document support
   - Field-level translations
   - Language switcher in admin UI

5. **Media Library**
   - Folder organization for assets
   - Bulk upload
   - Image editing (crop, resize)

6. **Content Preview**
   - Live preview of documents
   - Device frame simulator
   - Preview tokens for unpublished content

---

## Contributing

See `CONTRIBUTING.md` for detailed guidelines on:

- Code style and conventions
- Pull request process
- Adding features (adapters, fields, plugins)
- Reporting issues

---

## Additional Resources

- **README.md**: Quick start, features, installation
- **CONTRIBUTING.md**: Development setup, PR guidelines
- **packages/cms-core/src/types**: TypeScript type definitions
- **packages/graphql-plugin**: Plugin example
- **apps/studio**: Reference implementation

---

**Questions?** Open an issue on GitHub or check the discussions board!
