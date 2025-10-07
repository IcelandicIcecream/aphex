// Database schema for Aphex CMS using Drizzle ORM
import {
	pgTable,
	text,
	uuid,
	timestamp,
	jsonb,
	varchar,
	integer,
	pgEnum
} from 'drizzle-orm/pg-core';

// ============================================
// ENUMS
// ============================================
export const documentStatusEnum = pgEnum('document_status', ['draft', 'published']);
export const schemaTypeEnum = pgEnum('schema_type', ['document', 'object']);

// ============================================
// CONTENT TABLES
// ============================================

// Documents table - stores all content with draft/published separation
export const documents = pgTable('cms_documents', {
	id: uuid('id').defaultRandom().primaryKey(),
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
});

// Asset table - stores uploaded files (Sanity-style asset documents)
export const assets = pgTable('cms_assets', {
	id: uuid('id').defaultRandom().primaryKey(),
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
	// Timestamps
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});

// Schema types table - stores document and object type definitions (Sanity-style)
export const schemaTypes = pgTable('cms_schema_types', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 100 }).notNull().unique(),
	title: varchar('title', { length: 200 }).notNull(),
	type: schemaTypeEnum('type').notNull(), // 'document' or 'object'
	description: text('description'),
	schema: jsonb('schema').notNull(), // Field definitions
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});

// User Profiles table - stores CMS-specific user data (roles, preferences)
export const userProfiles = pgTable('cms_user_profiles', {
	userId: text('user_id').primaryKey(), // No FK - references user in app layer
	role: text('role', { enum: ['admin', 'editor', 'viewer'] })
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
	// Content tables
	documents,
	assets,
	schemaTypes,
	userProfiles,

	// Enums
	documentStatusEnum,
	schemaTypeEnum
};

// Export CMSSchema type (for passing to adapter constructor)
export type CMSSchema = typeof cmsSchema;

// ============================================
// TYPE SAFETY
// ============================================
// Type safety is enforced through the adapter interfaces
// DocumentAdapter, AssetAdapter use universal types from @aphex/cms-core/server
// The Drizzle schema must be compatible with these universal types
