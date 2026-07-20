// Database schema for Aphex CMS using Drizzle ORM
import {
	pgTable,
	text,
	uuid,
	timestamp,
	jsonb,
	varchar,
	integer,
	pgEnum,
	pgPolicy,
	primaryKey,
	index,
	unique
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================
// ENUMS
// ============================================
export const documentStatusEnum = pgEnum('document_status', ['draft', 'published', 'unpublished']);
export const versionEventEnum = pgEnum('version_event', ['draft', 'publish']);
export const schemaTypeEnum = pgEnum('schema_type', ['document', 'object']);
export const jobStatusEnum = pgEnum('job_status', [
	'pending',
	'leased',
	'completed',
	'failed',
	'cancelled'
]);

// ============================================
// MULTI-TENANCY TABLES
// ============================================

// Organizations table - stores organization (client/project) data with branding/settings
export const organizations = pgTable('cms_organizations', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 200 }).notNull(),
	slug: varchar('slug', { length: 100 }).notNull().unique(),
	parentOrganizationId: uuid('parent_organization_id').references((): any => organizations.id, {
		onDelete: 'set null'
	}), // For parent-child hierarchy (e.g., Record Label -> Artists)
	metadata: jsonb('metadata').$type<{
		logo?: string;
		theme?: { primaryColor: string; fontFamily: string; logoUrl: string };
		website?: string;
		settings?: Record<string, any>;
	}>(),
	createdBy: text('created_by').notNull(), // User ID (super admin who created it)
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Organization Members table - junction table linking users to organizations with roles
export const organizationMembers = pgTable(
	'cms_organization_members',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		userId: text('user_id').notNull(), // References Better Auth user
		role: text('role').notNull(), // Role name — resolved via cms_roles (built-in or custom)
		preferences: jsonb('preferences').$type<Record<string, any>>(), // Org-specific user preferences
		invitationId: uuid('invitation_id').references(() => invitations.id, { onDelete: 'set null' }), // Link to invitation (get invitedBy, invitedEmail from here)
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [
		unique().on(table.organizationId, table.userId),
		index('idx_org_members_user_id').on(table.userId),
		index('idx_org_members_org_id').on(table.organizationId)
	]
);

// Invitations table - pending invitations with secure tokens
export const invitations = pgTable(
	'cms_invitations',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		email: varchar('email', { length: 255 }).notNull(),
		role: text('role').notNull(),
		token: text('token').notNull().unique(),
		invitedBy: text('invited_by').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		acceptedAt: timestamp('accepted_at'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('idx_invitations_email').on(table.email),
		index('idx_invitations_org_id').on(table.organizationId)
	]
);

// Instance Settings table - single-row key-value store for instance-level config
export const instanceSettings = pgTable('cms_instance_settings', {
	id: text('id').primaryKey().default('default'),
	settings: jsonb('settings').$type<Record<string, any>>().default({}).notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Plugin Settings table — the generic per-(org, plugin) config store. One row per
// organization per plugin (a config singleton), keyed by the plugin's id. `values`
// is an opaque JSON blob of the plugin's settings; secret fields are stored already
// encrypted by core. This is CONFIG, not content — no drafts/versions/references.
export const pluginSettings = pgTable(
	'cms_plugin_settings',
	{
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		pluginId: varchar('plugin_id', { length: 200 }).notNull(),
		values: jsonb('values')
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [
		primaryKey({ columns: [table.organizationId, table.pluginId] }),
		pgPolicy('plugin_settings_org_isolation', {
			for: 'all',
			using: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))`,
			withCheck: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid)`
		})
	]
);

// Roles table — per-organization role definitions (built-in + custom).
// Built-ins (owner/admin/editor/viewer) are seeded on org creation and
// flagged via is_built_in. Custom roles live alongside them.
export const roles = pgTable(
	'cms_roles',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 100 }).notNull(),
		description: text('description'),
		capabilities: jsonb('capabilities')
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		isBuiltIn: text('is_built_in').notNull().default('false'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [unique().on(table.organizationId, table.name)]
);

