// Database schema for Aphex CMS using Drizzle ORM
// This file combines CMS package schema with app-specific tables
// Re-export CMS core schema tables from PostgreSQL adapter package
// Import from /schema to avoid loading the entire adapter
export {
	documents,
	assets,
	schemaTypes,
	userProfiles, // Now imported from the adapter
	documentStatusEnum,
	schemaTypeEnum
} from '@aphex/postgresql-adapter/schema';
