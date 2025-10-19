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
	unique
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================
// ENUMS
// ============================================
export const documentStatusEnum = pgEnum('document_status', ['draft', 'published']);
export const schemaTypeEnum = pgEnum('schema_type', ['document', 'object']);
export const organizationRoleEnum = pgEnum('organization_role', ['owner', 'admin', 'editor', 'viewer']);

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
export const organizationMembers = pgTable('cms_organization_members', {
	id: uuid('id').defaultRandom().primaryKey(),
	organizationId: uuid('organization_id')
		.notNull()
		.references(() => organizations.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull(), // References Better Auth user
	role: organizationRoleEnum('role').notNull(),
	preferences: jsonb('preferences').$type<Record<string, any>>(), // Org-specific user preferences
	invitationId: uuid('invitation_id').references(() => invitations.id, { onDelete: 'set null' }), // Link to invitation (get invitedBy, invitedEmail from here)
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
	unique().on(table.organizationId, table.userId)
]);

// Invitations table - pending invitations with secure tokens
export const invitations = pgTable('cms_invitations', {
	id: uuid('id').defaultRandom().primaryKey(),
	organizationId: uuid('organization_id')
		.notNull()
		.references(() => organizations.id, { onDelete: 'cascade' }),
	email: varchar('email', { length: 255 }).notNull(),
	role: organizationRoleEnum('role').notNull(),
	token: text('token').notNull().unique(), // Crypto-random token (32 bytes)
	invitedBy: text('invited_by').notNull(), // User ID of inviter
	expiresAt: timestamp('expires_at').notNull(), // Default: now() + 7 days
	acceptedAt: timestamp('accepted_at'), // Null until accepted
	createdAt: timestamp('created_at').defaultNow().notNull()
});

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
	() => [
		// RLS Policy: Users can only access documents from their organization or child organizations
		pgPolicy('documents_org_isolation', {
			for: 'all',
			using: sql`
				organization_id IN (
					SELECT current_setting('app.organization_id', true)::uuid
					UNION
					SELECT id FROM ${organizations}
					WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid
				)
			`,
			withCheck: sql`
				organization_id = current_setting('app.organization_id', true)::uuid
			`
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
	() => [
		// RLS Policy: Users can only access assets from their organization or child organizations
		pgPolicy('assets_org_isolation', {
			for: 'all',
			using: sql`
				organization_id IN (
					SELECT current_setting('app.organization_id', true)::uuid
					UNION
					SELECT id FROM ${organizations}
					WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid
				)
			`,
			withCheck: sql`
				organization_id = current_setting('app.organization_id', true)::uuid
			`
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
	userSessions,

	// Content tables
	documents,
	assets,
	schemaTypes,
	userProfiles,

	// Enums
	documentStatusEnum,
	schemaTypeEnum,
	organizationRoleEnum
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

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

// ============================================
// TYPE SAFETY
// ============================================
// Type safety is enforced through the adapter interfaces
// DocumentAdapter, AssetAdapter use universal types from @aphex/cms-core/server
// The Drizzle schema must be compatible with these universal types