// User Sessions table - track which organization user is currently working in
export const userSessions = pgTable('cms_user_sessions', {
	userId: text('user_id').primaryKey(), // References Better Auth user
	activeOrganizationId: uuid('active_organization_id').references(() => organizations.id),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ============================================
// CONTENT TABLES
// ============================================

// Documents table - stores all content with draft/published separation
export const documents = pgTable(
	'cms_documents',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		type: varchar('type', { length: 100 }).notNull(), // Document type name
		status: documentStatusEnum('status').default('draft'), // 'draft' | 'published'
		// Draft/Published data separation
		draftData: jsonb('draft_data'), // Current working version
		publishedData: jsonb('published_data'), // Live/published version
		// Version tracking
		publishedHash: varchar('published_hash', { length: 20 }), // Hash of published content for change detection
		// User tracking (no FK - references user in app layer)
		createdBy: text('created_by'), // User ID who created this document
		updatedBy: text('updated_by'), // User ID who last updated this document
		// Metadata
		publishedAt: timestamp('published_at'), // When was it published
		createdAt: timestamp('created_at').defaultNow(),
		updatedAt: timestamp('updated_at').defaultNow()
	},
	(table) => [
		index('idx_documents_org_id').on(table.organizationId),
		index('idx_documents_type').on(table.type),
		index('idx_documents_org_type').on(table.organizationId, table.type),
		pgPolicy('documents_org_isolation', {
			for: 'all',
			using: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))`,
			withCheck: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid)`
		})
	]
);

// Document Versions table - stores snapshots of document data on publish/unpublish/restore
export const documentVersions = pgTable(
	'cms_document_versions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		documentId: uuid('document_id')
			.notNull()
			.references(() => documents.id, { onDelete: 'cascade' }),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		versionNumber: integer('version_number').notNull(),
		eventType: versionEventEnum('event_type').notNull(),
		data: jsonb('data').notNull(), // Full snapshot of document data at this version
		createdBy: text('created_by'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		unique().on(table.documentId, table.versionNumber),
		index('idx_doc_versions_doc_org').on(table.documentId, table.organizationId),
		pgPolicy('document_versions_org_isolation', {
			for: 'all',
			using: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))`,
			withCheck: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid)`
		})
	]
);

// Asset table - stores uploaded files (Sanity-style asset documents)
export const assets = pgTable(
	'cms_assets',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		// Asset type: 'image' or 'file'
		assetType: varchar('asset_type', { length: 20 }).notNull(), // 'image' | 'file'
		// File information
		filename: varchar('filename', { length: 255 }).notNull(), // Generated filename on disk
		originalFilename: varchar('original_filename', { length: 255 }).notNull(),
		mimeType: varchar('mime_type', { length: 100 }).notNull(),
		size: integer('size').notNull(),
		// Storage information
		url: text('url').notNull(), // Public URL
		path: text('path').notNull(), // Internal storage path
		storageAdapter: varchar('storage_adapter', { length: 50 }).notNull().default('local'), // Which adapter stored this file
		// Image-specific metadata (null for non-images)
		width: integer('width'),
		height: integer('height'),
		// Rich metadata (Sanity-style)
		metadata: jsonb('metadata'), // EXIF, color palette, etc.
		// Optional fields (can be set during upload or later)
		title: varchar('title', { length: 255 }),
		description: text('description'),
		alt: text('alt'),
		creditLine: text('credit_line'),
		// User tracking (no FK - references user in app layer)
		createdBy: text('created_by'), // User ID who uploaded this asset
		updatedBy: text('updated_by'), // User ID who last updated this asset
		// Timestamps
		createdAt: timestamp('created_at').defaultNow(),
		updatedAt: timestamp('updated_at').defaultNow()
	},
	(table) => [
		index('idx_assets_org_id').on(table.organizationId),
		pgPolicy('assets_org_isolation', {
			for: 'all',
			using: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))`,
			withCheck: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid)`
		})
	]
);

