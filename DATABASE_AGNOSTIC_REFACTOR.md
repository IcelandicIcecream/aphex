# Database Agnostic Refactor - Major Architecture Changes

## Problem Statement

Currently, the database schema is tightly coupled to Drizzle and lives in `@aphex/cms-core`. This creates issues:

1. **Not truly database-agnostic** - Core package has Drizzle dependency
2. **Schema duplication concerns** - Apps need to re-export CMS schema for migrations
3. **Tight coupling** - Switching from Drizzle → Mongoose requires core package changes
4. **Not tree-shakeable** - All DB code bundled even if unused

## Proposed Solution: Separate Adapter Packages

### Architecture Overview

```
packages/
├── cms-core/              # Pure interfaces, NO database implementation
│   ├── src/
│   │   ├── interfaces/
│   │   │   ├── database.ts      # DatabaseAdapter interface
│   │   │   ├── document.ts      # DocumentAdapter interface
│   │   │   └── asset.ts         # AssetAdapter interface
│   │   ├── types.ts             # Database-agnostic types
│   │   └── services/            # Business logic (uses interfaces)
│   └── package.json             # NO drizzle-orm dependency
│
├── db-adapter-postgresql/ # NEW PACKAGE - Drizzle + PostgreSQL
│   ├── src/
│   │   ├── schema.ts            # Drizzle schema factory
│   │   ├── adapter.ts           # PostgreSQLAdapter implementation
│   │   └── index.ts             # Public exports
│   └── package.json             # drizzle-orm, postgres dependencies
│
├── db-adapter-mongodb/    # FUTURE - Mongoose + MongoDB
│   └── (TBD)
│
├── db-adapter-sqlite/     # FUTURE - Drizzle + LibSQL
│   └── (TBD)
│
└── storage-s3/            # ALREADY FOLLOWS THIS PATTERN ✓
```

---

## Implementation Details

### 1. Core Package (`@aphex/cms-core`)

**Remove all database implementations**, keep only:

```typescript
// packages/cms-core/src/interfaces/database.ts
export interface DatabaseAdapter {
  // Document operations
  findMany(filters?: any): Promise<Document[]>;
  findById(id: string): Promise<Document | null>;
  create(data: any): Promise<Document>;
  // ... other methods

  // Asset operations
  createAsset(data: CreateAssetData): Promise<Asset>;
  findAssetById(id: string): Promise<Asset | null>;
  // ... other methods
}

// Database-agnostic types
export interface Document {
  id: string;
  type: string;
  draftData: any;
  publishedData: any;
  // ... no Drizzle-specific types
}
```

**Update package.json:**
```json
{
  "name": "@aphex/cms-core",
  "peerDependencies": {
    // Remove drizzle-orm, postgres
  }
}
```

---

### 2. PostgreSQL Adapter Package (`@aphex/db-adapter-postgresql`)

**Create new workspace package:**

```typescript
// packages/db-adapter-postgresql/src/schema.ts
import { pgTable, text, uuid, timestamp, jsonb, varchar, integer, pgEnum } from 'drizzle-orm/pg-core';

// Schema factory function
export function createPostgreSQLSchema(extensions = {}) {
  // Define CMS tables
  const documentStatusEnum = pgEnum('document_status', ['draft', 'published']);
  const schemaTypeEnum = pgEnum('schema_type', ['document', 'object']);

  const documents = pgTable('cms_documents', {
    id: uuid('id').defaultRandom().primaryKey(),
    type: varchar('type', { length: 100 }).notNull(),
    status: documentStatusEnum('status').default('draft'),
    draftData: jsonb('draft_data'),
    publishedData: jsonb('published_data'),
    publishedHash: varchar('published_hash', { length: 20 }),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
  });

  const assets = pgTable('cms_assets', {
    id: uuid('id').defaultRandom().primaryKey(),
    assetType: varchar('asset_type', { length: 20 }).notNull(),
    filename: varchar('filename', { length: 255 }).notNull(),
    originalFilename: varchar('original_filename', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    size: integer('size').notNull(),
    url: text('url').notNull(),
    path: text('path').notNull(),
    storageAdapter: varchar('storage_adapter', { length: 50 }).notNull().default('local'),
    width: integer('width'),
    height: integer('height'),
    metadata: jsonb('metadata'),
    title: varchar('title', { length: 255 }),
    description: text('description'),
    alt: text('alt'),
    creditLine: text('credit_line'),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
  });

  const schemaTypes = pgTable('cms_schema_types', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    title: varchar('title', { length: 200 }).notNull(),
    type: schemaTypeEnum('type').notNull(),
    description: text('description'),
    schema: jsonb('schema').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
  });

  // Return combined schema (CMS + app extensions)
  return {
    // CMS tables
    documents,
    assets,
    schemaTypes,
    // Enums
    documentStatusEnum,
    schemaTypeEnum,
    // App extensions (auth, custom tables)
    ...extensions
  };
}

// Export types
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
```

