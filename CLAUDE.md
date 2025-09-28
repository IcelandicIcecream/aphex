# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TCR-CMS is a custom Content Management System built with SvelteKit 5, Drizzle ORM, PostgreSQL, and Tailwind CSS v4. The architecture follows a Sanity-style schema system with auto-loading capabilities and type-safe content management.

## Development Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm preview          # Preview production build

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

### Database Layer
- **Drizzle ORM** with PostgreSQL
- Schema defined in `src/lib/server/db/schema.ts`
- Three main tables: `cms_documents`, `cms_media`, `cms_schema_types`
- Sanity-compatible document storage using JSONB fields
- **Hash-based versioning** with `publishedHash` field for change detection
- PostgreSQL enums for type safety (`document_status`, `schema_type`)

### CMS Schema System
- **Auto-loading schemas** from `src/lib/schemaTypes/` directory
- Schema types automatically registered in `src/lib/schemaTypes/index.ts`
- Sanity-style field definitions using helpers from `src/lib/cms/define.ts`
- Configuration auto-generated in `cms.config.ts` based on discovered schemas

### Frontend Architecture
- **SvelteKit 5** with TypeScript
- **Tailwind CSS v4** for styling
- **Bits-ui** component library with custom UI components in `src/lib/components/ui/`
- Protected admin routes under `src/routes/(protected)/admin/`

### Admin Interface
- **Sanity Studio-style** responsive design with three-panel layout
- **Mobile-first navigation** with breadcrumbs and panel switching
- **Document management** with lazy creation, auto-save, and publish/draft workflow
- **Hash-based publish system** with smart button states and change detection
- **Type-safe forms** with dynamic schema field rendering and modular field components
- **Real-time validation** with Sanity-style Rule system
- **Real-time updates** with optimistic UI patterns
- Key components:
  - `DocumentEditor.svelte` - Auto-saving document editor with hash-based versioning
  - Modular field components in `src/lib/cms/components/admin/fields/`
  - Schema-driven form orchestration in `SchemaField.svelte`
  - Responsive layout patterns following Sanity Studio conventions

### Schema Types Structure
Each schema type in `src/lib/schemaTypes/` follows this pattern:
- Uses `defineType()` helper for type safety
- Supports 'document' types (standalone content) and 'object' types (reusable components)
- Automatic registration via index file export

### Configuration
- **Environment**: Uses `.env` for database URL and secrets
- **CMS Config**: Auto-generated from schema types in `cms.config.ts`
- **Drizzle Config**: Database configuration in `drizzle.config.ts`

## Key Files and Patterns

- `cms.config.ts` - Auto-generated CMS configuration
- `src/lib/server/db/schema.ts` - Database schema definitions with hash fields and enums
- `src/lib/schemaTypes/` - Content type definitions (auto-loaded)
- `src/lib/cms/define.ts` - Sanity-style field definition helpers
- `src/lib/cms/content-hash.ts` - Hash-based versioning utilities
- `src/lib/cms/validation/` - Validation system (Rule class and utilities)
- `src/lib/cms/components/admin/` - CMS-specific admin components
- `src/routes/(protected)/admin/` - Admin interface routes
- `src/lib/api/` - Type-safe API client using database schema types
- `src/lib/db/documents.ts` - Document database operations with hash-based versioning
- `src/hooks.server.ts` - Server-side routing (redirects root to admin)

### CMS Component Structure
- `DocumentEditor.svelte` - Main editor with hash-based publish logic
- `SchemaField.svelte` - Dynamic field orchestrator
- `fields/` directory - Modular field components:
  - `StringField.svelte` - Text input fields
  - `SlugField.svelte` - Slug generation with manual "Generate from Title" button
  - `TextareaField.svelte` - Multi-line text areas
  - `BooleanField.svelte` - Toggle switches
  - Additional field types as needed

## Testing and Quality Assurance

Always run `pnpm lint` and `pnpm check` before committing changes to ensure code quality and type safety.