// Document references table — back-reference index for the publish/unpublish
// integrity guards. One row per (referencer, target) pair regardless of how
// many times a referencer points at the same target. Repopulated on every
// save via the references service in cms-core.
export const documentReferences = pgTable(
	'cms_document_references',
	{
		referencerId: uuid('referencer_id')
			.notNull()
			.references(() => documents.id, { onDelete: 'cascade' }),
		refId: uuid('ref_id')
			.notNull()
			.references(() => documents.id, { onDelete: 'cascade' }),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		primaryKey({ columns: [table.referencerId, table.refId] }),
		index('idx_doc_refs_ref_id').on(table.refId, table.organizationId),
		pgPolicy('document_references_org_isolation', {
			for: 'all',
			using: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))`,
			withCheck: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid)`
		})
	]
);

// ============================================
// EVENT + JOB TABLES (durable spine)
// ============================================

// Domain events table — append-only business history (audit / replay / analytics).
// Immutable: rows are inserted, never updated or deleted (except by tenant deletion
// cascade). Written via `appendEvent`, typically inside the same transaction as the
// state change that caused it (transactional outbox). Payload carries identifiers +
// intentional metadata only — never secrets, raw form answers, or full document copies.
export const domainEvents = pgTable(
	'cms_domain_events',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		type: varchar('type', { length: 200 }).notNull(), // e.g. 'document.published'
		payload: jsonb('payload')
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		correlationId: text('correlation_id'), // groups events from one logical operation
		causationId: text('causation_id'), // the event/command that caused this one
		createdBy: text('created_by'), // user who triggered it, if any
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('idx_domain_events_org_created').on(table.organizationId, table.createdAt),
		index('idx_domain_events_org_type').on(table.organizationId, table.type),
		pgPolicy('domain_events_org_isolation', {
			for: 'all',
			using: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))`,
			withCheck: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid)`
		})
	]
);

// Jobs table — commands to run now or later (scheduled publish, reminders, etc.).
// Lifecycle: pending → leased → completed / failed / cancelled. `leaseOwner` +
// `leaseExpiresAt` let a crashed worker's claim be recovered by another worker after
// the lease expires. `idempotencyKey` (unique per org) makes enqueue safe to retry.
export const jobs = pgTable(
	'cms_jobs',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		type: varchar('type', { length: 200 }).notNull(), // e.g. 'document.publish'
		payload: jsonb('payload')
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		status: jobStatusEnum('status').notNull().default('pending'),
		runAt: timestamp('run_at').defaultNow().notNull(), // when the job becomes due
		attempts: integer('attempts').notNull().default(0),
		maxAttempts: integer('max_attempts').notNull().default(5),
		leaseOwner: text('lease_owner'),
		leaseExpiresAt: timestamp('lease_expires_at'),
		lastError: text('last_error'),
		idempotencyKey: text('idempotency_key'),
		correlationId: text('correlation_id'),
		causationId: text('causation_id'),
		createdBy: text('created_by'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
		completedAt: timestamp('completed_at')
	},
	(table) => [
		index('idx_jobs_status_run_at').on(table.status, table.runAt),
		index('idx_jobs_org_id').on(table.organizationId),
		unique('uq_jobs_org_idempotency').on(table.organizationId, table.idempotencyKey),
		pgPolicy('jobs_org_isolation', {
			for: 'all',
			using: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))`,
			withCheck: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid)`
		})
	]
);

// Event outbox — the relay's worklist. One row is written in the SAME transaction as each
// `cms_domain_events` row (so it can't exist without its event, nor be missed if the event
// committed). The relay drains rows where `processed_at IS NULL`, enqueues one delivery job
// per subscribed consumer, then stamps `processed_at`. Kept separate from the immutable event
// log on purpose: this is a mutable, prunable worklist claimed by status — never by log
// position — so an event whose tx commits late (early timestamp) is still picked up.
// `event_type`/`payload` are denormalized so the relay fans out from one table with no join.
export const eventOutbox = pgTable(
	'cms_event_outbox',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		eventId: uuid('event_id')
			.notNull()
			.references(() => domainEvents.id, { onDelete: 'cascade' }),
		eventType: varchar('event_type', { length: 200 }).notNull(),
		payload: jsonb('payload')
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		correlationId: text('correlation_id'),
		causationId: text('causation_id'),
		createdBy: text('created_by'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		processedAt: timestamp('processed_at') // null until fanned out to every subscriber
	},
	(table) => [
		// The relay's hot query: WHERE processed_at IS NULL ORDER BY created_at. Partial index
		// on the unprocessed tail keeps it cheap as the processed history grows.
		index('idx_event_outbox_unprocessed')
			.on(table.createdAt)
			.where(sql`processed_at IS NULL`),
		pgPolicy('event_outbox_org_isolation', {
			for: 'all',
			using: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))`,
			withCheck: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid)`
		})
	]
);

