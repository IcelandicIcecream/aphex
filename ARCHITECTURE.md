# AphexCMS Architecture

> A deep dive into the internal architecture, design patterns, and implementation details of AphexCMS.

AphexCMS is a Sanity-inspired, type-safe, database-agnostic content management system built with SvelteKit V2 and Svelte 5. This document explains the patterns, systems, and trade-offs that make the project flexible and extensible.

---

## Table of Contents

1. [Philosophy & Design Goals](#philosophy--design-goals)
2. [Monorepo Structure](#monorepo-structure)
3. [Core Architecture Patterns](#core-architecture-patterns)
4. [Schema System](#schema-system)
5. [Singletons](#singletons)
6. [CMS Engine](#cms-engine)
7. [Authentication](#authentication)
8. [Multi-Tenancy](#multi-tenancy)
9. [Capability-Based Access Control](#capability-based-access-control)
10. [Document Workflow & Publishing](#document-workflow--publishing)
11. [Version History](#version-history)
12. [Field System & Validation](#field-system--validation)
13. [Storage & Assets](#storage--assets)
14. [API Layer](#api-layer)
15. [Frontend Architecture](#frontend-architecture)
16. [Future Roadmap](#future-roadmap)

---

## Philosophy & Design Goals

### 1. Framework-agnostic core

`@aphexcms/cms-core` contains zero database-specific dependencies. All persistence goes through adapter interfaces, so swapping PostgreSQL for MySQL, MongoDB, or anything else is a separate-package job — not a core rewrite.

### 2. Type safety end to end

Schema definitions flow through validation, the admin UI, the Local API, the HTTP API, and the generated GraphQL schema as the same shape. `aphex generate:types` writes a TypeScript projection so `localAPI.collections.<name>` is fully typed in your app.

### 3. Sanity-inspired DX

- Declarative schema definitions with a fluent validation API.
- Nested reference editing in modal overlays.
- Auto-save with hash-based change detection.
- Portable JSON content with reference resolution at query time.
- Singletons for global "one of" content.

### 4. Batteries included, but swappable

Ships with a PostgreSQL adapter, S3-compatible storage, Better Auth, Resend, and Nodemailer adapters. All of them sit behind interfaces; replace any of them with your own implementation.

### 5. Monorepo for upgradability

Core CMS logic lives in versioned npm packages. Upgrading is a `pnpm up` away — the studio is a thin reference implementation, not a fork.

---

## Monorepo Structure

```
aphex/
├── apps/
│   └── studio/                       # Reference app (the actual CMS)
│       ├── src/
│       │   ├── lib/
│       │   │   ├── schemaTypes/      # Content models live here
│       │   │   └── server/
│       │   │       ├── auth/         # Better Auth + AuthProvider impl
│       │   │       ├── cache/        # InMemoryCacheAdapter singleton
│       │   │       ├── db/           # Postgres adapter singleton
│       │   │       ├── email/        # Resend / Mailpit adapter
│       │   │       └── storage/      # Local / S3 adapter
│       │   ├── routes/
│       │   │   ├── (protected)/admin/    # Admin UI (SvelteKit)
│       │   │   ├── api/[...slug]/        # Hono catch-all
│       │   │   ├── login, invite, verify-email, reset-password, …
│       │   ├── hooks.server.ts           # auth → CMS hook sequence
│       │   └── (other top-level routes)
│       ├── tests/                        # vitest integration tests
│       └── aphex.config.ts               # createCMSConfig(...)
│
├── docs/aphex-docs/                  # Fumadocs site (Next.js)
├── templates/base/                   # Starter shipped via `pnpm create aphex` — owns Dockerfile + prod.docker-compose.yml
│
└── packages/
    ├── cms-core/                     # Core engine (database-agnostic)
    │   └── src/lib/
    │       ├── auth/                 # AuthProvider + capability helpers
    │       ├── cache/                # CacheAdapter + InMemoryCacheAdapter
    │       ├── components/admin/     # Admin UI (Svelte 5)
    │       ├── db/                   # Database interfaces
    │       ├── email/                # EmailAdapter interface
    │       ├── engine.ts             # CMSEngine orchestrator
    │       ├── field-validation/     # Sanity-style Rule API
    │       ├── graphql/              # Schema + resolvers (auto-generated)
    │       ├── hooks.ts              # createCMSHook factory
    │       ├── local-api/            # Type-safe Local API
    │       ├── schema-utils/         # Schema helpers (singleton id, …)
    │       ├── server/api/           # Hono routers
    │       ├── storage/              # StorageAdapter interface + local adapter
    │       └── types/                # Shared TS types
    │
    ├── postgresql-adapter/           # Postgres + Drizzle implementation
    ├── storage-s3/                   # S3-compatible storage
    ├── nodemailer-adapter/           # SMTP email
    ├── resend-adapter/               # Resend email
    ├── ui/                           # Shared shadcn-svelte components
    ├── create-aphex/                 # `pnpm create aphex` scaffolder
    └── cli/                          # `aphx` thin wrapper around create-aphex
```

---

## Core Architecture Patterns

### 1. Ports & adapters (hexagonal architecture)

The core defines **ports** — interfaces — and separate packages provide **adapters** — concrete implementations.

**Port** — defined in cms-core:

```ts
// packages/cms-core/src/lib/db/interfaces/document.ts
export interface DocumentAdapter {
	findManyDocAdvanced(
		organizationId: string,
		type: string,
		options: FindOptions
	): Promise<FindResult<Document>>;
	findById(id: string): Promise<Document | null>;
	createDocument(data: CreateDocumentData): Promise<Document>;
	updateDocDraft(id: string, data: any): Promise<Document>;
	publishDoc(id: string): Promise<Document>;
	// ... more methods
}
```

**Adapter** — in `@aphexcms/postgresql-adapter`:

```ts
// packages/postgresql-adapter/src/document-adapter.ts
export class PostgreSQLDocumentAdapter implements DocumentAdapter {
	async findManyDocAdvanced(orgId, type, opts) {
		// Drizzle-flavored implementation
	}
	// ...
}
```

The core never imports a specific database driver. Want MongoDB? Create `@aphexcms/mongodb-adapter` without touching cms-core.

### 2. Singleton services with dependency injection

The studio creates singleton instances of every adapter and passes them to `createCMSConfig()`. The CMS hook then injects those singletons into `event.locals.aphexCMS` on every request.

```ts
// apps/studio/src/lib/server/db/index.ts
export const client = postgres(pgConnectionUrl(env), { max: 10 });
export const drizzleDb = drizzle(client, { schema: { ...cmsSchema, ...authSchema } });

const provider = createPostgreSQLProvider({
	client,
	multiTenancy: { enableRLS: true, enableHierarchy: true }
});
export const db = provider.createAdapter() as DatabaseAdapter;
```

```ts
// apps/studio/aphex.config.ts
export default createCMSConfig({
	schemaTypes,
	database: db,
	storage: storageAdapter,
	email,
	cache: cacheAdapter,
	auth: { provider: authProvider, loginUrl: '/login' },
	graphql: { defaultPerspective: 'draft', path: '/api/aphex-graphql' },
	customization: { branding: { title: 'Aphex' } }
});
```

```ts
// apps/studio/src/hooks.server.ts
const aphexHook = createCMSHook(cmsConfig);
export const handle = sequence(authHook, aphexHook);
```

`createCMSHook()` does the following on the first request:

1. Resolves the storage adapter (or creates the default local one).
2. Initializes `AssetService`.
3. Constructs the `CMSEngine` and registers schemas in the database.
4. Builds the `LocalAPI`.
5. Calls your `api(app)` hook (if provided), then mounts the built-in Hono routes.
6. Initializes GraphQL if enabled.

On every subsequent request it injects the singletons:

```ts
event.locals.aphexCMS.localAPI;
event.locals.aphexCMS.databaseAdapter;
event.locals.aphexCMS.assetService;
event.locals.aphexCMS.storageAdapter;
event.locals.aphexCMS.emailAdapter; // null if not configured
event.locals.aphexCMS.cmsEngine;
event.locals.aphexCMS.rolesService;
event.locals.aphexCMS.auth; // AuthProvider, undefined if no auth
event.locals.aphexCMS.config;
event.locals.aphexCMS.graphqlSettings;
event.locals.aphexCMS.apiApp; // Hono app instance
```

### 3. Provider pattern for adapters

Adapters expose a provider factory so configuration is type-safe at the adapter level while staying invisible to the core:

```ts
export function createPostgreSQLProvider(config: {
	client: PostgresClient;
	multiTenancy?: { enableRLS?: boolean; enableHierarchy?: boolean };
}): DatabaseProvider {
	return {
		name: 'postgresql',
		createAdapter() {
			// ...
		}
	};
}
```

The studio just calls `provider.createAdapter()` and forgets the provider object existed.

### 4. Hono catch-all for the HTTP API

Earlier versions of AphexCMS re-exported per-endpoint route handlers from `cms-core` into the studio's `src/routes/api/*`. That's gone. Today every CMS endpoint is a Hono route mounted onto a single app, and the studio forwards all `/api/**` traffic through a SvelteKit catch-all:

```ts
// apps/studio/src/routes/api/[...slug]/+server.ts
const handler: RequestHandler = ({ request, locals }) => {
	return locals.aphexCMS.apiApp.fetch(request, {
		aphexCMS: locals.aphexCMS,
		auth: locals.auth ?? null
	});
};
export const GET = handler;
export const POST = handler;
// ... PATCH, PUT, DELETE, OPTIONS, HEAD
```

Specific `+server.ts` files (e.g. `/api/seed-all`, `/api/instance-settings`) still win over the catch-all because SvelteKit prefers concrete routes — handy for app-specific endpoints that don't belong in cms-core.

This unlocks the `api(app)` config hook (see [API Layer](#api-layer)), where users register their own routes and middleware on the same Hono app.

---

## Schema System

The schema system is the heart of AphexCMS. It's inspired by Sanity's pattern: declarative TypeScript objects that describe content models.

### Schema definition

```ts
// apps/studio/src/lib/schemaTypes/page.ts
import type { SchemaType } from '@aphexcms/cms-core';

export const page: SchemaType = {
	type: 'document',
	name: 'page',
	title: 'Page',
	description: 'Website pages with hero, content blocks, and SEO',

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
			source: 'title',
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
			of: [{ type: 'textBlock' }, { type: 'imageBlock' }, { type: 'catalogBlock' }]
		},
		{
			name: 'relatedPages',
			type: 'reference',
			title: 'Related Pages',
			to: [{ type: 'page' }]
		}
	]
};
```

### Schema kinds

1. **Document types** (`type: 'document'`) — top-level entities with their own database rows. Appear in the admin sidebar. Optionally `singleton: true` (see below).
2. **Object types** (`type: 'object'`) — reusable nested structures embedded in documents or arrays. Don't get their own table.

### Field types

13 built-in field types: `string`, `text`, `number`, `boolean`, `slug`, `url`, `date`, `datetime`, `image`, `file`, `array`, `object`, `reference`. Each has its own editor component in `packages/cms-core/src/lib/components/admin/fields/` and (where it makes sense) its own validator and GraphQL type mapping.

### Why store schemas in the database?

Schemas are loaded from code files (so validation functions, icons, and TypeScript types survive). They're _also_ registered in `cms_schema_types` for runtime introspection — the GraphQL generator and admin UI both need a structural representation that doesn't carry executable JS.

The trade-off: validation functions live in code only. If you connect to a database that another instance wrote to, you'll get document data but not the validation rules.

---

## Singletons

A schema marked `singleton: true` represents a global one-of document — site navigation, footer, organization-wide settings.

```ts
const siteNavigation: SchemaType = {
	type: 'document',
	name: 'siteNavigation',
	title: 'Site Navigation',
	singleton: true,
	fields: [
		/* ... */
	]
};
```

### Behavior

- **Deterministic ID** — derived from `(schemaName, organizationId)` via a UUID v5 namespace (`packages/cms-core/src/lib/schema-utils/singleton.ts`). Stable across deploys.
- **Lazy creation** — first read auto-creates an empty draft. No "doesn't exist yet" case to handle.
- **Restricted operations** — `get`, `update`, `publish`, `unpublish` only. `create` and `delete` throw `SingletonOperationError` and the HTTP layer responds with 400.
- **Admin UI affordances** — sidebar uses the singular title (no pluralization), document-list panel is skipped, Create/Delete buttons are hidden.
- **Codegen narrows the type** — `aphex generate:types` emits `SingletonCollection<T>` for singleton entries, which is `Pick<CollectionAPI<T>, 'get' | 'update' | 'publish' | 'unpublish' | 'getSingletonId' | 'schema'>`. Calls to `find`, `findByID`, `create`, or `delete` fail at compile time.
- **GraphQL shape differs** — singleton queries take `(perspective, depth)` only (no `id`); the resolver returns the canonical row. Mutations are limited to `update / publish / unpublish`.

```ts
// In a load function
const nav = await api.collections.siteNavigation.get(ctx, {
	perspective: 'published'
});
```

---

## CMS Engine

`CMSEngine` (in `packages/cms-core/src/lib/engine.ts`) is the orchestrator that ties config + adapters + schemas together.

```ts
export class CMSEngine {
	constructor(
		public config: CMSConfig,
		private db: DatabaseAdapter
	) {}

	async initialize(): Promise<void> {
		for (const schemaType of this.config.schemaTypes) {
			await this.db.registerSchemaType(schemaType);
		}
	}

	async getSchemaType(name: string) {
		return this.db.getSchemaType(name);
	}
	getSchemaTypeByName(name: string) {
		return this.config.schemaTypes.find((s) => s.name === name) ?? null;
	}
	async listDocumentTypes() {
		return this.db.listDocumentTypes();
	}

	// Hot-reload support for dev
	updateConfig(newConfig: CMSConfig): void {
		this.config = newConfig;
	}
}
```

`createCMSHook()` constructs a single `CMSEngine` instance and reuses it across requests. In dev, when the Vite plugin detects schema-file changes, it sets a `__aphexSchemasDirty` flag — the next request rebuilds the engine and re-registers schemas, so HMR works without a full restart.

---

## Authentication

The CMS delegates authentication to the app layer through the `AuthProvider` interface:

```ts
export interface AuthProvider {
	// Browser sessions
	getSession(
		request: Request,
		db: DatabaseAdapter
	): Promise<SessionAuth | PartialSessionAuth | null>;
	requireSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth>;

	// Programmatic access
	validateApiKey(request: Request, db: DatabaseAdapter): Promise<ApiKeyAuth | null>;
	requireApiKey(
		request: Request,
		db: DatabaseAdapter,
		permission?: 'read' | 'write'
	): Promise<ApiKeyAuth>;

	// User management
	getUserById(userId: string): Promise<{ id: string; name?: string; email: string } | null>;
	changeUserName(userId: string, name: string): Promise<void>;

	// Password reset
	requestPasswordReset(email: string, redirectTo?: string): Promise<void>;
	resetPassword(token: string, newPassword: string): Promise<void>;
}
```

### Auth shapes

```ts
interface SessionAuth {
	type: 'session';
	user: CMSUser;
	session: { id: string; expiresAt: Date };
	organizationId: string;
	organizationRole: OrganizationRole; // 'owner' | 'admin' | 'editor' | 'viewer'
	organizations?: Array<{
		id: string;
		name: string;
		slug: string;
		role: OrganizationRole;
		isActive: boolean;
	}>;
}

interface PartialSessionAuth {
	type: 'partial_session';
	user: CMSUser;
	session: { id: string; expiresAt: Date };
}

interface ApiKeyAuth {
	type: 'api_key';
	keyId: string;
	name: string;
	permissions: ('read' | 'write')[];
	organizationId: string;
}
```

`PartialSessionAuth` is returned for users who've signed up but don't yet belong to an organization — the studio routes them to `/invitations` until they accept one.

### Better Auth integration

The reference implementation uses [Better Auth](https://better-auth.com) with email + password, email verification, organization plugin, and the API key plugin. The auth instance lives in `apps/studio/src/lib/server/auth/better-auth/instance.ts`; the adapter that satisfies `AuthProvider` is in `apps/studio/src/lib/server/auth/index.ts`.

Lazy CMS user-profile sync happens on the first session resolve: `AuthService` checks `db.findUserProfileById()`, creates a profile with role `super_admin` (if no profiles exist) or `editor` (otherwise), and seeds a default organization for super admins.

---

## Multi-Tenancy

Every CMS resource (document, asset, version) belongs to an **organization**. The Postgres adapter enforces isolation at three layers:

### 1. Application-level scoping

Every adapter call takes an `organizationId` and filters by it. The `LocalAPI` derives this from `auth` automatically via `authToContext()`.

### 2. Row-Level Security

Before each query, the adapter sets a session variable:

```sql
SET LOCAL app.organization_id = '<uuid>';
```

The RLS policy then filters rows automatically:

| Operation                  | Behavior                                                               |
| -------------------------- | ---------------------------------------------------------------------- |
| `SELECT`                   | Rows from the current org **and** any descendant orgs.                 |
| `INSERT / UPDATE / DELETE` | Only allowed against the current org. Parents can't write to children. |

### 3. Hierarchy

Organizations have an optional `parentOrganizationId`. A parent can read down the tree but not write to it; siblings are isolated from each other; children are completely isolated.

```
Company (Parent Org)
├── Marketing Team       → reads only its own data
├── Engineering Team     → reads only its own data
└── Sales Team           → reads only its own data

Company → reads ALL of the above + its own
```

### Bypassing RLS

System operations (seed scripts, migrations, cron jobs) use `systemContext()`:

```ts
import { systemContext } from '@aphexcms/cms-core/server';

const docs = await api.collections.post.find(
	systemContext('org-id'), // overrideAccess: true
	{ perspective: 'published' }
);
```

This sets `app.override_access = true` and bypasses RLS. Use sparingly.

### Disabling multi-tenancy

If you don't need it, disable both flags in the provider config. RLS still adds about 0.5–1 ms per query — measurable at scale.

```ts
const provider = createPostgreSQLProvider({
	client,
	multiTenancy: { enableRLS: false, enableHierarchy: false }
});
```

---

## Capability-Based Access Control

AphexCMS's access control is **capability-based**, not role-based. Roles are named bundles of capabilities; the actual gates check capability strings.

### Capabilities

The atomic unit. Examples: `document.read`, `document.publish`, `asset.upload`, `member.invite`, `role.manage`, `org.settings`.

The full list lives in `packages/cms-core/src/lib/types/capabilities.ts`. Write capabilities automatically imply matching reads — creating a role with `document.create` but not `document.read` would lock members out of seeing their own edits, so the server normalizes them on intake.

### Built-in roles

Every new organization seeds four built-in roles:

| Role     | Capabilities                                                                              |
| -------- | ----------------------------------------------------------------------------------------- |
| `viewer` | Read-only — `document.read` and `asset.read`.                                             |
| `editor` | All document and asset capabilities.                                                      |
| `admin`  | Everything `editor` has, plus `member.*`, `apiKey.manage`, `role.manage`, `org.settings`. |
| `owner`  | Every capability, plus the hardcoded ability to delete the organization.                  |

Built-in roles are **editable** (you can add or remove capabilities) but can't be deleted.

### Custom roles

Organizations can define their own named bundles via `POST /api/roles`. Custom roles can use any capability list, can be assigned at invitation time, and can be referenced by name in schema-level access rules. They can't reuse a built-in name and can't be deleted while assigned to any member or pending invitation.

`RolesService` caches resolved capability sets for 30 seconds to keep request-time checks synchronous.

### Schema-level rules

Schemas can opt into per-operation role allowlists or arbitrary policy functions:

```ts
const invoice: SchemaType = {
	type: 'document',
	name: 'invoice',
	access: {
		read: ['admin', 'owner', 'Accountant'],
		update: ({ auth, doc }) => {
			if (auth.type !== 'session') return false;
			return doc?.createdBy === auth.user.id;
		},
		delete: ['owner']
	},
	fields: [
		/* ... */
	]
};
```

### Field-level rules

Per-field `read` / `update` allowlists that run on top of schema rules. Hidden reads strip the field from API responses; locked writes drop silently at the API boundary.

```ts
{
  name: 'internalNotes',
  type: 'text',
  access: { read: ['admin', 'owner'], update: ['admin', 'owner'] }
}
```

### Instance roles override

Every user has a system-wide instance role on their CMS profile (`super_admin` / `admin` / `editor` / `viewer`). Instance `super_admin` and `admin` bypass every capability and access rule — they're the break-glass path. `effectiveOrganizationRole(auth)` returns `'owner'` for them, which is what schema rule lists match against.

---

## Document Workflow & Publishing

### Document shape

```ts
interface Document {
	id: string;
	type: string; // schema name
	status: 'draft' | 'published' | null;

	draftData: any; // current working copy
	publishedData: any; // live version
	publishedHash: string | null; // 20-char base36 hash

	createdBy: string;
	updatedBy: string | null;
	publishedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}
```

### Hash-based change detection

`publishedHash` is a 20-char base36 hash of the published payload with sorted object keys for stable comparison. The admin UI compares the current draft hash against `publishedHash` to decide whether to show "you have unpublished changes." Source: `packages/cms-core/src/lib/utils/content-hash.ts`.

### Auto-save

`DocumentEditor.svelte` schedules a 2-second debounced save via `$effect`:

```ts
$effect(() => {
	const _data = documentData;
	hasUnsavedChanges = true;
	if (autoSaveTimer) clearTimeout(autoSaveTimer);
	autoSaveTimer = setTimeout(() => {
		if (hasUnsavedChanges && !hasValidationErrors) {
			saveDocument(false); // save without publishing
		}
	}, 2000);
});
```

### Publishing

1. Edits → draft data updates → hash drifts.
2. Auto-save → draft persisted → version row written with `eventType: 'draft'`.
3. Publish → draft copied to `publishedData` → new hash computed → `publishedAt` set → version row written with `eventType: 'publish'`.
4. Unpublish → `publishedData` and `publishedHash` cleared, status reverts to `'draft'`.

### Focus mode

The document editor has a focus mode toggle (`focusMode` prop + `onToggleFocus` callback). It's a UI affordance only — the editor delegates layout control to the parent (`AdminApp.svelte`) which hides side panels when active. The breadcrumb and a minimize button restore the normal layout.

---

## Version History

Every draft save and publish writes an immutable snapshot to `cms_document_versions`. Configured in `aphex.config.ts`:

```ts
createCMSConfig({
	versioning: {
		maxVersions: 25 // default — set 0 for unlimited
	}
});
```

### Schema

| Column           | Type        | Description                                 |
| ---------------- | ----------- | ------------------------------------------- |
| `id`             | `uuid`      | Primary key                                 |
| `documentId`     | `uuid`      | FK to `cms_documents`                       |
| `organizationId` | `uuid`      | FK to `cms_organizations`                   |
| `versionNumber`  | `integer`   | Monotonic per document                      |
| `eventType`      | `enum`      | `'draft'` or `'publish'`                    |
| `data`           | `jsonb`     | Full document data at the time of the event |
| `createdBy`      | `text`      | User ID, or `apikey:<keyId>` for API keys   |
| `createdAt`      | `timestamp` | Server time                                 |

### Endpoints

- `GET /api/documents/:id/versions?limit=25&offset=0` — list, newest first, with `createdByName` resolved.
- `GET /api/documents/:id/versions/:versionNumber` — fetch one.
- `POST /api/documents/:id/versions/:versionNumber/restore` — replace the draft with the snapshot's data; writes a new draft-event version recording the restore.

### Programmatic access

`localAPI.versionService` exposes `listVersions`, `getVersion`, `restoreVersion` for migrations and scripts. The HTTP routes are thin wrappers around it.

### Rolling cleanup

When a document's version count exceeds `maxVersions`, the oldest entry is deleted on the next write. Setting `maxVersions: 0` disables cleanup — appropriate when you need full audit trails, but watch storage on heavily-edited documents.

---

## Field System & Validation

### Field rendering

`SchemaField.svelte` is a switch on `field.type` that picks the right per-type editor:

```svelte
{#if field.type === 'string'}
  <StringField {field} {value} {onUpdate} />
{:else if field.type === 'array'}
  <ArrayField {field} {value} {onUpdate} />
{:else if field.type === 'object'}
  <ObjectField {field} {value} {onUpdate} />
{:else if field.type === 'reference'}
  <ReferenceField {field} {value} {onUpdate} />
{:else if /* ... 9 more types ... */}
{/if}
```

### Adding a field type

1. Extend `FieldType` in `packages/cms-core/src/lib/types/schemas.ts`.
2. Add the per-field interface (e.g. `MyField extends BaseField { type: 'myType'; ... }`).
3. Build the editor component in `packages/cms-core/src/lib/components/admin/fields/`.
4. Wire it into `SchemaField.svelte`.
5. (Optional) Add validators and a GraphQL type mapping.

### Validation API

A Sanity-style fluent rule builder in `packages/cms-core/src/lib/field-validation/`:

```ts
{
  name: 'email',
  type: 'string',
  validation: (Rule) => Rule.required().email()
}

{
  name: 'price',
  type: 'number',
  validation: (Rule) => Rule.required().positive().min(0.01)
}
```

The `Rule` class supports `required`, `optional`, `min`, `max`, `email`, `uri`, `regex`, `positive`, `negative`, `integer`, `greaterThan`, `lessThan`, `custom(fn)`, plus message helpers `error()` / `warning()` / `info()`.

Validation runs on field blur (not every keystroke), shows inline errors, blocks auto-save when invalid, and prevents publishing until all errors are resolved.

### Reference resolution

Reference fields support nested depth resolution:

```bash
GET /api/documents/page-123                # depth 0 — refs come back as { _ref: '...' }
GET /api/documents/page-123?depth=1        # one level resolved
GET /api/documents/page-123?depth=2        # two levels resolved
```

Capped at 5. Circular references are detected via a visited set and skipped.

---

## Storage & Assets

### `StorageAdapter` interface

```ts
interface StorageAdapter {
	readonly name: string;

	// Required
	store(data: UploadFileData): Promise<StorageFile>;
	delete(path: string): Promise<boolean>;
	exists(path: string): Promise<boolean>;
	getUrl(path: string): string;
	getStorageInfo(): Promise<{ totalSize: number; availableSpace?: number }>;
	isHealthy(): Promise<boolean>;

	// Optional
	connect?(): Promise<void>;
	disconnect?(): Promise<void>;
	getObject?(path: string): Promise<Buffer>;
	listObjects?(options?: ListObjectsOptions): Promise<ListObjectsResult>;
	copyObject?(sourcePath: string, destPath: string): Promise<boolean>;
	getObjectMetadata?(path: string): Promise<StorageObjectMetadata>;
	getSignedUrl?(path: string, expiresIn?: number): Promise<string>;
}
```

### Built-in adapters

- **Local filesystem** — default. Files in `./storage/assets`, served at `/media/{id}/{filename}` via Aphex's CDN handler with access control + 1y cache.
- **`@aphexcms/storage-s3`** — S3-compatible (AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces, Backblaze B2).

### Asset processing

On upload, `AssetService`:

1. Validates MIME type and size.
2. For images: extracts dimensions, format, color space, dominant color, ICC profile, alpha, density via [Sharp](https://sharp.pixelplumbing.com/).
3. Stores via the adapter (S3 helpers add a timestamp + random suffix to filenames).
4. Inserts a row into `cms_assets` with the metadata.
5. Returns a content-addressed URL.

If the database write fails, the storage write is rolled back.

### Adapter tracking for migrations

Each `cms_assets` row stores `storageAdapter` (e.g. `'local'` or `'s3'`). This lets you mix backends — old local assets keep working through the local adapter while new uploads flow into S3. Deleting an asset stored by a different adapter logs a warning instead of silently dropping the row.

---

## API Layer

### Local API (in-process)

The `LocalAPI` is the ground truth — every other API surface (HTTP, GraphQL) is a thin wrapper. It's the canonical way to read and write content from inside your SvelteKit app.

```ts
const api = locals.aphexCMS.localAPI;
const ctx = authToContext(locals.auth);

const result = await api.collections.post.find(ctx, {
	where: { status: { equals: 'published' } },
	perspective: 'published',
	sort: '-publishedAt',
	limit: 20
});

// Singletons:
const nav = await api.collections.siteNavigation.get(ctx, {
	perspective: 'published'
});

// Versions:
const versions = await api.versionService.listVersions(/* ... */);
```

Every operation is gated by capability-based permission checks unless the context has `overrideAccess: true`.

### HTTP API (Hono)

All endpoints are Hono routers mounted onto a single app via `mountAphexBuiltins()`. Routers live in `packages/cms-core/src/lib/server/api/routes/`:

- `documents.ts` / `document-versions.ts` — CRUD, query, publish/unpublish, versions, restore
- `assets.ts` — upload, list, metadata, delete
- `schemas.ts` — schema introspection
- `roles.ts` — capability-based RBAC management
- `organizations.ts` — orgs, members, invitations
- `users.ts` — profile management
- `instance-settings.ts` — single-row instance config

Custom routes from the `api(app)` config hook are mounted **before** built-ins, so they can wrap or override built-in endpoints. The studio's `/api/[...slug]/+server.ts` forwards everything to the Hono app.

### Extending the API — `api(app)` hook

The escape hatch for everything that used to be a "plugin." Pass a function to `api` in `createCMSConfig` and you get the Hono app object before the built-in routes mount:

```ts
createCMSConfig({
	api: (app) => {
		app.post('/send-invoice', async (c) => {
			const { aphexCMS, auth } = c.var;
			// Full access to localAPI, services, adapters, resolved auth
			return c.json({ success: true });
		});

		app.use('/organizations/invitations', async (c, next) => {
			await next();
			if (c.res.status === 201) sendCustomNotification();
		});
	}
});
```

`c.var.aphexCMS` is the same DI container available on `event.locals`; `c.var.auth` is the resolved `Auth` for the request.

### GraphQL

Auto-generated from your schema types — no manual schema files. For each document type the generator emits:

- `<name>(id, perspective, depth): T` and `all<Name>(where, perspective, limit, offset, sort, depth): [T!]!`
- `create<Name>`, `update<Name>`, `delete<Name>`, `publish<Name>`, `unpublish<Name>` mutations
- `<Name>WhereInput`, `<Name>DataInput`, plus per-type filter inputs

Singletons get a different shape (no `id` arg, no `all*` query, no `create / delete` mutations).

GraphQL is enabled by default at `/api/graphql`. The base template moves it to `/api/aphex-graphql` to leave the canonical path free for app-specific GraphQL.

---

## Frontend Architecture

### UI component library

`@aphexcms/ui` wraps [shadcn-svelte](https://shadcn-svelte.com) and is shared between cms-core and apps/studio. Components live in `packages/ui/src/lib/components/ui/` — copy-paste architecture, no eject step.

```ts
import { Button } from '@aphexcms/ui/shadcn/button';
import { Dialog } from '@aphexcms/ui/shadcn/dialog';
```

Tailwind v4 with shared CSS variables in `packages/ui/src/lib/app.css`. Theme tokens are scoped so the studio's dark theme doesn't leak into landing pages.

### Admin layout

3-panel layout inspired by Sanity:

```
┌─────────────────────────────────────────────────────┐
│  [Logo]  Sidebar              Header     [User ▾]   │
├────────────┬─────────────────┬──────────────────────┤
│  Document  │   Document      │  Document Editor     │
│   Types    │   List          │                      │
│            │                 │  ┌──────────────────┐│
│ Pages      │   Homepage      │  │ Title:           ││
│ Catalogs   │   About         │  │ [____________]   ││
│ ...        │   Contact       │  │                  ││
│            │                 │  │ Slug:            ││
│            │   + New Page    │  │ [homepage____]   ││
│            │                 │  │                  ││
│            │                 │  │ Content:         ││
│            │                 │  │ [ + Add block ]  ││
│            │                 │  └──────────────────┘│
│            │                 │  [Publish] [Delete]  │
└────────────┴─────────────────┴──────────────────────┘
```

Responsive: side-by-side on desktop, stacked with breadcrumbs on tablet, full-screen panels with back buttons on mobile. Singletons skip the document-list panel entirely.

### Key components

- **`AdminApp.svelte`** — root, manages navigation state, renders the 3-panel layout.
- **`DocumentEditor.svelte`** — schema-driven form, auto-save, validation orchestration, publish flow, focus mode, version history panel.
- **`SchemaField.svelte`** — dispatches to per-type field editors.
- **`ArrayField.svelte`** — drag-and-drop reordering, block-type selection, nested object editing.
- **`ReferenceField.svelte`** — searchable picker, modal-based nested editing, single-instance guard.

### Svelte 5 runes

Reactivity is rune-based throughout — `$state`, `$derived`, `$effect`, `$props`. No `$:` labels, no `export let`.

```ts
let documentData = $state<Record<string, any>>({});
const hasChanges = $derived(hasUnpublishedChanges(documentData, fullDocument?.publishedHash));
$effect(() => {
	hasUnsavedChanges = true;
	scheduleAutoSave();
});
```

---

## Future Roadmap

- **Real-time collaboration** — WebSocket-based presence, conflict resolution for concurrent edits.
- **Advanced workflows** — approval gates (draft → review → published), scheduled publishing, content expiration.
- **Localization (i18n)** — multi-language documents, field-level translations, language switcher in the admin.
- **Media library** — folder organization for assets, bulk upload, image editing.
- **Live preview** — device frame simulator, preview tokens for unpublished content.

(Version history, singletons, and capability-based RBAC graduated from this list — they shipped.)

---

## See also

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — dev setup, code standards, PR process.
- **[README.md](./README.md)** — quick start and high-level features.
- **[Docs site](https://docs.getaphex.com)** — user-facing documentation.
- **`packages/cms-core/src/lib/types/`** — TypeScript source of truth.
- **`apps/studio/`** — reference implementation.
