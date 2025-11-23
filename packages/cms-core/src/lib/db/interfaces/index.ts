// Combined database interface
import type { DocumentAdapter } from './document';
import type { AssetAdapter } from './asset';
import type { UserProfileAdapter } from './user';
import type { SchemaAdapter } from './schema';
import type { OrganizationAdapter } from './organization';

// Re-export individual interfaces
export type {
	DocumentAdapter,
	DocumentFilters,
	CreateDocumentData,
	UpdateDocumentData
} from './document';
export type { AssetAdapter, CreateAssetData, UpdateAssetData } from './asset';
export type { UserProfileAdapter, NewUserProfileData } from './user';
export type { SchemaAdapter } from './schema';
export type { OrganizationAdapter } from './organization';

/**
 * Combined database adapter interface
 * Extends all entity-specific adapters for full database functionality
 */
export interface DatabaseAdapter
	extends DocumentAdapter,
		AssetAdapter,
		UserProfileAdapter,
		SchemaAdapter,
		OrganizationAdapter {
	// Connection management
	connect?(): Promise<void>;
	disconnect?(): Promise<void>;

	// Health check
	isHealthy(): Promise<boolean>;

	// Multi-tenancy RLS methods (optional - only for adapters that support RLS)
	/**
	 * Initialize RLS (enable/disable) on tables - call after migrations
	 */
	initializeRLS?(): Promise<void>;
	hierarchyEnabled: boolean;

	/**
	 * Execute a function within a transaction with organization context set for RLS
	 * Ensures proper isolation with connection pooling
	 */
	withOrgContext?<T>(organizationId: string, fn: () => Promise<T>): Promise<T>;

	/**
	 * Get all child organizations for a parent (for hierarchy support)
	 */
	getChildOrganizations(parentOrganizationId: string): Promise<string[]>;

	/**
	 * Check if any user profiles exist in the system (for first-user detection)
	 */
	hasAnyUserProfiles?(): Promise<boolean>;
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
