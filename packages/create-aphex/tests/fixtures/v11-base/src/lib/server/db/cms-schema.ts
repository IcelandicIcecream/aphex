// Database schema for Aphex CMS using Drizzle ORM
// This file combines CMS package schema with app-specific tables.
// Re-exports everything from the PostgreSQL adapter's /schema subpath (tables, enums, and
// their inferred row types) — not the full adapter package, so no DB client/driver code is
// pulled in. `export *` (not a hand-maintained named list) so a new table added to the
// adapter's schema is picked up automatically here and by drizzle-kit generate, instead of
// silently missing until someone remembers to add it to an explicit list.
export * from '@aphexcms/postgresql-adapter/schema';
