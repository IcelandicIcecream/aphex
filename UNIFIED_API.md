# Unified API Implementation Plan

> **A comprehensive plan to create a Payload-style Local API for Aphex CMS, consolidating GraphQL, REST, and direct database access into a unified, type-safe interface.**

---

## Table of Contents

1. [Overview](#overview)
2. [Ports & Adapters Architecture](#ports--adapters-architecture)
3. [Current Architecture Analysis](#current-architecture-analysis)
4. [Goals & Requirements](#goals--requirements)
5. [Architecture Design](#architecture-design)
6. [RLS Bypass Solution](#rls-bypass-solution)
7. [Implementation Phases](#implementation-phases)
8. [Detailed Roadmap](#detailed-roadmap)
9. [Supporting Multiple Database Adapters](#supporting-multiple-database-adapters)
10. [Tool Recommendations](#tool-recommendations)
11. [Usage Examples](#usage-examples)
12. [Migration Strategy](#migration-strategy)

---

## Overview

### The Problem

Currently, Aphex CMS has three separate API surfaces with duplicated logic:

1. **GraphQL (Yoga Plugin)** - Great for external queries, but HTTP-bound
2. **REST Endpoints (cms-core)** - Comprehensive but tied to SvelteKit RequestEvent
3. **Database Adapter** - Low-level, no unified filtering, no type safety

This creates:
- ❌ Code duplication between GraphQL resolvers and REST handlers
- ❌ No way to query from server components/scripts without HTTP
- ❌ Inconsistent filtering capabilities across APIs
- ❌ Lack of type safety for programmatic usage
- ❌ RLS policy challenges for system operations (seed scripts, cron jobs)

### The Solution

Implement a **Payload-inspired Local API** that:
- ✅ Provides a unified operations layer (`localAPI.collections.pages.find()`)
- ✅ Works directly against the database (no HTTP overhead)
- ✅ Has advanced, type-safe filtering (`where`, operators, field-based queries)
- ✅ Generates TypeScript types from schemas
- ✅ Supports `overrideAccess` for system operations (bypasses RLS)
- ✅ Becomes the single source of truth for GraphQL and REST
- ✅ Maintains ports & adapters pattern (easy to support SQLite, MongoDB, etc.)

---

## Ports & Adapters Architecture

### Why This Matters

Aphex CMS uses **Hexagonal Architecture** (Ports & Adapters) to keep the core business logic database-agnostic. This means:

**Ports (Interfaces)** - Defined in `cms-core`:
- Contracts that define what operations are available
- No implementation details
- Database-agnostic
- Example: `DocumentAdapter`, `AssetAdapter`, `Where`, `FindOptions`

**Adapters (Implementations)** - Defined in separate packages:
- Concrete implementations for specific databases
- PostgreSQL: `@aphexcms/postgresql-adapter`
- SQLite: `@aphexcms/sqlite-adapter` (future)
- MongoDB: `@aphexcms/mongodb-adapter` (future)

**Benefits:**
- ✅ Swap databases without touching core logic
- ✅ Test with in-memory adapters
- ✅ Support multiple databases simultaneously
- ✅ Clear separation of concerns

### Current Structure

```
packages/cms-core/                     [PORTS - Interfaces]
├── src/lib/types/
│   ├── document.ts                    ← Document type definition
│   └── config.ts                      ← CMS configuration
│
├── src/lib/db/interfaces/
│   ├── document.ts                    ← DocumentAdapter interface (contract)
│   ├── asset.ts                       ← AssetAdapter interface
│   └── index.ts                       ← DatabaseAdapter (combines all)
│
└── ... (business logic uses interfaces)

packages/postgresql-adapter/           [ADAPTER - PostgreSQL Implementation]
├── src/
│   ├── document-adapter.ts            ← implements DocumentAdapter
│   ├── asset-adapter.ts               ← implements AssetAdapter
│   └── index.ts                       ← PostgreSQLAdapter (combines all)

packages/sqlite-adapter/               [ADAPTER - SQLite Implementation (future)]
└── src/
    ├── document-adapter.ts            ← implements DocumentAdapter
    └── index.ts                       ← SQLiteAdapter

packages/mongodb-adapter/              [ADAPTER - MongoDB Implementation (future)]
└── src/
    ├── document-adapter.ts            ← implements DocumentAdapter
    └── index.ts                       ← MongoDBAdapter
```

### Where New Filter Interfaces Go

Following the ports & adapters pattern:

**Interfaces (Ports)** → `cms-core/src/lib/types/` and `cms-core/src/lib/db/interfaces/`:
```typescript
// packages/cms-core/src/lib/types/filters.ts
export interface Where { ... }
export interface FindOptions { ... }
export interface FindResult<T> { ... }

// packages/cms-core/src/lib/db/interfaces/document.ts
export interface DocumentAdapter {
  // NEW: Advanced filtering methods (contract only)
  findManyDocAdvanced(
    organizationId: string,
    collectionName: string,
    options: FindOptions
  ): Promise<FindResult<Document>>;
}
```

**Implementations (Adapters)** → `postgresql-adapter/`, `sqlite-adapter/`, etc.:
```typescript
// packages/postgresql-adapter/src/document-adapter.ts
export class PostgreSQLDocumentAdapter implements DocumentAdapter {
  // Implementation using Drizzle + PostgreSQL
  async findManyDocAdvanced(...) { ... }
}

// packages/sqlite-adapter/src/document-adapter.ts (future)
export class SQLiteDocumentAdapter implements DocumentAdapter {
  // Implementation using Drizzle + SQLite
  async findManyDocAdvanced(...) { ... }
}
```

**This ensures:**
- ✅ Filter types are database-agnostic (in cms-core)
- ✅ Each adapter implements filters in their own way
- ✅ Adding SQLite/MongoDB is just a new adapter package
- ✅ Core logic never changes when adding new databases

---

## Current Architecture Analysis

### GraphQL (Yoga Plugin)

**Location:** `packages/graphql-plugin/`

**Strengths:**
- ✅ Auto-generated schemas from CMS types
- ✅ Nested reference resolution
- ✅ Perspective support (draft/published)

**Weaknesses:**
- ❌ HTTP-only (can't use in server components)
- ❌ Limited filtering (no field-based operators)
- ❌ Business logic duplicated from REST

**Current Flow:**
```
GraphQL Query → Yoga Server → Custom Resolvers → Database Adapter
```

### REST Endpoints (cms-core)

**Location:** `packages/cms-core/src/lib/routes/`

**Strengths:**
- ✅ Comprehensive CRUD operations
- ✅ Auth & multi-tenancy support
- ✅ Organization-scoped with RLS

**Weaknesses:**
- ❌ Tied to SvelteKit `RequestEvent` pattern
- ❌ Can't reuse from non-HTTP contexts
- ❌ Business logic duplicated from GraphQL

**Current Flow:**
```
HTTP Request → SvelteKit Route → Business Logic → Database Adapter
```

### Database Adapter

**Location:** `packages/postgresql-adapter/`, `packages/cms-core/src/lib/db/`

**Strengths:**
- ✅ Clean abstraction (ports & adapters pattern)
- ✅ Multi-tenancy with RLS
- ✅ Hierarchical organization support

**Weaknesses:**
- ❌ Low-level (no operations layer)
- ❌ Basic filtering only
- ❌ No type generation

**Current Flow:**
```
Adapter Method → SQL Query (via Drizzle) → PostgreSQL
```

### Key Gaps Identified

| Gap | Impact | Priority |
|-----|--------|----------|
| No Local API | Can't use in RSC/scripts without HTTP | 🔴 Critical |
| Code Duplication | Harder to maintain, inconsistent behavior | 🔴 Critical |
| Limited Filtering | Poor DX, manual workarounds needed | 🟡 High |
| No Type Generation | Runtime errors, poor IDE support | 🟡 High |
| RLS Bypass Difficulty | Using API keys in .env is hacky | 🟡 High |
| No filter interfaces in cms-core | Can't share filter types across adapters | 🟡 High |

---

## Goals & Requirements

### Primary Goals

1. **Unified Operations Layer**
   - Single source of truth for all data operations
   - GraphQL and REST become thin wrappers

2. **Type Safety**
   - Generated TypeScript interfaces from schemas
   - Full IDE autocomplete and type checking

3. **Advanced Filtering**
   - Field-based queries with operators
   - Support for `equals`, `in`, `contains`, `gt`, `lt`, etc.
   - Nested `AND`/`OR` logic

4. **Server-Side First**
   - Use directly in server components, hooks, scripts
   - No HTTP overhead for internal operations

5. **RLS-Aware**
   - Respect multi-tenancy by default
   - Provide `overrideAccess` for system operations

6. **Maintain Ports & Adapters**
   - Filter interfaces defined in cms-core
   - Each adapter implements filters for their database
   - Easy to add SQLite, MongoDB, etc.

### Requirements from User

> "the important things to have: CRUD - dynamic type safety - dynamic filters - filter by field"

**CRUD Operations:**
- `find()` - Query multiple documents with filters
- `findByID()` - Get single document by ID
- `create()` - Create new document
- `update()` - Update existing document
- `delete()` - Delete document
- `publish()` / `unpublish()` - Document lifecycle

**Dynamic Type Safety:**
- Generated types: `Page`, `Catalog`, etc.
- Collection API: `CollectionAPI<Page>`
- Type inference from schema definitions

**Dynamic Filters:**
- Runtime-defined filter objects
- Type-safe filter builder
- Schema-validated filters

**Filter by Field:**
```typescript
where: {
  'title': { contains: 'blog' },
  'publishedAt': { greater_than: new Date('2024-01-01') },
  'author.name': { equals: 'John' }
}
```

---

## Architecture Design

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Client/API Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │   GraphQL    │  │     REST     │  │  Server Code     │      │
│  │    (Yoga)    │  │   Handlers   │  │  (RSC/Scripts)   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             ▼
          ┌──────────────────────────────────────────────┐
          │    Local API Layer (cms-core) [NEW]          │
          │    Type-safe, Unified Operations             │
          │                                               │
          │  • localAPI.collections.pages.find(...)      │
          │  • localAPI.collections.pages.create(...)    │
          │  • Advanced filtering & type safety          │
          │  • Auth & permission handling                │
          │  • RLS bypass support (overrideAccess)       │
          └─────────────────┬────────────────────────────┘
                            ▼
          ┌──────────────────────────────────────────────┐
          │   Database Adapter Interface (cms-core)      │
          │   [PORTS - Database-agnostic contracts]      │
          │                                               │
          │  • DocumentAdapter interface                 │
          │  • AssetAdapter interface                    │
          │  • Where, FindOptions types                  │
          └─────────────────┬────────────────────────────┘
                            ▼
          ┌──────────────────────────────────────────────┐
          │   Adapter Implementation (separate package)  │
          │   [ADAPTER - Database-specific code]         │
          │                                               │
          │  PostgreSQL:                                 │
          │  • Filter parser (WHERE → Drizzle SQL)       │
          │  • Dynamic query builder                     │
          │  • RLS context management                    │
          │                                               │
          │  SQLite (future):                            │
          │  • Filter parser (WHERE → SQLite SQL)        │
          │                                               │
          │  MongoDB (future):                           │
          │  • Filter parser (WHERE → MongoDB query)     │
          └─────────────────┬────────────────────────────┘
                            ▼
          ┌──────────────────────────────────────────────┐
          │              Database                         │
          │   (PostgreSQL / SQLite / MongoDB)            │
          └──────────────────────────────────────────────┘
```

### File Structure (Ports & Adapters)

```
packages/cms-core/                        [BUSINESS LOGIC + PORTS]
├── src/lib/
│   ├── types/
│   │   ├── filters.ts                    ← NEW: Where, FindOptions, FindResult
│   │   ├── document.ts                   ← Existing
│   │   ├── schemas.ts                    ← Existing
│   │   └── config.ts                     ← Existing
│   │
│   ├── db/interfaces/                    [PORTS - Contracts]
│   │   ├── document.ts                   ← UPDATE: Add findManyDocAdvanced()
│   │   ├── asset.ts                      ← UPDATE: Add findManyAssetsAdvanced()
│   │   └── index.ts                      ← DatabaseAdapter combines all
│   │
│   └── local-api/                        [NEW - Business Logic]
│       ├── types.ts                      ← LocalAPIContext
│       ├── collection-api.ts             ← CollectionAPI class
│       ├── permissions.ts                ← PermissionChecker
│       └── index.ts                      ← LocalAPI class + getLocalAPI()

packages/postgresql-adapter/              [ADAPTER - PostgreSQL]
├── src/
│   ├── document-adapter.ts               ← IMPLEMENT: findManyDocAdvanced()
│   ├── asset-adapter.ts                  ← IMPLEMENT: findManyAssetsAdvanced()
│   ├── filter-parser.ts                  ← NEW: Where → Drizzle SQL
│   └── index.ts                          ← PostgreSQLAdapter

packages/sqlite-adapter/                  [ADAPTER - SQLite (future)]
├── src/
│   ├── document-adapter.ts               ← IMPLEMENT: findManyDocAdvanced()
│   ├── filter-parser.ts                  ← NEW: Where → SQLite SQL
│   └── index.ts                          ← SQLiteAdapter

packages/mongodb-adapter/                 [ADAPTER - MongoDB (future)]
├── src/
│   ├── document-adapter.ts               ← IMPLEMENT: findManyDocAdvanced()
│   ├── filter-parser.ts                  ← NEW: Where → MongoDB query
│   └── index.ts                          ← MongoDBAdapter
```

### Core Types (Defined in cms-core)

```typescript
// packages/cms-core/src/lib/types/filters.ts

/**
 * Field filter operators (database-agnostic)
 */
export interface FieldFilter {
  // Comparison operators
  equals?: any;
  not_equals?: any;
  in?: any[];
  not_in?: any[];

  // Existence
  exists?: boolean;

  // Numeric/Date comparisons
  greater_than?: number | Date;
  greater_than_equal?: number | Date;
  less_than?: number | Date;
  less_than_equal?: number | Date;

  // String operations
  like?: string;
  contains?: string;
  starts_with?: string;
  ends_with?: string;
}

/**
 * WHERE clause for filtering (database-agnostic)
 * Each adapter will parse this into their specific query language
 */
export interface Where {
  [field: string]: FieldFilter | any;

  // Nested logical operators
  and?: Where[];
  or?: Where[];
}

/**
 * Options for find operations (database-agnostic)
 */
export interface FindOptions {
  where?: Where;
  limit?: number;
  offset?: number;
  sort?: string | string[];
  depth?: number;  // Reference resolution depth
  select?: string[];  // Field selection
  perspective?: 'draft' | 'published';
}

/**
 * Result from find operations with pagination metadata
 */
export interface FindResult<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  offset: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```

### Updated Adapter Interfaces (cms-core)

```typescript
// packages/cms-core/src/lib/db/interfaces/document.ts
import type { Where, FindOptions, FindResult } from '../../types/filters';
import type { Document } from '../../types/document';

export interface DocumentAdapter {
  // EXISTING METHODS (keep for backwards compatibility)
  findManyDoc(organizationId: string, filters?: DocumentFilters): Promise<Document[]>;
  findByDocId(organizationId: string, id: string, depth?: number): Promise<Document | null>;
  createDocument(data: CreateDocumentData): Promise<Document>;
  updateDocDraft(organizationId: string, id: string, data: any, updatedBy?: string): Promise<Document | null>;
  deleteDocById(organizationId: string, id: string): Promise<boolean>;
  publishDoc(organizationId: string, id: string): Promise<Document | null>;
  unpublishDoc(organizationId: string, id: string): Promise<Document | null>;

  // NEW: Advanced filtering methods (database-agnostic contract)
  findManyDocAdvanced(
    organizationId: string,
    collectionName: string,
    options: FindOptions
  ): Promise<FindResult<Document>>;

  findByDocIdAdvanced(
    organizationId: string,
    id: string,
    options?: Partial<FindOptions>
  ): Promise<Document | null>;

  countDocuments(
    organizationId: string,
    collectionName: string,
    where?: Where
  ): Promise<number>;

  // ... other existing methods
}
```

### Local API Context (cms-core)

```typescript
// packages/cms-core/src/lib/local-api/types.ts

export interface LocalAPIContext {
  organizationId: string;
  user?: CMSUser;
  overrideAccess?: boolean;  // Bypass RLS and permissions
  req?: any;  // For transactions
}
```

### Collection API (cms-core)

```typescript
// packages/cms-core/src/lib/local-api/collection-api.ts
import type { DocumentAdapter } from '../db/interfaces/document';
import type { Where, FindOptions, FindResult } from '../types/filters';
import type { LocalAPIContext } from './types';

export class CollectionAPI<T = any> {
  constructor(
    private collectionName: string,
    private databaseAdapter: DatabaseAdapter,
    private schema: SchemaType,
    private permissions: PermissionChecker
  ) {}

  async find(
    context: LocalAPIContext,
    options: FindOptions = {}
  ): Promise<FindResult<T>> {
    // Permission check (unless overrideAccess)
    if (!context.overrideAccess) {
      await this.permissions.canRead(context, this.collectionName);
    }

    // Call adapter's advanced find method
    return this.databaseAdapter.findManyDocAdvanced(
      context.organizationId,
      this.collectionName,
      options
    ) as Promise<FindResult<T>>;
  }

  async findByID(
    context: LocalAPIContext,
    id: string,
    options?: Partial<FindOptions>
  ): Promise<T | null> {
    if (!context.overrideAccess) {
      await this.permissions.canRead(context, this.collectionName);
    }

    return this.databaseAdapter.findByDocIdAdvanced(
      context.organizationId,
      id,
      options
    ) as Promise<T | null>;
  }

  async count(
    context: LocalAPIContext,
    options?: { where?: Where }
  ): Promise<number> {
    if (!context.overrideAccess) {
      await this.permissions.canRead(context, this.collectionName);
    }

    return this.databaseAdapter.countDocuments(
      context.organizationId,
      this.collectionName,
      options?.where
    );
  }

  // ... create, update, delete, publish, unpublish
}
```

---

## RLS Bypass Solution

### The Challenge

**Current Issue:**
> "Currently, I'm creating an API key from the admin panel and then using that in the .env -- I feel like there should be a better way to do this."

Your current RLS setup (from `packages/postgresql-adapter/src/index.ts`):

```typescript
async withOrgContext<T>(organizationId: string, fn: () => Promise<T>): Promise<T> {
  if (!this.rlsEnabled) {
    return fn();
  }

  // Use transaction with SET LOCAL
  return this.db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.organization_id = '${organizationId}'`));
    return fn();
  });
}
```

**The problem:**
- System operations (seed scripts, cron jobs, local API) need to bypass RLS
- Creating an API key for every system operation is cumbersome
- No clean way to run "system-level" queries that can see all organizations

### Recommended Solution: Database Service Role

**Approach:** Create a special database role with RLS bypass privileges, similar to Supabase's `service_role`.

#### Step 1: Create System Database Role

```sql
-- Create a service role that bypasses RLS
CREATE ROLE aphex_service_role LOGIN PASSWORD 'your-secure-password';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO aphex_service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aphex_service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aphex_service_role;

-- CRITICAL: Allow this role to bypass RLS
ALTER ROLE aphex_service_role SET row_security = off;

-- Alternative: Grant BYPASSRLS privilege (PostgreSQL 9.5+)
ALTER ROLE aphex_service_role WITH BYPASSRLS;
```

#### Step 2: Create Separate Connection for System Operations

```typescript
// apps/studio/src/lib/server/db/system-db.ts
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { createPostgreSQLProvider } from '@aphexcms/postgresql-adapter';
import * as cmsSchema from './cms-schema';

// System connection uses service role (bypasses RLS)
export const systemClient = postgres(env.DATABASE_SYSTEM_URL, {
  max: 2  // Low pool size since this is for system ops only
});

const systemDbInstance = drizzle(systemClient, { schema: cmsSchema });

const systemProvider = createPostgreSQLProvider({
  client: systemClient,
  multiTenancy: {
    enableRLS: false,  // Service role already bypasses RLS
    enableHierarchy: false
  }
});

export const systemDb = systemProvider.createAdapter();
```

```env
# .env
# Regular user connection (respects RLS)
DATABASE_URL="postgresql://aphex_user:password@localhost:5432/aphex"

# System service role connection (bypasses RLS)
DATABASE_SYSTEM_URL="postgresql://aphex_service_role:secure-password@localhost:5432/aphex"
```

#### Step 3: Use in Local API

```typescript
// packages/cms-core/src/lib/local-api/index.ts

class LocalAPI {
  constructor(
    private config: CMSConfig,
    private userAdapter: DatabaseAdapter,  // Regular adapter (RLS enabled)
    private systemAdapter: DatabaseAdapter,  // System adapter (RLS bypass)
    private cmsEngine: CMSEngine
  ) {
    this.collections = this.initializeCollections();
  }

  private getAdapter(context: LocalAPIContext): DatabaseAdapter {
    // If overrideAccess is true, use system adapter
    if (context.overrideAccess) {
      return this.systemAdapter;
    }

    // Otherwise use regular adapter with RLS
    return this.userAdapter;
  }
}
```

### Recommendation

**Use Solution: Database Service Role**

**Why:**
- ✅ **Database-enforced security** - Can't accidentally leak data
- ✅ **Clean separation** - System ops vs user ops
- ✅ **Auditable** - Can track which operations used service role
- ✅ **Familiar pattern** - Used by Supabase, PostgREST, etc.
- ✅ **Scales well** - Easy to add more service roles if needed

**When to use each adapter:**

| Use Case | Adapter | Context |
|----------|---------|---------|
| HTTP API requests | `userAdapter` | `{ organizationId: auth.org }` |
| GraphQL queries | `userAdapter` | `{ organizationId: auth.org }` |
| Seed scripts | `systemAdapter` | `{ overrideAccess: true }` |
| Cron jobs | `systemAdapter` | `{ overrideAccess: true }` |
| Admin operations | `systemAdapter` | `{ overrideAccess: true }` |
| Server components (user context) | `userAdapter` | `{ organizationId: user.org }` |
| Server components (system context) | `systemAdapter` | `{ overrideAccess: true }` |

---

## Implementation Phases

### Phase 1: Filter Interfaces & Types (Week 1, Days 1-2)

**Goal:** Define database-agnostic filter contracts in cms-core

**Tasks:**

1. **Create filter type definitions**
   - File: `packages/cms-core/src/lib/types/filters.ts`
   - Define `FieldFilter`, `Where`, `FindOptions`, `FindResult`
   - Export from `@aphexcms/cms-core/server`

2. **Update DocumentAdapter interface**
   - File: `packages/cms-core/src/lib/db/interfaces/document.ts`
   - Add `findManyDocAdvanced(...)` method signature
   - Add `findByDocIdAdvanced(...)` method signature
   - Add `countDocuments(...)` method signature
   - Import filter types from `../types/filters`

3. **Update AssetAdapter interface**
   - File: `packages/cms-core/src/lib/db/interfaces/asset.ts`
   - Add `findManyAssetsAdvanced(...)` method signature
   - Add `countAssets(...)` with Where support

4. **Update exports**
   - File: `packages/cms-core/src/lib/server.ts`
   - Export all filter types: `Where`, `FieldFilter`, `FindOptions`, `FindResult`

**Deliverables:**
- [ ] `types/filters.ts` created with all type definitions
- [ ] `DocumentAdapter` interface updated with advanced methods
- [ ] `AssetAdapter` interface updated
- [ ] All types exported from package
- [ ] TypeScript compiles successfully

---

### Phase 2: Local API Core (Week 1, Days 3-5)

**Goal:** Build Local API business logic layer

**Tasks:**

1. **Create LocalAPIContext type**
   - File: `packages/cms-core/src/lib/local-api/types.ts`
   - Define `LocalAPIContext` interface
   - Export from local-api module

2. **Create PermissionChecker**
   - File: `packages/cms-core/src/lib/local-api/permissions.ts`
   - Implement `PermissionChecker` class
   - Methods: `canRead()`, `canWrite()`, `canDelete()`
   - Respect `overrideAccess` flag

3. **Create CollectionAPI class**
   - File: `packages/cms-core/src/lib/local-api/collection-api.ts`
   - Implement `find()`, `findByID()`, `count()`
   - Implement `create()`, `update()`, `delete()`
   - Implement `publish()`, `unpublish()` (for documents)
   - Add permission checking before operations
   - Call adapter's advanced methods

4. **Create LocalAPI singleton**
   - File: `packages/cms-core/src/lib/local-api/index.ts`
   - Implement `LocalAPI` class
   - Initialize collections from schema
   - Support dual adapters (user + system)
   - Implement `getAdapter()` method
   - Create `getLocalAPI()` factory function

5. **Update CMSConfig**
   - File: `packages/cms-core/src/lib/types/config.ts`
   - Add optional `systemDatabase?: DatabaseAdapter`
   - Update `CMSInstances` to include `localAPI: LocalAPI`

6. **Update createCMSHook**
   - File: `packages/cms-core/src/lib/hooks.ts`
   - Initialize LocalAPI on startup
   - Pass both user and system adapters
   - Inject into `event.locals.aphexCMS.localAPI`

**Deliverables:**
- [ ] `LocalAPIContext` type defined
- [ ] `PermissionChecker` implemented
- [ ] `CollectionAPI` class with all CRUD methods
- [ ] `LocalAPI` singleton created
- [ ] `getLocalAPI()` factory function
- [ ] CMS hook integration complete
- [ ] Unit tests for CollectionAPI

---

### Phase 3: PostgreSQL Adapter Implementation (Week 2, Days 1-3)

**Goal:** Implement advanced filtering in PostgreSQL adapter

**Tasks:**

1. **Create filter parser**
   - File: `packages/postgresql-adapter/src/filter-parser.ts`
   - Function: `parseWhere(where: Where, schema: SchemaType): SQL`
   - Handle all operators: `equals`, `in`, `contains`, `gt`, `lt`, etc.
   - Handle nested `AND`/`OR` logic
   - Validate field names against schema
   - Handle nested field paths (e.g., `'author.name'`)

2. **Implement findManyDocAdvanced**
   - File: `packages/postgresql-adapter/src/document-adapter.ts`
   - Parse WHERE filters using filter parser
   - Build Drizzle query with dynamic WHERE clause
   - Apply sorting (parse sort string/array)
   - Get total count for pagination
   - Apply limit/offset
   - Calculate pagination metadata
   - Return `FindResult<Document>`

3. **Implement findByDocIdAdvanced**
   - Same file
   - Support `select` field filtering
   - Support `depth` for reference resolution
   - Support `perspective` (draft/published)

4. **Implement countDocuments**
   - Same file
   - Use filter parser for WHERE clause
   - Return count only

5. **Implement for AssetAdapter**
   - File: `packages/postgresql-adapter/src/asset-adapter.ts`
   - Similar implementation for assets
   - `findManyAssetsAdvanced()`
   - `countAssets()` with Where support

6. **Add integration tests**
   - Test all operators
   - Test nested AND/OR
   - Test pagination
   - Test sorting
   - Test field selection
   - Test invalid filters (should throw)

**Deliverables:**
- [ ] Filter parser implemented and tested
- [ ] `findManyDocAdvanced()` fully working
- [ ] `findByDocIdAdvanced()` implemented
- [ ] `countDocuments()` implemented
- [ ] Asset adapter methods implemented
- [ ] Integration tests passing
- [ ] Performance benchmarks documented

---

### Phase 4: Type Generation (Week 2, Days 4-5)

**Goal:** Generate TypeScript types from schemas

**Tasks:**

1. **Create type generator**
   - File: `packages/cms-core/src/lib/codegen/generate-types.ts`
   - Parse `SchemaType` definitions
   - Generate TypeScript interfaces for each document type
   - Handle nested objects
   - Handle array types (union types for multi-type arrays)
   - Handle reference fields
   - Generate `Collections` interface
   - Generate `TypedLocalAPI` interface

2. **Add CLI command**
   - File: `packages/cms-core/src/lib/cli/generate.ts`
   - Command: `aphex generate:types`
   - Watch mode: `aphex generate:types --watch`
   - Accept config file path as argument

3. **Integrate with build**
   - Update `apps/studio/package.json`
   - Add `"generate:types": "aphex generate:types"` script
   - Add to `"build"` script before type-checking
   - Output to `src/lib/generated-types.ts`

4. **Create usage documentation**
   - Document how to use generated types
   - Show examples with Local API
   - Explain re-generation workflow

**Example Generated Output:**

```typescript
// apps/studio/src/lib/generated-types.ts
// This file is auto-generated. Do not edit manually.

import type { CollectionAPI } from '@aphexcms/cms-core/server';

export interface Page {
  id: string;
  type: 'page';
  status: 'draft' | 'published' | null;
  title: string;
  slug: string;
  hero?: Hero;
  content?: Array<TextBlock | ImageBlock | CallToAction>;
  seo?: SEO;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface Hero {
  heading: string;
  subheading?: string;
  image?: Image;
}

// ... other types

export interface Collections {
  pages: CollectionAPI<Page>;
  catalogs: CollectionAPI<Catalog>;
  movies: CollectionAPI<Movie>;
}

export interface TypedLocalAPI {
  collections: Collections;
}
```

**Deliverables:**
- [ ] Type generator implementation
- [ ] CLI command working
- [ ] Build integration
- [ ] Generated types for studio app
- [ ] Documentation on usage

---

### Phase 5: RLS Bypass & System Operations (Week 3, Days 1-2)

**Goal:** Implement secure RLS bypass for system operations

**Tasks:**

1. **Create database service role migration**
   - File: `packages/postgresql-adapter/migrations/XXX_create_service_role.sql`
   - Create `aphex_service_role` role
   - Grant BYPASSRLS privilege
   - Grant necessary table permissions
   - Document password management

2. **Create system database adapter**
   - File: `apps/studio/src/lib/server/db/system-db.ts`
   - Create separate postgres client with service role credentials
   - Create separate Drizzle instance
   - Create PostgreSQL provider with RLS disabled
   - Export `systemDb` adapter

3. **Update environment variables**
   - Add `DATABASE_SYSTEM_URL` to `.env.example`
   - Document in README
   - Update deployment guides

4. **Update Local API initialization**
   - Modify `createCMSHook()` to accept both adapters
   - Pass `userAdapter` and `systemAdapter` to LocalAPI
   - Implement adapter selection in `getAdapter()`

5. **Add seed script example**
   - File: `apps/studio/scripts/seed.ts`
   - Show usage with `overrideAccess: true`
   - Demonstrate creating data across organizations
   - Document best practices

**Deliverables:**
- [ ] Database migration for service role
- [ ] System database adapter created
- [ ] Environment variables documented
- [ ] Local API supports dual adapters
- [ ] Seed script example
- [ ] Security documentation

---

### Phase 6: Refactor GraphQL & REST (Week 3, Days 3-5)

**Goal:** Make HTTP APIs thin wrappers around Local API

**Tasks:**

1. **Refactor GraphQL resolvers**
   - File: `packages/graphql-plugin/src/resolvers.ts`
   - Replace direct database calls with Local API
   - Remove duplicated business logic
   - Add `where` argument support to queries
   - Pass through all FindOptions

2. **Update GraphQL schema generation**
   - File: `packages/graphql-plugin/src/schema.ts`
   - Add `WhereInput` type for each document type
   - Add `where` argument to query fields
   - Update return types to include pagination metadata

3. **Refactor REST handlers**
   - Files: `packages/cms-core/src/lib/routes/*.ts`
   - Replace direct adapter calls with Local API
   - Convert query params to `Where` filters
   - Simplify logic to: Parse → Local API → Response
   - Remove duplicated validation/permission checks

4. **Create query param parser**
   - File: `packages/cms-core/src/lib/utils/parse-rest-filters.ts`
   - Convert REST query params to `Where` object
   - Support common patterns: `?status=published&title__contains=blog`
   - Document query param syntax

5. **Add backwards compatibility tests**
   - Ensure all existing GraphQL queries still work
   - Ensure all existing REST API calls still work
   - No breaking changes for external consumers

**Deliverables:**
- [ ] GraphQL resolvers refactored
- [ ] GraphQL schema supports `where` filters
- [ ] REST handlers refactored
- [ ] Query param parser implemented
- [ ] All existing API contracts unchanged
- [ ] Compatibility tests passing

---

### Phase 7: Documentation & Examples (Week 4)

**Goal:** Comprehensive documentation and migration guide

**Tasks:**

1. **API documentation**
   - File: `docs/LOCAL_API.md`
   - Document all `CollectionAPI` methods
   - Explain filter syntax with examples
   - Show context options (`overrideAccess`, etc.)
   - TypeScript examples for everything

2. **Usage examples**
   - Server component usage (SvelteKit load functions)
   - Seed script with system access
   - Cron job example
   - Plugin development example
   - Complex filtering examples

3. **Migration guide**
   - File: `docs/MIGRATION_TO_LOCAL_API.md`
   - How to migrate from direct database access
   - How to migrate from HTTP APIs
   - Breaking changes (if any)
   - Troubleshooting common issues

4. **Performance guide**
   - File: `docs/PERFORMANCE.md`
   - Query optimization tips
   - When to use `depth` parameter
   - Indexing recommendations
   - Caching strategies

5. **Update main README**
   - Add Local API section
   - Add quick start example
   - Link to detailed docs

**Deliverables:**
- [ ] Complete API reference
- [ ] Usage examples for all scenarios
- [ ] Migration guide
- [ ] Performance best practices
- [ ] Updated README

---

## Detailed Roadmap

### Week 1: Foundation

| Day | Phase | Tasks | Hours |
|-----|-------|-------|-------|
| Mon | 1 | Create filter types in cms-core | 4h |
| Mon | 1 | Update DocumentAdapter interface | 2h |
| Mon | 1 | Update AssetAdapter interface | 2h |
| Tue | 2 | Create LocalAPIContext & PermissionChecker | 3h |
| Tue | 2 | Create CollectionAPI class (queries) | 5h |
| Wed | 2 | CollectionAPI mutations & lifecycle | 4h |
| Wed | 2 | Create LocalAPI singleton | 4h |
| Thu | 2 | Update CMSConfig & hook integration | 4h |
| Thu | 2 | Write unit tests | 4h |
| Fri | 2 | Fix bugs, refine API | 8h |

**Deliverables:** Local API layer complete, not yet functional (needs adapter implementation)

---

### Week 2: Implementation & Code Generation

| Day | Phase | Tasks | Hours |
|-----|-------|-------|-------|
| Mon | 3 | Create filter parser for PostgreSQL | 6h |
| Mon | 3 | Start findManyDocAdvanced implementation | 2h |
| Tue | 3 | Complete findManyDocAdvanced | 4h |
| Tue | 3 | Implement findByDocIdAdvanced | 4h |
| Wed | 3 | Implement countDocuments | 2h |
| Wed | 3 | Implement asset adapter methods | 4h |
| Wed | 3 | Write integration tests | 2h |
| Thu | 4 | Create type generator | 6h |
| Thu | 4 | Add CLI command | 2h |
| Fri | 4 | Build integration & testing | 4h |
| Fri | - | Buffer for overruns | 4h |

**Deliverables:** Fully functional Local API, type generation working

---

### Week 3: System Operations & API Refactor

| Day | Phase | Tasks | Hours |
|-----|-------|-------|-------|
| Mon | 5 | Database service role migration | 2h |
| Mon | 5 | Create system DB adapter | 3h |
| Mon | 5 | Update Local API for dual adapters | 3h |
| Tue | 5 | Create seed script example | 2h |
| Tue | 5 | Security documentation | 2h |
| Tue | 6 | Start GraphQL resolver refactor | 4h |
| Wed | 6 | GraphQL schema updates (where support) | 4h |
| Wed | 6 | Complete GraphQL refactor | 4h |
| Thu | 6 | REST handler refactor | 6h |
| Thu | 6 | Query param parser | 2h |
| Fri | 6 | Backwards compatibility tests | 4h |
| Fri | - | Fix breaking changes | 4h |

**Deliverables:** RLS bypass working, all APIs refactored

---

### Week 4: Documentation & Polish

| Day | Phase | Tasks | Hours |
|-----|-------|-------|-------|
| Mon | 7 | Write API reference docs | 4h |
| Mon | 7 | Create usage examples | 4h |
| Tue | 7 | Write migration guide | 4h |
| Tue | 7 | Performance guide | 4h |
| Wed | 7 | Update main README | 2h |
| Wed | 7 | Create video walkthrough (optional) | 4h |
| Thu | - | Final testing across all use cases | 6h |
| Thu | - | Performance benchmarks | 2h |
| Fri | - | Address feedback, polish | 6h |
| Fri | - | Prepare release notes | 2h |

**Deliverables:** Complete documentation, ready for production use

---

### Total Effort Estimate

| Week | Focus | Hours | Complexity |
|------|-------|-------|------------|
| 1 | Foundation & Local API | 40h | High |
| 2 | Adapter Implementation & Codegen | 40h | Medium |
| 3 | System Operations & Refactor | 40h | Medium |
| 4 | Documentation & Polish | 32h | Low |
| **Total** | | **152h** | **~4 weeks** |

---

## Supporting Multiple Database Adapters

### How Ports & Adapters Makes This Easy

The architecture is designed so adding a new database adapter is straightforward:

**Step 1: Create New Package**
```bash
packages/sqlite-adapter/  # or mongodb-adapter, etc.
```

**Step 2: Implement Interfaces**
```typescript
// packages/sqlite-adapter/src/document-adapter.ts
import type { DocumentAdapter, Where, FindOptions } from '@aphexcms/cms-core/server';

export class SQLiteDocumentAdapter implements DocumentAdapter {
  // Must implement all methods from DocumentAdapter interface

  async findManyDocAdvanced(
    organizationId: string,
    collectionName: string,
    options: FindOptions
  ): Promise<FindResult<Document>> {
    // SQLite-specific implementation
    // Parse Where → SQLite SQL
    // Execute query
    // Return results in standard format
  }

  // ... all other methods
}
```

**Step 3: Create Filter Parser**
```typescript
// packages/sqlite-adapter/src/filter-parser.ts
import type { Where } from '@aphexcms/cms-core/server';

export function parseWhere(where: Where): string {
  // Convert Where object to SQLite SQL WHERE clause
  // Different from PostgreSQL implementation but same input/output contract
}
```

**Step 4: Combine into Provider**
```typescript
// packages/sqlite-adapter/src/index.ts
export function createSQLiteProvider(config: SQLiteConfig): DatabaseProvider {
  return {
    name: 'sqlite',
    createAdapter(): DatabaseAdapter {
      return new SQLiteAdapter({ db, tables });
    }
  };
}
```

**Step 5: Use in Application**
```typescript
// apps/studio/src/lib/server/db/index.ts
import { createSQLiteProvider } from '@aphexcms/sqlite-adapter';

const provider = createSQLiteProvider({
  filename: './aphex.db'
});

export const db = provider.createAdapter();
```

**No changes needed in:**
- ❌ cms-core (business logic)
- ❌ Local API
- ❌ GraphQL plugin
- ❌ REST handlers
- ❌ Type generation
- ❌ Permission system

**Benefits:**
- ✅ Same `Where` interface works across all databases
- ✅ Same `FindOptions` interface
- ✅ Same `FindResult` return type
- ✅ Local API works identically regardless of database
- ✅ GraphQL works identically
- ✅ REST API works identically

### Example: Adding MongoDB Adapter

```typescript
// packages/mongodb-adapter/src/filter-parser.ts
import type { Where } from '@aphexcms/cms-core/server';

export function parseWhere(where: Where): object {
  // Convert Where to MongoDB query object

  const query: any = {};

  for (const [field, filter] of Object.entries(where)) {
    if (field === 'and' || field === 'or') continue;

    if (filter.equals) query[field] = filter.equals;
    if (filter.in) query[field] = { $in: filter.in };
    if (filter.contains) query[field] = { $regex: filter.contains };
    if (filter.greater_than) query[field] = { $gt: filter.greater_than };
    // ... etc
  }

  return query;
}
```

```typescript
// packages/mongodb-adapter/src/document-adapter.ts
async findManyDocAdvanced(
  organizationId: string,
  collectionName: string,
  options: FindOptions
): Promise<FindResult<Document>> {
  const collection = this.db.collection('documents');

  // Parse filters
  const mongoQuery = {
    organizationId,
    type: collectionName,
    ...parseWhere(options.where)
  };

  // Execute
  const docs = await collection
    .find(mongoQuery)
    .limit(options.limit || 50)
    .skip(options.offset || 0)
    .toArray();

  const totalDocs = await collection.countDocuments(mongoQuery);

  // Return standard format
  return {
    docs,
    totalDocs,
    // ... pagination metadata
  };
}
```

**Same interface, different implementation - perfect separation of concerns!**

---

## Tool Recommendations

### Current Stack (Keep Using)

**Drizzle ORM** ✅
- Already integrated
- Excellent TypeScript inference
- Type-safe query builder
- Good for PostgreSQL

**Better Auth** ✅
- Handles authentication well
- API key support with rate limiting
- Multi-provider support

**SvelteKit** ✅
- Great for admin UI
- Server-side rendering
- File-based routing

### Recommended Additions

#### Zod (Runtime Validation) - **Recommended**

**Why:**
- Runtime-safe filter validation
- Great TypeScript integration
- Excellent error messages
- Small bundle size

**Integration:**

```typescript
// packages/cms-core/src/lib/local-api/filter-schema.ts
import { z } from 'zod';

export const fieldFilterSchema = z.object({
  equals: z.any().optional(),
  in: z.array(z.any()).optional(),
  contains: z.string().optional(),
  greater_than: z.union([z.number(), z.date()]).optional(),
  // ... other operators
});

export const whereSchema: z.ZodType<Where> = z.lazy(() =>
  z.record(z.union([fieldFilterSchema, z.any()]))
    .and(z.object({
      and: z.array(whereSchema).optional(),
      or: z.array(whereSchema).optional()
    }))
);

// Validate before executing
export function validateWhere(where: unknown): Where {
  return whereSchema.parse(where);
}
```

**Verdict:** ✅ **Add it** - Worth the runtime safety

---

### Final Tool Stack

| Layer | Tool | Why |
|-------|------|-----|
| **Database** | Drizzle ORM | Type-safe queries, existing |
| **Auth** | Better Auth | Secure, feature-complete |
| **Validation** | Zod | Runtime safety, great DX |
| **Local API** | Custom | Domain-specific |
| **Filter Parser** | Custom (per adapter) | Database-specific |
| **Type Gen** | Custom | Simple, full control |
| **GraphQL** | Yoga (existing) | Works well |
| **REST** | SvelteKit (existing) | Fits architecture |

---

## Usage Examples

### Example 1: Server Component (SvelteKit Load)

```typescript
// apps/studio/src/routes/blog/+page.server.ts
import { getLocalAPI } from '@aphexcms/cms-core/server';
import config from '../../aphex.config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const api = await getLocalAPI(config);

  // Type-safe query with filters
  const result = await api.collections.pages.find(
    {
      organizationId: locals.auth.organizationId,
      user: locals.auth.user,
      overrideAccess: false  // Respect RLS
    },
    {
      where: {
        'seo.title': { contains: 'blog' },
        status: { equals: 'published' }
      },
      limit: 10,
      sort: '-publishedAt',
      depth: 1  // Resolve references
    }
  );

  return {
    pages: result.docs,
    pagination: {
      total: result.totalDocs,
      hasNext: result.hasNextPage
    }
  };
};
```

---

### Example 2: Seed Script

```typescript
// scripts/seed.ts
import { getLocalAPI } from '@aphexcms/cms-core/server';
import { systemDb } from './src/lib/server/db/system-db';
import config from './aphex.config';

async function seed() {
  const api = await getLocalAPI(config);

  // Create organization
  const org = await systemDb.createOrganization({
    name: 'Acme Corp',
    slug: 'acme',
    metadata: { theme: 'blue' }
  });

  // Create pages with system access (bypasses RLS)
  await api.collections.pages.create(
    {
      organizationId: org.id,
      overrideAccess: true  // System operation
    },
    {
      title: 'Home',
      slug: 'home',
      content: [
        { _type: 'textBlock', text: 'Welcome!' }
      ]
    }
  );

  console.log('✅ Seed data created');
}

seed();
```

---

### Example 3: Complex Filtering

```typescript
// Advanced query with nested logic
const result = await api.collections.pages.find(
  { organizationId: auth.org },
  {
    where: {
      // AND at top level
      status: { equals: 'published' },
      publishedAt: { greater_than: new Date('2024-01-01') },

      // Nested OR
      or: [
        { 'author.name': { equals: 'John Doe' } },
        { 'author.name': { equals: 'Jane Smith' } }
      ],

      // Nested AND
      and: [
        { 'seo.title': { contains: 'blog' } },
        { 'content': { exists: true } }
      ]
    },
    limit: 20,
    offset: 0,
    sort: ['-publishedAt', 'title'],
    depth: 2  // Resolve author and author's avatar
  }
);
```

---

## Migration Strategy

### Phase 1: Add Local API (Non-Breaking)

1. Implement Local API alongside existing code
2. No changes to GraphQL or REST yet
3. Test in seed scripts and server components

**Timeline:** Week 1-2

---

### Phase 2: Migrate Internal Usage (Non-Breaking)

1. Update plugins to use Local API
2. Update seed scripts
3. Update admin UI server-side code

**Timeline:** Week 3

---

### Phase 3: Refactor GraphQL & REST (Breaking for Internals)

1. Refactor resolvers and handlers to use Local API
2. Keep API contracts the same (backwards compatible)
3. Remove duplicated business logic

**Timeline:** Week 3-4

---

### Phase 4: Deprecate Direct Database Access (Breaking)

1. Mark old adapter methods as deprecated
2. Provide migration guide
3. Update all documentation

**Timeline:** Week 4+

---

### Backwards Compatibility

**Guaranteed to work:**
- ✅ All existing GraphQL queries
- ✅ All existing REST API calls
- ✅ All existing database adapters

**May need updates:**
- ⚠️ Internal plugins using database adapter directly
- ⚠️ Custom scripts accessing database

**Breaking changes:**
- ❌ None for external API consumers
- ❌ Internal refactors only

---

## Summary

### What You Get

**1. Unified API Layer**
```typescript
// One API for everything
await localAPI.collections.pages.find(...)
```

**2. Advanced Filtering**
```typescript
where: {
  'seo.title': { contains: 'blog' },
  publishedAt: { greater_than: new Date() }
}
```

**3. Type Safety**
```typescript
const result: FindResult<Page> = await api.collections.pages.find(...)
```

**4. RLS Bypass for System Ops**
```typescript
// No more API keys in .env!
{ organizationId: org.id, overrideAccess: true }
```

**5. DRY Code**
- GraphQL → Local API
- REST → Local API
- Server Components → Local API
- One source of truth ✅

**6. Database Agnostic**
- Interfaces in cms-core
- Implementations in adapters
- Easy to add SQLite, MongoDB, etc.

---

### Total Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| **Week 1** | Foundation | Filter interfaces, Local API core |
| **Week 2** | Implementation | PostgreSQL adapter, type generation |
| **Week 3** | System Ops & Refactor | RLS bypass, GraphQL/REST refactor |
| **Week 4** | Documentation | Complete docs, examples, polish |
| **Total** | **4 weeks** | **Production-ready unified API** |

---

### Next Steps

**Start Here:**
1. Create `packages/cms-core/src/lib/types/filters.ts`
2. Update `DocumentAdapter` interface
3. Create Local API classes
4. Implement in PostgreSQL adapter

**Ready to start?** Let me know which task you want to tackle first! 🚀