// Plugin storage — a generic, org-scoped record store for plugins; the DATA-plane sibling of
// the CONFIG-plane cms_plugin_settings. NOT content: rows never enter the document model (no
// drafts, versions, publish, content API, or MCP). Rows are namespaced by (plugin, collection)
// — e.g. the forms plugin stores a submission as (plugin:'forms', collection:<formId>). The row
// is written in the same transaction as the announcing domain event (via createPluginRecord on
// the tx handle) so a record and its event can't diverge.
export const pluginStorage = pgTable(
	'cms_plugin_storage',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		plugin: varchar('plugin', { length: 200 }).notNull(),
		collection: varchar('collection', { length: 200 }).notNull(),
		data: jsonb('data')
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('idx_plugin_storage_org_plugin_collection_created').on(
			table.organizationId,
			table.plugin,
			table.collection,
			table.createdAt
		),
		pgPolicy('plugin_storage_org_isolation', {
			for: 'all',
			using: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))`,
			withCheck: sql`(current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid)`
		})
	]
);

// Schema types table - stores document and object type definitions (Sanity-style)
export const schemaTypes = pgTable('cms_schema_types', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 100 }).notNull().unique(),
	title: varchar('title', { length: 200 }).notNull(),
	type: schemaTypeEnum('type').notNull(), // 'document' or 'object'
	description: text('description'),
	fields: jsonb('fields').notNull(), // Field definitions
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});

// User Profiles table - stores CMS-specific user data (roles, preferences)
export const userProfiles = pgTable('cms_user_profiles', {
	userId: text('user_id').primaryKey(), // No FK - references user in app layer
	role: text('role', { enum: ['super_admin', 'admin', 'editor', 'viewer'] })
		.default('editor')
		.notNull(),
	preferences: jsonb('preferences').$type<{
		theme?: 'light' | 'dark';
		language?: string;
		includeChildOrganizations?: boolean;
		[key: string]: any;
	}>(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ============================================
// EXPORT CMS SCHEMA
// ============================================
export const cmsSchema = {
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

	// Enums
	documentStatusEnum,
	versionEventEnum,
	schemaTypeEnum,
	jobStatusEnum
};

// Export CMSSchema type (for passing to adapter constructor)
export type CMSSchema = typeof cmsSchema;

// ============================================
// TYPE INFERENCE FROM DRIZZLE
// ============================================
// Infer TypeScript types from Drizzle schema definitions

// Organization types
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;

export type RoleRow = typeof roles.$inferSelect;
export type NewRoleRow = typeof roles.$inferInsert;

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

export type DomainEventRow = typeof domainEvents.$inferSelect;
export type NewDomainEventRow = typeof domainEvents.$inferInsert;

export type EventOutboxRow = typeof eventOutbox.$inferSelect;
export type NewEventOutboxRow = typeof eventOutbox.$inferInsert;

export type PluginStorageRow = typeof pluginStorage.$inferSelect;
export type NewPluginStorageRow = typeof pluginStorage.$inferInsert;

export type JobRow = typeof jobs.$inferSelect;
export type NewJobRow = typeof jobs.$inferInsert;

// ============================================
// TYPE SAFETY
// ============================================
// Type safety is enforced through the adapter interfaces
// DocumentAdapter, AssetAdapter use universal types from @aphexcms/cms-core/server
// The Drizzle schema must be compatible with these universal types
