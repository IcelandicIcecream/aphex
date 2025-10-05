# Database Agnostic Refactor - Major Architecture Changes

## Problem Statement

Currently, the database schema is tightly coupled to Drizzle and lives in `@aphex/cms-core`. This creates issues:

1. **Not truly database-agnostic** - Core package has Drizzle dependency
2. **Schema duplication concerns** - Apps need to re-export CMS schema for migrations
3. **Tight coupling** - Switching from Drizzle → Mongoose requires core package changes
4. **Not tree-shakeable** - All DB code bundled even if unused

## Proposed Solution: Separate Adapter Packages

### Key Insight

**Adapter provides complete CMS schema (including auth tables).**

After analysis, there's **no real need for app-specific tables** beyond what the CMS provides:
- Content goes in `documents` table (different `type` values)
- Auth is required CMS functionality
- User profiles/roles are CMS functionality

**Therefore:**
- Adapter exports complete `cmsSchema` (CMS tables + Auth tables)
- App just uses `cmsSchema` directly (no combining needed)
- App creates Drizzle client with `cmsSchema`
- App passes `{ db, tables: cmsSchema }` to adapter
- Standard Drizzle workflow: `pnpm db:generate`, `pnpm db:migrate`

**Edge case**: If apps truly need custom tables (rare), they can still spread:
```typescript
export const schema = { ...cmsSchema, myCustomTable }
```

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
import { pgTable, text, uuid, timestamp, jsonb, varchar, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';

// ============================================
// ENUMS
// ============================================
export const documentStatusEnum = pgEnum('document_status', ['draft', 'published']);
export const schemaTypeEnum = pgEnum('schema_type', ['document', 'object']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'editor', 'viewer']);

