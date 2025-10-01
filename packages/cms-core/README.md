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

1. Create your CMS configuration:

```typescript
// cms.config.ts
import { createCMSConfig } from '@aphex/cms-core';
import * as schemas from './src/lib/schemaTypes';

export default createCMSConfig({
  schemas,
  database: {
    adapter: 'postgresql',
    connectionString: process.env.DATABASE_URL
  },
  storage: {
    adapter: 'local',
    basePath: './static/uploads',
    baseUrl: '/uploads'
  }
});
```

2. Add the admin interface:

```svelte
<!-- src/routes/(protected)/admin/[...path]/+page.svelte -->
<script>
  import { AdminApp } from '@aphex/cms-core';
</script>

<AdminApp {config} />
```

3. Re-export API routes:

```typescript
// src/routes/api/documents/+server.ts
export { GET, POST, PUT, DELETE } from '@aphex/cms-core/routes/documents';
```

## Architecture

This package contains the complete CMS implementation:

- **Components**: All admin UI components
- **Routes**: API route handlers
- **Services**: Business logic layer
- **Adapters**: Database and storage implementations
- **Types**: TypeScript definitions

Your app only needs to provide:
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
