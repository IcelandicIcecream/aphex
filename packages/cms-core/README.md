# Aphex CMS Core

A Sanity-style Content Management System with ports and adapters architecture.

## Features

- 🏗️ **Ports & Adapters Architecture** - Database and storage agnostic
- 🎨 **Sanity-style Schema System** - Type-safe content modeling
- 🔌 **Pluggable Adapters** - Easy to extend with new storage/database providers
- 📝 **Rich Field Types** - Images, references, arrays, and more
- ⚡ **Real-time Validation** - Instant feedback with Sanity-style rules
- 🎯 **TypeScript First** - Full type safety throughout

## Installation

```bash
npm install @aphex/cms-core
```

## Quick Start

1. Initialize your database client:

```typescript
// src/lib/server/db/index.ts
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

export const client = postgres(env.DATABASE_URL, {
	max: 10,
	idle_timeout: 20,
	connect_timeout: 10
});
```

2. Create your CMS configuration:

```typescript
// aphex.config.ts
import { createCMSConfig } from '@aphex/cms-core/server';
import * as schemas from './src/lib/schemaTypes';
import { client } from './src/lib/server/db';

export default createCMSConfig({
	schemas,
	database: {
		adapter: 'postgresql',
		client // Pass the initialized database client (recommended)
	},
	storage: {
		adapter: 'local',
		basePath: './static/uploads',
		baseUrl: '/uploads'
	}
});
```

3. Initialize CMS in hooks:

```typescript
// src/hooks.server.ts
import { createCMSHook } from '@aphex/cms-core/server';
import { sequence } from '@sveltejs/kit/hooks';
import cmsConfig from '../aphex.config';

const aphexHook = createCMSHook(cmsConfig);

export const handle = sequence(aphexHook);
```

4. Add the admin interface:

```svelte
<!-- src/routes/(protected)/admin/[...path]/+page.svelte -->
<script>
	import { AdminApp } from '@aphex/cms-core';
</script>

<AdminApp {config} />
```

5. Re-export API routes:

```typescript
// src/routes/api/documents/+server.ts
export { GET, POST, PUT, DELETE } from '@aphex/cms-core/routes/documents';
```

## Architecture

### Database Agnostic Design

The CMS uses a **client-passing pattern** for true database agnosticism:

1. **App Layer**: Initializes database client with connection pooling
2. **Package Layer**: Receives client and creates adapter-specific instances
3. **Adapter Layer**: Schema and implementation per database (PostgreSQL, MongoDB, etc.)

This means:

- ✅ Package never imports database libraries directly
- ✅ Apps control connection pooling and configuration
- ✅ Easy to swap databases without changing package code
- ✅ Clean separation between infrastructure and business logic

### Package Structure

This package contains:

- **Components**: All admin UI components
- **Routes**: API route handlers
- **Services**: Business logic layer
- **Adapters**: Database and storage implementations
- **Types**: Database-agnostic type definitions

Your app provides:

- Database client initialization
- Schema definitions
- Configuration
- Route re-exports

## Migration

This package structure allows for easy upgrades:

```bash
npm update @aphex/cms-core
```

All CMS functionality is contained within the package, ensuring consistent upgrades without breaking your customizations.

## License

MIT
