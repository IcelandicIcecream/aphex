// Combined database interface
import type { DocumentAdapter } from './document.js';
import type { AssetAdapter } from './asset.js';
import type { UserProfileAdapter } from './user.js';

// Re-export individual interfaces
export type {
	DocumentAdapter,
	DocumentFilters,
	CreateDocumentData,
	UpdateDocumentData
} from './document.js';
export type { AssetAdapter, AssetFilters, CreateAssetData, UpdateAssetData } from './asset.js';
export type { UserProfileAdapter, NewUserProfileData } from './user.js';

/**
 * Combined database adapter interface
 * Extends all entity-specific adapters for full database functionality
 */
export interface DatabaseAdapter extends DocumentAdapter, AssetAdapter, UserProfileAdapter {
	// Connection management
	connect?(): Promise<void>;
	disconnect?(): Promise<void>;

	// Health check
	isHealthy(): Promise<boolean>;
}

/**
 * Database provider factory interface
 * Providers are pre-configured and create adapters on demand
 */
export interface DatabaseProvider {
	name: string;
	createAdapter(): DatabaseAdapter;
}

/**
 * Generic database configuration
 */
export interface DatabaseConfig {
	connectionString?: string; // Optional if client is provided
	client?: any; // Pre-initialized database client (recommended for database agnosticism)
	options?: {
		maxConnections?: number;
		timeout?: number;
		ssl?: boolean;
		[key: string]: any;
	};
}

/**
 * Database transaction interface (optional for advanced providers)
 */
export interface DatabaseTransaction {
	commit(): Promise<void>;
	rollback(): Promise<void>;
	isActive(): boolean;
}

/**
 * Extended database adapter with transaction support
 */
export interface TransactionalDatabaseAdapter extends DatabaseAdapter {
	beginTransaction(): Promise<DatabaseTransaction>;
	withTransaction<T>(fn: (adapter: DatabaseAdapter) => Promise<T>): Promise<T>;
}