```typescript
// packages/db-adapter-postgresql/src/adapter.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import type { DatabaseAdapter } from '@aphex/cms-core/interfaces';
import { PostgreSQLDocumentAdapter } from './document-adapter';
import { PostgreSQLAssetAdapter } from './asset-adapter';

export class PostgreSQLAdapter implements DatabaseAdapter {
  private db: ReturnType<typeof drizzle>;
  private documentAdapter: PostgreSQLDocumentAdapter;
  private assetAdapter: PostgreSQLAssetAdapter;

  constructor(config: { client: any; schema: any }) {
    this.db = drizzle(config.client, { schema: config.schema });
    this.documentAdapter = new PostgreSQLDocumentAdapter(this.db);
    this.assetAdapter = new PostgreSQLAssetAdapter(this.db);
  }

  // Delegate to adapters
  async findMany(filters?: any) {
    return this.documentAdapter.findMany(filters);
  }

  async createAsset(data: any) {
    return this.assetAdapter.createAsset(data);
  }

  // ... other methods
}
```

```typescript
// packages/db-adapter-postgresql/src/index.ts
export { createPostgreSQLSchema } from './schema';
export { PostgreSQLAdapter } from './adapter';
export type { Document, NewDocument, Asset, NewAsset } from './schema';
```

**package.json:**
```json
{
  "name": "@aphex/db-adapter-postgresql",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "dependencies": {
    "drizzle-orm": "^0.40.0",
    "postgres": "^3.4.5"
  },
  "peerDependencies": {
    "@aphex/cms-core": "workspace:*"
  }
}
```

---

### 3. App Usage (Updated Pattern)

```typescript
// apps/studio/src/lib/server/db/schema.ts
import { createPostgreSQLSchema } from '@aphex/db-adapter-postgresql';
import * as authSchema from './auth-schema';
import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

// Define app-specific tables
const userProfiles = pgTable('cms_user_profiles', {
  userId: text('user_id').primaryKey(),
  role: text('role', { enum: ['admin', 'editor', 'viewer'] }).default('editor').notNull(),
  preferences: jsonb('preferences').$type<{
    theme?: 'light' | 'dark';
    language?: string;
    [key: string]: any;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Create combined schema (CMS + Auth + App)
export const schema = createPostgreSQLSchema({
  ...authSchema,
  userProfiles
});

// Re-export for convenience
export const {
  documents,
  assets,
  schemaTypes,
  user,
  session,
  apikey,
  userProfiles: profiles
} = schema;
```

```typescript
// apps/studio/src/lib/server/db/index.ts
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { schema } from './schema';

export const client = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

export { schema };
```

```typescript
// apps/studio/aphex.config.ts
import { createCMSConfig } from '@aphex/cms-core/server';
import { PostgreSQLAdapter } from '@aphex/db-adapter-postgresql';
import { client, schema } from './src/lib/server/db';
import * as schemas from './src/lib/schemaTypes';
import { authProvider } from './src/lib/server/auth';

export default createCMSConfig({
  schemas,
  database: {
    adapter: 'postgresql', // or pass instance directly
    client,
    schema // Pass full schema to adapter
  },
  auth: {
    provider: authProvider,
    loginUrl: '/login'
  },
  customization: {
    branding: {
      title: 'Aphex'
    }
  }
});
```

---

## Migration Strategy

