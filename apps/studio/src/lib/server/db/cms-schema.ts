// Database schema for Aphex CMS using Drizzle ORM
// This file combines CMS package schema with app-specific tables
// Re-export CMS core schema tables from PostgreSQL adapter package
// Import from /schema to avoid loading the entire adapter
export {
	// Multi-tenancy tables
	organizations,
	organizationMembers,
	invitations,
	roles,
	instanceSettings,
	userSessions,
	// Content tables
	documents,
	documentVersions,
	assets,
	schemaTypes,
	userProfiles,
	// Enums
	documentStatusEnum,
	versionEventEnum,
	schemaTypeEnum
} from '@aphexcms/postgresql-adapter/schema';
