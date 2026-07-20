// Database schema for Aphex CMS using Drizzle ORM
// This file combines CMS package schema with app-specific tables
// Re-export CMS core schema tables from the SQLite adapter package
// Import from /schema to avoid loading the entire adapter
export {
	// Multi-tenancy tables
	organizations,
	organizationMembers,
	invitations,
	roles,
	instanceSettings,
	pluginSettings,
	userSessions,
	// Content tables
	documents,
	documentVersions,
	documentReferences,
	assets,
	schemaTypes,
	userProfiles,
	// Event + job tables
	domainEvents,
	eventOutbox,
	jobs,
	// Generic plugin storage
	pluginStorage,
	// Status value unions (SQLite has no enums)
	documentStatuses,
	versionEvents,
	schemaTypeKinds,
	jobStatuses
} from '@aphexcms/sqlite-adapter/schema';