// ============================================
// CONTENT TABLES
// ============================================
export const documents = pgTable('cms_documents', {
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

export const assets = pgTable('cms_assets', {
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

export const schemaTypes = pgTable('cms_schema_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  title: varchar('title', { length: 200 }).notNull(),
  type: schemaTypeEnum('type').notNull(),
  description: text('description'),
  schema: jsonb('schema').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// ============================================
// AUTH TABLES (Better Auth compatible)
// ============================================
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .$onUpdate(() => new Date())
    .notNull()
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()
});

export const apikey = pgTable('apikey', {
  id: text('id').primaryKey(),
  name: text('name'),
  start: text('start'),
  prefix: text('prefix'),
  key: text('key').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  refillInterval: integer('refill_interval'),
  refillAmount: integer('refill_amount'),
  lastRefillAt: timestamp('last_refill_at'),
  enabled: boolean('enabled').default(true),
  rateLimitEnabled: boolean('rate_limit_enabled').default(true),
  rateLimitTimeWindow: integer('rate_limit_time_window').default(86400000),
  rateLimitMax: integer('rate_limit_max').default(10000),
  requestCount: integer('request_count').default(0),
  remaining: integer('remaining'),
  lastRequest: timestamp('last_request'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  permissions: text('permissions'),
  metadata: text('metadata')
});

// ============================================
// CMS USER PROFILES (extends auth users)
// ============================================
export const userProfiles = pgTable('cms_user_profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').default('editor').notNull(),
  preferences: jsonb('preferences').$type<{
    theme?: 'light' | 'dark';
    language?: string;
    [key: string]: any;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ============================================
// EXPORT COMPLETE CMS SCHEMA
// ============================================
export const cmsSchema = {
  // Content tables
  documents,
  assets,
  schemaTypes,

  // Auth tables
  user,
  session,
  account,
  verification,
  apikey,
  userProfiles,

  // Enums
  documentStatusEnum,
  schemaTypeEnum,
  userRoleEnum
};

// Export types
export type CMSSchema = typeof cmsSchema;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type User = typeof user.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
```

```typescript
// packages/db-adapter-postgresql/src/adapter.ts
import type { drizzle } from 'drizzle-orm/postgres-js';
import type { DatabaseAdapter } from '@aphex/cms-core/interfaces';
import type { CMSSchema } from './schema';
import { PostgreSQLDocumentAdapter } from './document-adapter';
import { PostgreSQLAssetAdapter } from './asset-adapter';

export class PostgreSQLAdapter implements DatabaseAdapter {
  private db: ReturnType<typeof drizzle>;
  private tables: CMSSchema;
  private documentAdapter: PostgreSQLDocumentAdapter;
  private assetAdapter: PostgreSQLAssetAdapter;

  constructor(config: {
    db: ReturnType<typeof drizzle>;  // Drizzle client with full schema
    tables: CMSSchema;                // CMS-specific tables
  }) {
    this.db = config.db;
    this.tables = config.tables;
    this.documentAdapter = new PostgreSQLDocumentAdapter(this.db, this.tables);
    this.assetAdapter = new PostgreSQLAssetAdapter(this.db, this.tables);
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
export { cmsSchema } from './schema';
export { PostgreSQLAdapter } from './adapter';
export type { CMSSchema, Document, NewDocument, Asset, NewAsset } from './schema';
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

### 3. App Usage (Simplified Pattern)

```typescript
// apps/studio/src/lib/server/db/schema.ts
import { cmsSchema } from '@aphex/db-adapter-postgresql';

// Just re-export the schema - that's it!
export const schema = cmsSchema;

// Re-export everything for convenience
export * from '@aphex/db-adapter-postgresql';
```

```typescript
// apps/studio/src/lib/server/db/index.ts
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { schema } from './schema';
import { env } from '$env/dynamic/private';

// Create postgres client with connection pooling
export const client = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

// Create Drizzle client with combined schema
export const db = drizzle(client, { schema });

export { schema };
```

```typescript
// apps/studio/src/lib/server/auth/index.ts
import { betterAuth } from 'better-auth';
import { apiKey } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';

// Better Auth uses the same db instance (with cmsSchema)
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
  // ... other config
});
```

```typescript
// apps/studio/aphex.config.ts
import { createCMSConfig } from '@aphex/cms-core/server';
import { PostgreSQLAdapter, cmsSchema } from '@aphex/db-adapter-postgresql';
import { db } from './src/lib/server/db';
import * as schemas from './src/lib/schemaTypes';

export default createCMSConfig({
  schemas,
  database: {
    adapter: new PostgreSQLAdapter({
      db,            // Drizzle client with cmsSchema (includes auth tables)
      tables: cmsSchema  // CMS-specific tables for adapter to use
    })
  },
  storage: {
    adapter: 'local',
    basePath: './static/uploads',
    baseUrl: '/uploads'
  },
  customization: {
    branding: {
      title: 'Aphex'
    }
  }
});
```

```bash
# Standard Drizzle workflow
pnpm db:generate  # Generate migrations from cmsSchema
pnpm db:migrate   # Run migrations
```

---

## Refactoring Current Auth Implementation

### Current Setup Analysis

Looking at the current auth implementation in `apps/studio/`:

**Current files:**
- `src/lib/server/db/auth-schema.ts` - Better Auth table definitions (5 tables)
- `src/lib/server/db/schema.ts` - Combines CMS + auth schemas + userProfiles
- `src/lib/server/auth/index.ts` - Better Auth configuration

**Current auth tables:**
1. `user` - Better Auth users
2. `session` - Better Auth sessions
3. `account` - OAuth accounts
4. `verification` - Email verification
5. `apikey` - API keys for programmatic access
6. `userProfiles` - CMS-specific user data (role, preferences)

### Refactoring Difficulty: **LOW** ✅

The refactor is straightforward because:

1. **Table definitions are already Drizzle** - Just move them to adapter package
2. **Better Auth config stays in app** - Only imports change
3. **No breaking schema changes** - Same table structure
4. **userProfiles already follows pattern** - Just needs to move with auth tables

### What Changes

**Move to adapter package:**
```typescript
// FROM: apps/studio/src/lib/server/db/auth-schema.ts
// TO:   packages/db-adapter-postgresql/src/schema.ts (combined with CMS tables)
```

**App changes (minimal):**
```typescript
// BEFORE
import * as authSchema from './auth-schema'
export const schema = { ...cmsSchema, ...authSchema, userProfiles }

// AFTER
import { cmsSchema } from '@aphex/db-adapter-postgresql'
export const schema = cmsSchema  // Already includes auth + userProfiles
```

**Better Auth config (no changes needed):**
```typescript
// Still works exactly the same!
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  // ... rest of config unchanged
});
```

### Migration Checklist

- [ ] Copy auth table definitions from `auth-schema.ts` to adapter `schema.ts`
- [ ] Copy `userProfiles` definition to adapter `schema.ts`
- [ ] Add auth tables to `cmsSchema` export
- [ ] Update app's `schema.ts` to just import `cmsSchema`
- [ ] Delete `apps/studio/src/lib/server/db/auth-schema.ts` (no longer needed)
- [ ] Update imports in `auth/index.ts` (e.g., `import { apikey } from '@aphex/db-adapter-postgresql'`)
- [ ] Run `pnpm db:generate` and verify migrations

**Total refactoring time: ~30 minutes** ⏱️

---

## Migration Strategy

### Phase 1: Create PostgreSQL Adapter Package
1. Create `packages/db-adapter-postgresql/`
2. Move CMS schema from `cms-core` to adapter package
3. Copy auth tables from `apps/studio/src/lib/server/db/auth-schema.ts`
4. Copy `userProfiles` from `apps/studio/src/lib/server/db/schema.ts`
5. Export complete `cmsSchema` (CMS + Auth + UserProfiles)
6. Update `PostgreSQLAdapter` to accept `{ db, tables }` in constructor
7. Update `package.json` with drizzle-orm and postgres dependencies

### Phase 2: Update Core Package
1. Remove all Drizzle code from `@aphex/cms-core`
2. Keep only interfaces and types (database-agnostic)
3. Update `package.json` (remove drizzle dependencies)
4. Update server exports to not export schema or Drizzle code

### Phase 3: Update App
1. Install `@aphex/db-adapter-postgresql`
2. Update `src/lib/server/db/schema.ts`:
   - Import `cmsSchema` from adapter package
   - Remove auth-schema imports and userProfiles definition
   - Export `schema = cmsSchema`
3. Update `src/lib/server/db/index.ts`:
   - No changes needed (already uses schema)
4. Update `src/lib/server/auth/index.ts`:
   - Update imports to use adapter package (e.g., `import { apikey } from '@aphex/db-adapter-postgresql'`)
5. Update `aphex.config.ts`:
   - Import `PostgreSQLAdapter` and `cmsSchema`
   - Pass `{ db, tables: cmsSchema }` to adapter
6. Delete `src/lib/server/db/auth-schema.ts`
7. Run migration: `pnpm db:generate && pnpm db:migrate`

### Phase 4: Update Documentation
1. Update CLAUDE.md with new pattern
2. Document adapter creation process
3. Add examples for future adapters (MongoDB, SQLite)

---

## Future Adapters

### MongoDB Adapter (`@aphex/db-adapter-mongodb`)

```typescript
// packages/db-adapter-mongodb/src/schema.ts
import mongoose from 'mongoose';

// Define CMS schemas
const DocumentSchema = new mongoose.Schema({
  type: { type: String, required: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  draftData: mongoose.Schema.Types.Mixed,
  publishedData: mongoose.Schema.Types.Mixed,
  publishedHash: { type: String, maxlength: 20 },
  createdBy: String,
  updatedBy: String,
  publishedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const AssetSchema = new mongoose.Schema({
  assetType: { type: String, required: true },
  filename: { type: String, required: true },
  originalFilename: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  path: { type: String, required: true },
  storageAdapter: { type: String, required: true, default: 'local' },
  width: Number,
  height: Number,
  metadata: mongoose.Schema.Types.Mixed,
  title: String,
  description: String,
  alt: String,
  creditLine: String,
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SchemaTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['document', 'object'], required: true },
  description: String,
  schema: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Export CMS schema (models will be registered by app)
export const cmsSchema = {
  DocumentSchema,
  AssetSchema,
  SchemaTypeSchema
};

export type CMSSchema = typeof cmsSchema;
```

```typescript
// packages/db-adapter-mongodb/src/adapter.ts
import mongoose from 'mongoose';
import type { DatabaseAdapter } from '@aphex/cms-core/interfaces';
import type { CMSSchema } from './schema';

export class MongoDBAdapter implements DatabaseAdapter {
  private connection: typeof mongoose;
  private models: {
    Document: mongoose.Model<any>;
    Asset: mongoose.Model<any>;
    SchemaType: mongoose.Model<any>;
  };

  constructor(config: {
    connection: typeof mongoose;  // Mongoose connection with all models
    schemas: CMSSchema;           // CMS-specific schemas
  }) {
    this.connection = config.connection;

    // Register CMS models
    this.models = {
      Document: config.connection.model('cms_documents', config.schemas.DocumentSchema),
      Asset: config.connection.model('cms_assets', config.schemas.AssetSchema),
      SchemaType: config.connection.model('cms_schema_types', config.schemas.SchemaTypeSchema)
    };
  }

  async findMany(filters?: any) {
    return this.models.Document.find(filters).exec();
  }

  async createAsset(data: any) {
    return this.models.Asset.create(data);
  }

  // ... other methods
}
```

```typescript
// App usage
// src/lib/server/db/schema.ts
import { cmsSchema } from '@aphex/db-adapter-mongodb';

// App combines CMS schemas with auth schemas
export const schemas = {
  ...cmsSchema,
  // auth schemas...
};

// src/lib/server/db/index.ts
import mongoose from 'mongoose';
import { schemas } from './schema';

export const connection = await mongoose.connect(process.env.MONGODB_URI);

// Register all models (CMS + Auth)
export const models = {
  Document: connection.model('cms_documents', schemas.DocumentSchema),
  Asset: connection.model('cms_assets', schemas.AssetSchema),
  // ... auth models
};

// aphex.config.ts
import { MongoDBAdapter, cmsSchema } from '@aphex/db-adapter-mongodb';
import { connection } from './src/lib/server/db';

export default createCMSConfig({
  database: {
    adapter: new MongoDBAdapter({
      connection,
      schemas: cmsSchema
    })
  }
});
```

### SQLite Adapter (`@aphex/db-adapter-sqlite`)

Similar to PostgreSQL but uses better-sqlite3 or LibSQL.

---

## Benefits of This Architecture

✅ **True database agnosticism** - Core has zero DB dependencies
✅ **Tree-shakeable** - Only bundle adapters you use
✅ **Independent versioning** - Update PostgreSQL adapter without touching core
✅ **Clear separation** - Each adapter is self-contained
✅ **App owns schema** - No factory functions, simple object spread
✅ **Standard workflows** - Native Drizzle commands work as expected
✅ **Type-safe** - Full TypeScript inference from combined schema
✅ **Flexible** - App can add custom tables alongside CMS tables
✅ **Consistent with storage pattern** - Mirrors `@aphex/storage-s3` design
✅ **Future-proof** - Easy to add MongoDB, SQLite, etc.

---

## Breaking Changes

### For Existing Users:

**Before (Current):**
```typescript
// aphex.config.ts
import { createCMSConfig } from '@aphex/cms-core/server';

export default createCMSConfig({
  database: {
    adapter: 'postgresql',
    connectionString: process.env.DATABASE_URL,
    options: { max: 10 }
  }
});
```

**After (Refactored):**
```typescript
// src/lib/server/db/schema.ts
import { cmsSchema } from '@aphex/db-adapter-postgresql';

export const schema = cmsSchema;  // Complete CMS schema (content + auth)
export * from '@aphex/db-adapter-postgresql';

// src/lib/server/db/index.ts
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { schema } from './schema';

export const client = postgres(process.env.DATABASE_URL, { max: 10 });
export const db = drizzle(client, { schema });

// aphex.config.ts
import { createCMSConfig } from '@aphex/cms-core/server';
import { PostgreSQLAdapter, cmsSchema } from '@aphex/db-adapter-postgresql';
import { db } from './src/lib/server/db';

export default createCMSConfig({
  database: {
    adapter: new PostgreSQLAdapter({ db, tables: cmsSchema })
  }
});
```

**Migration Guide:**
1. Install `@aphex/db-adapter-postgresql`
2. Update `src/lib/server/db/schema.ts`:
   - Replace CMS imports with `import { cmsSchema } from '@aphex/db-adapter-postgresql'`
   - Remove `auth-schema.ts` imports and `userProfiles` definition
   - Export `schema = cmsSchema`
3. Update `src/lib/server/db/index.ts`:
   - Use `schema` from step 2 (no changes if already using it)
4. Update `src/lib/server/auth/index.ts`:
   - Change imports from `./auth-schema` to `'@aphex/db-adapter-postgresql'`
5. Update `aphex.config.ts`:
   - Import and instantiate `PostgreSQLAdapter`
   - Pass `{ db, tables: cmsSchema }`
6. Delete `src/lib/server/db/auth-schema.ts` (tables now in adapter)
7. Run `pnpm db:generate && pnpm db:migrate`

---

## Design Decisions

✅ **Adapter instantiation** - Use instances (`adapter: new PostgreSQLAdapter({ db, tables })`)
✅ **Schema ownership** - Adapter provides complete schema, app uses it directly
✅ **Auth tables in adapter** - Required CMS functionality, batteries included
✅ **No factory functions** - Direct schema export, app just imports it
✅ **Standard workflows** - Use native Drizzle commands (`pnpm db:generate`, `pnpm db:migrate`)
✅ **Type safety** - Full TypeScript inference from Drizzle schema
✅ **Simplicity** - Most apps: `export const schema = cmsSchema` and done

## Resolved Questions

1. ~~**User profiles** - Should user roles/preferences be in CMS schema or auth schema?~~
   - **Decision**: In CMS schema (required CMS functionality)

2. ~~**Auth tables** - Package or app layer?~~
   - **Decision**: In adapter package (batteries included)

3. ~~**Schema combination** - Factory or object spread?~~
   - **Decision**: Direct export (no combination needed for most cases)

## Remaining Questions

1. **Schema types** - Export common types (Document, Asset, User) from adapter?
   - **Proposed**: Yes, export all types for convenience

2. **Custom tables edge case** - Support `{ ...cmsSchema, customTable }`?
   - **Proposed**: Yes, still allow spreading for rare cases

3. **Backward compatibility** - Support old pattern during transition?
   - **Proposed**: No, breaking change with clear migration guide

---

## Related Patterns

This follows the same pattern as:
- ✅ Storage adapters (`@aphex/storage-s3`)
- ✅ Auth providers (Better Auth plugins)
- ✅ Schema definitions (app-defined types)

**Database adapters should follow the same composable pattern!**

---

## Summary

### What This Achieves

1. **True Database Agnosticism**
   - Core package: Zero database dependencies
   - Adapter packages: Database-specific implementations
   - Easy to add MongoDB, SQLite, etc.

2. **Batteries Included**
   - Auth tables in adapter (not app responsibility)
   - User profiles/roles built-in
   - Most apps: just import and use

3. **Simplified App Setup**
   ```typescript
   // That's it!
   import { cmsSchema } from '@aphex/db-adapter-postgresql'
   export const schema = cmsSchema
   ```

4. **Standard Workflows**
   - Native Drizzle commands work as expected
   - No custom migration tools
   - Full TypeScript inference

5. **Future-Proof**
   - Independent adapter versioning
   - Tree-shakeable (only bundle what you use)
   - Clear separation of concerns

### The Big Win

**Before**: App manages CMS schema, auth schema, combining them, migrations, etc.

**After**: App imports `cmsSchema` and uses it. Done.

---

## Next Steps

1. [x] Review this proposal ✅
2. [x] Decide on auth table location (in adapter) ✅
3. [x] Analyze refactoring difficulty (LOW - ~30 min) ✅
4. [ ] Create `@aphex/db-adapter-postgresql` package
5. [ ] Refactor core to remove DB code
6. [ ] Update app to use new pattern
7. [ ] Update CLAUDE.md documentation
8. [ ] Test migration flow