### Phase 1: Create PostgreSQL Adapter Package
1. Create `packages/db-adapter-postgresql/`
2. Move schema.ts, document-adapter.ts, asset-adapter.ts
3. Implement `createPostgreSQLSchema()` factory
4. Export `PostgreSQLAdapter` class

### Phase 2: Update Core Package
1. Remove all Drizzle code from `@aphex/cms-core`
2. Keep only interfaces and types
3. Update `package.json` (remove drizzle dependencies)
4. Update server exports to not export schema

### Phase 3: Update App
1. Install `@aphex/db-adapter-postgresql`
2. Update `schema.ts` to use `createPostgreSQLSchema()`
3. Update `aphex.config.ts` to pass schema to adapter
4. Run migration: `pnpm db:generate && pnpm db:push`

### Phase 4: Update Documentation
1. Update CLAUDE.md with new pattern
2. Document adapter creation process
3. Add examples for future adapters

---

## Future Adapters

### MongoDB Adapter (`@aphex/db-adapter-mongodb`)

```typescript
// packages/db-adapter-mongodb/src/schema.ts
import mongoose from 'mongoose';

export function createMongoDBSchema(extensions = {}) {
  const DocumentSchema = new mongoose.Schema({
    type: { type: String, required: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    draftData: mongoose.Schema.Types.Mixed,
    publishedData: mongoose.Schema.Types.Mixed,
    // ... other fields
  });

  const AssetSchema = new mongoose.Schema({
    assetType: { type: String, required: true },
    filename: { type: String, required: true },
    storageAdapter: { type: String, required: true, default: 'local' },
    // ... other fields
  });

  return {
    Document: mongoose.model('Document', DocumentSchema),
    Asset: mongoose.model('Asset', AssetSchema),
    ...extensions // App can add custom models
  };
}
```

### SQLite Adapter (`@aphex/db-adapter-sqlite`)

Similar to PostgreSQL but uses better-sqlite3 or LibSQL.

---

## Benefits of This Architecture

✅ **True database agnosticism** - Core has zero DB dependencies
✅ **Tree-shakeable** - Only bundle adapters you use
✅ **Independent versioning** - Update PostgreSQL adapter without touching core
✅ **Clear separation** - Each adapter is self-contained
✅ **Migration-friendly** - Schema factory allows app extensions
✅ **Consistent with storage pattern** - Mirrors `@aphex/storage-s3` design
✅ **Future-proof** - Easy to add MongoDB, SQLite, etc.

---

## Breaking Changes

### For Existing Users:

**Before:**
```typescript
import { createCMSConfig } from '@aphex/cms-core/server';

export default createCMSConfig({
  database: {
    adapter: 'postgresql',
    client
  }
});
```

**After:**
```typescript
import { createCMSConfig } from '@aphex/cms-core/server';
import { PostgreSQLAdapter } from '@aphex/db-adapter-postgresql';
import { schema } from './src/lib/server/db/schema';

export default createCMSConfig({
  database: {
    adapter: new PostgreSQLAdapter({ client, schema })
    // or keep string-based with schema: 'postgresql' + schema config
  }
});
```

**Migration Guide Needed:**
1. Install `@aphex/db-adapter-postgresql`
2. Update imports in `schema.ts`
3. Update `aphex.config.ts`

---

## Open Questions

1. **Adapter registration** - Should we keep string-based (`adapter: 'postgresql'`) or require instances (`adapter: new PostgreSQLAdapter(...)`)?
2. **Schema types** - How to handle TypeScript types across adapters?
3. **Migration tools** - Each adapter needs its own migration strategy
4. **Backward compatibility** - Support old pattern during transition?

---

## Related Patterns

This follows the same pattern as:
- ✅ Storage adapters (`@aphex/storage-s3`)
- ✅ Auth providers (Better Auth plugins)
- ✅ Schema definitions (app-defined types)

**Database adapters should follow the same composable pattern!**

---

## Next Steps

1. [ ] Review this proposal
2. [ ] Decide on adapter registration pattern
3. [ ] Create `@aphex/db-adapter-postgresql` package
4. [ ] Refactor core to remove DB code
5. [ ] Update app to use new pattern
6. [ ] Update documentation
7. [ ] Create migration guide
