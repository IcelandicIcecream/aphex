// PostgreSQL adapter - combines document and asset adapters
import type { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import type { DatabaseAdapter, DatabaseProvider, SchemaType } from '@aphex/cms-core/server';
import { PostgreSQLDocumentAdapter } from './document-adapter.js';
import { PostgreSQLAssetAdapter } from './asset-adapter.js';
import { PostgreSQLUserProfileAdapter } from './user-adapter.js';
import { PostgreSQLSchemaAdapter } from './schema-adapter.js';
import type { CMSSchema } from './schema.js';
import { cmsSchema } from './schema.js';

/**
 * Combined PostgreSQL adapter that implements the full DatabaseAdapter interface
 * Composes document, asset, and user profile adapters into a single unified interface
 */
export class PostgreSQLAdapter implements DatabaseAdapter {
	private db: ReturnType<typeof drizzle>;
	private tables: CMSSchema;
	private documentAdapter: PostgreSQLDocumentAdapter;
	private assetAdapter: PostgreSQLAssetAdapter;
	private userProfileAdapter: PostgreSQLUserProfileAdapter;
	private schemaAdapter: PostgreSQLSchemaAdapter;

	constructor(config: {
		db: ReturnType<typeof drizzle>; // Drizzle client with full schema (CMS + Auth)
		tables: CMSSchema; // CMS-specific tables for adapter to use
	}) {
		this.db = config.db;
		this.tables = config.tables;

		// Pass the Drizzle instance and tables to all adapters
		this.documentAdapter = new PostgreSQLDocumentAdapter(this.db, this.tables);
		this.assetAdapter = new PostgreSQLAssetAdapter(this.db, this.tables);
		this.userProfileAdapter = new PostgreSQLUserProfileAdapter(this.db, this.tables);
		this.schemaAdapter = new PostgreSQLSchemaAdapter(this.db, this.tables);
	}

	// Document operations - delegate to document adapter
	async findManyDoc(filters?: any) {
		return this.documentAdapter.findManyDoc(filters);
	}

	async findByDocId(id: string, depth?: number) {
		return this.documentAdapter.findByDocId(id, depth);
	}

	async createDocument(data: any) {
		return this.documentAdapter.createDocument(data);
	}

	async updateDocDraft(id: string, data: any, updatedBy?: string) {
		return this.documentAdapter.updateDocDraft(id, data, updatedBy);
	}

	async deleteDocById(id: string) {
		return this.documentAdapter.deleteDocById(id);
	}

	async publishDoc(id: string) {
		return this.documentAdapter.publishDoc(id);
	}

	async unpublishDoc(id: string) {
		return this.documentAdapter.unpublishDoc(id);
	}

	async countDocsByType(type: string) {
		return this.documentAdapter.countDocsByType(type);
	}

	async getDocCountsByType() {
		return this.documentAdapter.getDocCountsByType();
	}

	// Asset operations - delegate to asset adapter
	async createAsset(data: any) {
		return this.assetAdapter.createAsset(data);
	}

	async findAssetById(id: string) {
		return this.assetAdapter.findAssetById(id);
	}

	async findAssets(filters?: any) {
		return this.assetAdapter.findAssets(filters);
	}

	async updateAsset(id: string, data: any) {
		return this.assetAdapter.updateAsset(id, data);
	}

	async deleteAsset(id: string) {
		return this.assetAdapter.deleteAsset(id);
	}

	async countAssets() {
		return this.assetAdapter.countAssets();
	}

	async countAssetsByType() {
		return this.assetAdapter.countAssetsByType();
	}

	async getTotalAssetsSize() {
		return this.assetAdapter.getTotalAssetsSize();
	}

	// User Profile operations - delegate to user profile adapter
	async createUserProfile(data: any) {
		return this.userProfileAdapter.createUserProfile(data);
	}

	async findUserProfileById(userId: string) {
		return this.userProfileAdapter.findUserProfileById(userId);
	}

	async deleteUserProfile(userId: string) {
		return this.userProfileAdapter.deleteUserProfile(userId);
	}

	// Schema operations - delegate to schema adapter
	async registerSchemaType(schemaType: SchemaType): Promise<void> {
		return this.schemaAdapter.registerSchemaType(schemaType);
	}

	async getSchemaType(name: string): Promise<SchemaType | null> {
		return this.schemaAdapter.getSchemaType(name);
	}

	async listDocumentTypes(): Promise<Array<{ name: string; title: string; description?: string }>> {
		return this.schemaAdapter.listDocumentTypes();
	}

	async listObjectTypes(): Promise<Array<{ name: string; title: string; description?: string }>> {
		return this.schemaAdapter.listObjectTypes();
	}

	async listSchemas(): Promise<SchemaType[]> {
		return this.schemaAdapter.listSchemas();
	}

	// Connection management
	async disconnect(): Promise<void> {
		// Connection is managed by the app, not the adapter
		// This method is here for interface compatibility
	}

	// Health check
	async isHealthy(): Promise<boolean> {
		try {
			// Simple health check - try counting documents
			await this.documentAdapter.getDocCountsByType();
			return true;
		} catch (error) {
			console.error('Database health check failed:', error);
			return false;
		}
	}
}

// Re-export for convenience
export { PostgreSQLDocumentAdapter } from './document-adapter.js';
export { PostgreSQLAssetAdapter } from './asset-adapter.js';

// Export schema (table definitions for Drizzle)
export { cmsSchema } from './schema.js';
export type { CMSSchema } from './schema.js';

// Export individual schema tables for app usage
export { documents, assets, schemaTypes, documentStatusEnum, schemaTypeEnum } from './schema.js';

// Re-export universal types from cms-core for convenience
// Apps can import from either @aphex/cms-core or @aphex/postgresql-adapter
export type {
	Document,
	NewDocument,
	Asset,
	NewAsset,
	SchemaType,
	NewSchemaType
} from '@aphex/cms-core/server';

/**
 * PostgreSQL-specific configuration options
 */
export interface PostgreSQLConfig {
	/** Pre-initialized postgres client (recommended for connection pooling) */
	client?: any;
	/** Connection string (if not providing client) */
	connectionString?: string;
	/** Connection pool options (if using connectionString) */
	options?: {
		max?: number; // Maximum connections in pool (default: 10)
		idle_timeout?: number; // Close idle connections after N seconds (default: 20)
		connect_timeout?: number; // Connection timeout in seconds (default: 10)
		[key: string]: any; // Allow additional postgres options
	};
}

/**
 * PostgreSQL database provider
 */
class PostgreSQLProvider implements DatabaseProvider {
	name = 'postgresql';
	private config: PostgreSQLConfig;

	constructor(config: PostgreSQLConfig) {
		this.config = config;
	}

	createAdapter(): DatabaseAdapter {
		// If client is provided directly, use it with drizzle
		if (this.config.client) {
			const db = drizzlePostgres(this.config.client, { schema: cmsSchema });
			return new PostgreSQLAdapter({ db, tables: cmsSchema });
		}

		// Otherwise create a new postgres client from connection string
		if (!this.config.connectionString) {
			throw new Error('PostgreSQL adapter requires either a client or connectionString');
		}

		const client = postgres(this.config.connectionString, this.config.options);
		const db = drizzlePostgres(client, { schema: cmsSchema });
		return new PostgreSQLAdapter({ db, tables: cmsSchema });
	}
}

/**
 * Create a PostgreSQL database provider with type-safe configuration
 *
 * @example
 * // With pre-initialized client (recommended)
 * const provider = createPostgreSQLProvider({ client: myPostgresClient });
 *
 * @example
 * // With connection string
 * const provider = createPostgreSQLProvider({
 *   connectionString: 'postgres://...',
 *   options: { max: 10, idle_timeout: 20 }
 * });
 */
export function createPostgreSQLProvider(config: PostgreSQLConfig): DatabaseProvider {
	return new PostgreSQLProvider(config);
}
