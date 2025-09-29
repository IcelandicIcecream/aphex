// Database interface for polymorphic database abstraction
import type { Document } from '$lib/server/db/schema.js';

export interface DocumentFilters {
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CreateDocumentData {
  type: string;
  draftData: any;
}

export interface UpdateDocumentData {
  draftData?: any;
  status?: string;
}

/**
 * Abstract database interface for CMS operations
 * This allows switching between different database providers (PostgreSQL, MongoDB, SQLite, etc.)
 */
export interface DatabaseAdapter {
  // Document CRUD operations
  findMany(filters?: DocumentFilters): Promise<Document[]>;
  findById(id: string): Promise<Document | null>;
  create(data: CreateDocumentData): Promise<Document>;
  updateDraft(id: string, data: any): Promise<Document | null>;
  deleteById(id: string): Promise<boolean>;

  // Publishing operations
  publish(id: string): Promise<Document | null>;
  unpublish(id: string): Promise<Document | null>;

  // Analytics/counts
  countByType(type: string): Promise<number>;
  getCountsByType(): Promise<Record<string, number>>;

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