// PostgreSQL adapter - combines document and asset adapters
import type { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import type { DatabaseAdapter, DatabaseProvider } from '@aphex/cms-core/server';
import { PostgreSQLDocumentAdapter } from './document-adapter.js';
import { PostgreSQLAssetAdapter } from './asset-adapter.js';
import type { CMSSchema } from './schema.js';
import { cmsSchema } from './schema.js';

/**
 * Combined PostgreSQL adapter that implements the full DatabaseAdapter interface
 * Composes document and asset adapters into a single unified interface
 */
export class PostgreSQLAdapter implements DatabaseAdapter {
	private db: ReturnType<typeof drizzle>;
	private tables: CMSSchema;
	private documentAdapter: PostgreSQLDocumentAdapter;
	private assetAdapter: PostgreSQLAssetAdapter;

	constructor(config: {
		db: ReturnType<typeof drizzle>; // Drizzle client with full schema (CMS + Auth)
		tables: CMSSchema; // CMS-specific tables for adapter to use
	}) {
		this.db = config.db;
		this.tables = config.tables;

		// Pass the Drizzle instance and tables to both adapters
		this.documentAdapter = new PostgreSQLDocumentAdapter(this.db, this.tables);
		this.assetAdapter = new PostgreSQLAssetAdapter(this.db, this.tables);
	}

	// Document operations - delegate to document adapter
	async findMany(filters?: any) {
		return this.documentAdapter.findMany(filters);
	}

	async findById(id: string, depth?: number) {
		return this.documentAdapter.findById(id, depth);
	}

	async create(data: any) {
		return this.documentAdapter.create(data);
	}

	async updateDraft(id: string, data: any, updatedBy?: string) {
		return this.documentAdapter.updateDraft(id, data, updatedBy);
	}

	async deleteById(id: string) {
		return this.documentAdapter.deleteById(id);
	}

	async publish(id: string) {
		return this.documentAdapter.publish(id);
	}

	async unpublish(id: string) {
		return this.documentAdapter.unpublish(id);
	}

	async countByType(type: string) {
		return this.documentAdapter.countByType(type);
	}

	async getCountsByType() {
		return this.documentAdapter.getCountsByType();
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

	// Connection management
	async disconnect(): Promise<void> {
		// Connection is managed by the app, not the adapter
		// This method is here for interface compatibility
	}

	// Health check
	async isHealthy(): Promise<boolean> {
		try {
			// Simple health check - try counting documents
			await this.documentAdapter.getCountsByType();
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
export {
	documents,
	assets,
	schemaTypes,
	documentStatusEnum,
	schemaTypeEnum
} from './schema.js';

// Re-export universal types from cms-core for convenience
// Apps can import from either @aphex/cms-core or @aphex/postgresql-adapter
export type {
	Document,
	NewDocument,
	Asset,
	NewAsset,
	SchemaTypeRecord as SchemaType,
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
