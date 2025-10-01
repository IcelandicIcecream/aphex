// Database schema for Aphex CMS using Drizzle ORM
import { pgTable, text, uuid, timestamp, jsonb, varchar, integer, pgEnum } from 'drizzle-orm/pg-core';
// Enums for better type safety and constraints
export const documentStatusEnum = pgEnum('document_status', ['draft', 'published']);
export const schemaTypeEnum = pgEnum('schema_type', ['document', 'object']);
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
