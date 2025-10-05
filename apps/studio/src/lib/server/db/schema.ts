// Database schema for Aphex CMS using Drizzle ORM
// This file combines CMS package schema with app-specific tables

import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

// Re-export CMS core schema tables from PostgreSQL adapter package
// Import from /schema to avoid loading the entire adapter
export {
	documents,
	assets,
	schemaTypes,
	documentStatusEnum,
	schemaTypeEnum
} from '@aphex/postgresql-adapter/schema';

// Re-export CMS types
export type {
	Document,
	NewDocument,
	Asset,
	NewAsset,
	SchemaType,
	NewSchemaType
} from '@aphex/postgresql-adapter';

// Re-export Better Auth schema (app-specific)
export * from './auth-schema';

// User Profiles - CMS-specific user data synced with Better Auth
export const userProfiles = pgTable('cms_user_profiles', {
	userId: text('user_id').primaryKey(),
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
