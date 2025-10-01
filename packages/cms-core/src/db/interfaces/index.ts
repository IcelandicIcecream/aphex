// Combined database interface
import type { DocumentAdapter } from './document.js';
import type { AssetAdapter } from './asset.js';

// Re-export individual interfaces
export type { DocumentAdapter, DocumentFilters, CreateDocumentData, UpdateDocumentData } from './document.js';
export type { AssetAdapter, AssetFilters, CreateAssetData, UpdateAssetData } from './asset.js';

/**
 * Combined database adapter interface
 * Extends both document and asset adapters for full database functionality
 */
export interface DatabaseAdapter extends DocumentAdapter, AssetAdapter {
  // Connection management
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;

  // Health check
  isHealthy(): Promise<boolean>;
}

/**
 * Database provider factory interface
 */
export interface DatabaseProvider {
  name: string;
  createAdapter(config: DatabaseConfig): DatabaseAdapter;
}

/**
 * Generic database configuration
 */
export interface DatabaseConfig {
  connectionString: string;
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
  withTransaction<T>(
    fn: (adapter: DatabaseAdapter) => Promise<T>
  ): Promise<T>;
}