// Database schema for Aphex CMS on SQLite using Drizzle ORM.
// Mirrors the PostgreSQL adapter's schema (same table/column names) with dialect swaps:
// uuid -> text PK generated app-side, jsonb -> text(json mode), timestamp -> integer(timestamp_ms),
// pgEnum -> text({ enum }), and no RLS policies (SQLite has none — org isolation is enforced by
// the explicit organization_id WHERE clauses every adapter query already applies).
import { sqliteTable, text, integer, primaryKey, index, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================
// STATUS VALUE UNIONS (pgEnum equivalents)
// ============================================
export const documentStatuses = ['draft', 'published', 'unpublished'] as const;
export const versionEvents = ['draft', 'publish'] as const;
export const schemaTypeKinds = ['document', 'object'] as const;
export const jobStatuses = ['pending', 'leased', 'completed', 'failed', 'cancelled'] as const;

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
	integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date());
const updatedAt = () =>
	integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date());

// ============================================
// MULTI-TENANCY TABLES
// ============================================

// Organizations table - stores organization (client/project) data with branding/settings
export const organizations = sqliteTable('cms_organizations', {
	id: id(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	parentOrganizationId: text('parent_organization_id').references((): any => organizations.id, {
		onDelete: 'set null'
	}), // For parent-child hierarchy (e.g., Record Label -> Artists)
	metadata: text('metadata', { mode: 'json' }).$type<{
		logo?: string;
		theme?: { primaryColor: string; fontFamily: string; logoUrl: string };
		website?: string;
		settings?: Record<string, any>;
	}>(),
	createdBy: text('created_by').notNull(), // User ID (super admin who created it)
	createdAt: createdAt().notNull(),
	updatedAt: updatedAt().notNull()
});

// Organization Members table - junction table linking users to organizations with roles
export const organizationMembers = sqliteTable(
	'cms_organization_members',
	{
		id: id(),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		userId: text('user_id').notNull(), // References Better Auth user
		role: text('role').notNull(), // Role name — resolved via cms_roles (built-in or custom)
		preferences: text('preferences', { mode: 'json' }).$type<Record<string, any>>(), // Org-specific user preferences
		invitationId: text('invitation_id').references(() => invitations.id, { onDelete: 'set null' }), // Link to invitation (get invitedBy, invitedEmail from here)
		createdAt: createdAt().notNull(),
		updatedAt: updatedAt().notNull()
	},
	(table) => [
		unique().on(table.organizationId, table.userId),
		index('idx_org_members_user_id').on(table.userId),
		index('idx_org_members_org_id').on(table.organizationId)
	]
);

// Invitations table - pending invitations with secure tokens
export const invitations = sqliteTable(
	'cms_invitations',
	{
		id: id(),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		email: text('email').notNull(),
		role: text('role').notNull(),
		token: text('token').notNull().unique(),
		invitedBy: text('invited_by').notNull(),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		acceptedAt: integer('accepted_at', { mode: 'timestamp_ms' }),
		createdAt: createdAt().notNull()
	},
	(table) => [
		index('idx_invitations_email').on(table.email),
		index('idx_invitations_org_id').on(table.organizationId)
	]
);

// Instance Settings table - single-row key-value store for instance-level config
export const instanceSettings = sqliteTable('cms_instance_settings', {
	id: text('id').primaryKey().default('default'),
	settings: text('settings', { mode: 'json' }).$type<Record<string, any>>().default({}).notNull(),
	updatedAt: updatedAt().notNull()
});

// Plugin Settings table — the generic per-(org, plugin) config store. One row per
// organization per plugin (a config singleton), keyed by the plugin's id. `values`
// is an opaque JSON blob of the plugin's settings; secret fields are stored already
// encrypted by core. This is CONFIG, not content. Org isolation is WHERE-based
// (this adapter has no RLS), enforced by the adapter methods.
export const pluginSettings = sqliteTable(
	'cms_plugin_settings',
	{
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		pluginId: text('plugin_id').notNull(),
		values: text('values', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
		updatedAt: updatedAt().notNull()
	},
	(table) => [primaryKey({ columns: [table.organizationId, table.pluginId] })]
);

// Roles table — per-organization role definitions (built-in + custom).
// Built-ins (owner/admin/editor/viewer) are seeded on org creation and
// flagged via is_built_in. Custom roles live alongside them.
export const roles = sqliteTable(
	'cms_roles',
	{
		id: id(),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		capabilities: text('capabilities', { mode: 'json' }).$type<string[]>().notNull().default([]),
		isBuiltIn: text('is_built_in').notNull().default('false'),
		createdAt: createdAt().notNull(),
		updatedAt: updatedAt().notNull()
	},
	(table) => [unique().on(table.organizationId, table.name)]
);

// User Sessions table - track which organization user is currently working in
export const userSessions = sqliteTable('cms_user_sessions', {
	userId: text('user_id').primaryKey(), // References Better Auth user
	activeOrganizationId: text('active_organization_id').references(() => organizations.id),
	updatedAt: updatedAt().notNull()
});

// ============================================
// CONTENT TABLES
// ============================================

// Documents table - stores all content with draft/published separation
export const documents = sqliteTable(
	'cms_documents',
	{
		id: id(),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		type: text('type').notNull(), // Document type name
		status: text('status', { enum: documentStatuses }).default('draft'), // 'draft' | 'published'
		// Draft/Published data separation
		draftData: text('draft_data', { mode: 'json' }), // Current working version
		publishedData: text('published_data', { mode: 'json' }), // Live/published version
		// Version tracking
		publishedHash: text('published_hash'), // Hash of published content for change detection
		// User tracking (no FK - references user in app layer)
		createdBy: text('created_by'), // User ID who created this document
		updatedBy: text('updated_by'), // User ID who last updated this document
		// Metadata
		publishedAt: integer('published_at', { mode: 'timestamp_ms' }), // When was it published
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [
		index('idx_documents_org_id').on(table.organizationId),
		index('idx_documents_type').on(table.type),
		index('idx_documents_org_type').on(table.organizationId, table.type)
	]
);

// Document Versions table - stores snapshots of document data on publish/unpublish/restore
export const documentVersions = sqliteTable(
	'cms_document_versions',
	{
		id: id(),
		documentId: text('document_id')
			.notNull()
			.references(() => documents.id, { onDelete: 'cascade' }),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		versionNumber: integer('version_number').notNull(),
		eventType: text('event_type', { enum: versionEvents }).notNull(),
		data: text('data', { mode: 'json' }).notNull(), // Full snapshot of document data at this version
		createdBy: text('created_by'),
		createdAt: createdAt().notNull()
	},
	(table) => [
		unique().on(table.documentId, table.versionNumber),
		index('idx_doc_versions_doc_org').on(table.documentId, table.organizationId)
	]
);

// Asset table - stores uploaded files (Sanity-style asset documents)
export const assets = sqliteTable(
	'cms_assets',
	{
		id: id(),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		// Asset type: 'image' or 'file'
		assetType: text('asset_type').notNull(), // 'image' | 'file'
		// File information
		filename: text('filename').notNull(), // Generated filename on disk
		originalFilename: text('original_filename').notNull(),
		mimeType: text('mime_type').notNull(),
		size: integer('size').notNull(),
		// Storage information
		url: text('url').notNull(), // Public URL
		path: text('path').notNull(), // Internal storage path
		storageAdapter: text('storage_adapter').notNull().default('local'), // Which adapter stored this file
		// Image-specific metadata (null for non-images)
		width: integer('width'),
		height: integer('height'),
		// Rich metadata (Sanity-style)
		metadata: text('metadata', { mode: 'json' }), // EXIF, color palette, etc.
		// Optional fields (can be set during upload or later)
		title: text('title'),
		description: text('description'),
		alt: text('alt'),
		creditLine: text('credit_line'),
		// User tracking (no FK - references user in app layer)
		createdBy: text('created_by'), // User ID who uploaded this asset
		updatedBy: text('updated_by'), // User ID who last updated this asset
		// Timestamps
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [index('idx_assets_org_id').on(table.organizationId)]
);

// Document references table — back-reference index for the publish/unpublish
// integrity guards. One row per (referencer, target) pair regardless of how
// many times a referencer points at the same target. Repopulated on every
// save via the references service in cms-core.
export const documentReferences = sqliteTable(
	'cms_document_references',
	{
		referencerId: text('referencer_id')
			.notNull()
			.references(() => documents.id, { onDelete: 'cascade' }),
		refId: text('ref_id')
			.notNull()
			.references(() => documents.id, { onDelete: 'cascade' }),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		createdAt: createdAt().notNull()
	},
	(table) => [
		primaryKey({ columns: [table.referencerId, table.refId] }),
		index('idx_doc_refs_ref_id').on(table.refId, table.organizationId)
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
export const domainEvents = sqliteTable(
	'cms_domain_events',
	{
		id: id(),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		type: text('type').notNull(), // e.g. 'document.published'
		payload: text('payload', { mode: 'json' })
			.$type<Record<string, unknown>>()
			.notNull()
			.default({}),
		correlationId: text('correlation_id'), // groups events from one logical operation
		causationId: text('causation_id'), // the event/command that caused this one
		createdBy: text('created_by'), // user who triggered it, if any
		createdAt: createdAt().notNull()
	},
	(table) => [
		index('idx_domain_events_org_created').on(table.organizationId, table.createdAt),
		index('idx_domain_events_org_type').on(table.organizationId, table.type)
	]
);

// Jobs table — commands to run now or later (scheduled publish, reminders, etc.).
// Lifecycle: pending → leased → completed / failed / cancelled. `leaseOwner` +
// `leaseExpiresAt` let a crashed worker's claim be recovered by another worker after
// the lease expires. `idempotencyKey` (unique per org) makes enqueue safe to retry.
export const jobs = sqliteTable(
	'cms_jobs',
	{
		id: id(),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		type: text('type').notNull(), // e.g. 'document.publish'
		payload: text('payload', { mode: 'json' })
			.$type<Record<string, unknown>>()
			.notNull()
			.default({}),
		status: text('status', { enum: jobStatuses }).notNull().default('pending'),
		runAt: integer('run_at', { mode: 'timestamp_ms' })
			.$defaultFn(() => new Date())
			.notNull(),
		attempts: integer('attempts').notNull().default(0),
		maxAttempts: integer('max_attempts').notNull().default(5),
		leaseOwner: text('lease_owner'),
		leaseExpiresAt: integer('lease_expires_at', { mode: 'timestamp_ms' }),
		lastError: text('last_error'),
		idempotencyKey: text('idempotency_key'),
		correlationId: text('correlation_id'),
		causationId: text('causation_id'),
		createdBy: text('created_by'),
		createdAt: createdAt().notNull(),
		updatedAt: updatedAt().notNull(),
		completedAt: integer('completed_at', { mode: 'timestamp_ms' })
	},
	(table) => [
		index('idx_jobs_status_run_at').on(table.status, table.runAt),
		index('idx_jobs_org_id').on(table.organizationId),
		unique('uq_jobs_org_idempotency').on(table.organizationId, table.idempotencyKey)
	]
);

// Event outbox — the relay's worklist. One row is written in the SAME transaction as each
// `cms_domain_events` row, then drained by the relay: for each subscribed consumer it enqueues
// a delivery job, then stamps `processed_at`. Kept separate from the immutable event log — a
// mutable, prunable worklist claimed by status (`processed_at IS NULL`), never by log position,
// so a late-committing event isn't skipped. `event_type`/`payload` denormalized for join-free fan-out.
export const eventOutbox = sqliteTable(
	'cms_event_outbox',
	{
		id: id(),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		eventId: text('event_id')
			.notNull()
			.references(() => domainEvents.id, { onDelete: 'cascade' }),
		eventType: text('event_type').notNull(),
		payload: text('payload', { mode: 'json' })
			.$type<Record<string, unknown>>()
			.notNull()
			.default({}),
		correlationId: text('correlation_id'),
		causationId: text('causation_id'),
		createdBy: text('created_by'),
		createdAt: createdAt().notNull(),
		processedAt: integer('processed_at', { mode: 'timestamp_ms' }) // null until fanned out
	},
	(table) => [
		// Relay's hot query: WHERE processed_at IS NULL ORDER BY created_at. Partial index on
		// the unprocessed tail keeps it cheap as the processed history grows.
		index('idx_event_outbox_unprocessed')
			.on(table.createdAt)
			.where(sql`processed_at IS NULL`)
	]
);

// Plugin storage — a generic, org-scoped record store for plugins; DATA-plane sibling of the
// CONFIG-plane cms_plugin_settings, NOT content. Rows are namespaced by (plugin, collection) —
// e.g. the forms plugin stores a submission as (plugin:'forms', collection:<formId>). Written in
// the same transaction as the announcing event so the two can't diverge. Org isolation is
// WHERE-based (SQLite has no RLS).
export const pluginStorage = sqliteTable(
	'cms_plugin_storage',
	{
		id: id(),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		plugin: text('plugin').notNull(),
		collection: text('collection').notNull(),
		data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
		createdAt: createdAt().notNull()
	},
	(table) => [
		index('idx_plugin_storage_org_plugin_collection_created').on(
			table.organizationId,
			table.plugin,
			table.collection,
			table.createdAt
		)
	]
);

// Schema types table - stores document and object type definitions (Sanity-style)
export const schemaTypes = sqliteTable('cms_schema_types', {
	id: id(),
	name: text('name').notNull().unique(),
	title: text('title').notNull(),
	type: text('type', { enum: schemaTypeKinds }).notNull(), // 'document' or 'object'
	description: text('description'),
	fields: text('fields', { mode: 'json' }).notNull(), // Field definitions
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

// User Profiles table - stores CMS-specific user data (roles, preferences)
export const userProfiles = sqliteTable('cms_user_profiles', {
	userId: text('user_id').primaryKey(), // No FK - references user in app layer
	role: text('role', { enum: ['super_admin', 'admin', 'editor', 'viewer'] })
		.default('editor')
		.notNull(),
	preferences: text('preferences', { mode: 'json' }).$type<{
		theme?: 'light' | 'dark';
		language?: string;
		includeChildOrganizations?: boolean;
		[key: string]: any;
	}>(),
	createdAt: createdAt().notNull(),
	updatedAt: updatedAt().notNull()
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
	pluginStorage
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
