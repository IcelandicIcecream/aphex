// Database schema for the CMS using Drizzle ORM
import { pgTable, text, uuid, timestamp, jsonb, varchar, integer } from 'drizzle-orm/pg-core';

// Documents table - stores all content (Sanity-compatible)
export const documents = pgTable('cms_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: varchar('type', { length: 100 }).notNull(), // Document type name
  slug: varchar('slug', { length: 200 }),
  status: varchar('status', { length: 20 }).default('draft'),
  data: jsonb('data').notNull(),
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
  type: varchar('type', { length: 20 }).notNull(), // 'document' or 'object'
  description: text('description'),
  schema: jsonb('schema').notNull(), // Field definitions
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Type definitions for the schema
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;

export type SchemaType = typeof schemaTypes.$inferSelect;
export type NewSchemaType = typeof schemaTypes.$inferInsert;
