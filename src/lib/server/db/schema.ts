// Database schema for the CMS using Drizzle ORM
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

// Media table - stores uploaded files
export const media = pgTable('cms_media', {
  id: uuid('id').defaultRandom().primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  url: text('url').notNull(),
  alt: text('alt'),
  createdAt: timestamp('created_at').defaultNow()
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

// Future: Document versions table for full version history
// Uncomment when ready to implement versioning
/*
export const documentVersions = pgTable('cms_document_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id').references(() => documents.id),
  contentHash: varchar('content_hash', { length: 20 }).notNull(),
  data: jsonb('data').notNull(), // Full content snapshot
  versionType: documentStatusEnum('version_type').notNull(), // Reuse same enum: 'draft' | 'published'
  publishedAt: timestamp('published_at').defaultNow(),
  publishedBy: uuid('published_by'), // Future: user tracking
});
*/

// Type definitions for the schema
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;

export type SchemaType = typeof schemaTypes.$inferSelect;
export type NewSchemaType = typeof schemaTypes.$inferInsert;
