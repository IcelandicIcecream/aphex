// CMS Documents repository using DatabaseAdapter interface
import { createPostgreSQLAdapter } from '../providers/database.js';
import type { DatabaseAdapter, DocumentFilters, CreateDocumentData } from '../interfaces/database.js';
import type { Document } from '../schema.js';
import { DATABASE_URL } from '$env/static/private';

/**
 * CMS Documents repository - database agnostic document data access
 */
class DocumentRepository {
  private adapter: DatabaseAdapter;

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  /**
   * Get all documents with optional filtering
   */
  async findMany(filters?: DocumentFilters): Promise<Document[]> {
    return this.adapter.findMany(filters);
  }

  /**
   * Get document by ID
   */
  async findById(id: string): Promise<Document | null> {
    return this.adapter.findById(id);
  }

  /**
   * Create new document (always starts as draft)
   */
  async create(data: CreateDocumentData): Promise<Document> {
    return this.adapter.create(data);
  }

  /**
   * Update draft data (auto-save)
   */
  async updateDraft(id: string, data: any): Promise<Document | null> {
    return this.adapter.updateDraft(id, data);
  }

  /**
   * Publish document (copy draft -> published)
   */
  async publish(id: string): Promise<Document | null> {
    return this.adapter.publish(id);
  }

  /**
   * Unpublish document (revert to draft only)
   */
  async unpublish(id: string): Promise<Document | null> {
    return this.adapter.unpublish(id);
  }

  /**
   * Delete document permanently
   */
  async deleteById(id: string): Promise<boolean> {
    return this.adapter.deleteById(id);
  }

  /**
   * Count documents by type
   */
  async countByType(type: string): Promise<number> {
    return this.adapter.countByType(type);
  }

  /**
   * Get counts for all document types
   */
  async getCountsByType(): Promise<Record<string, number>> {
    return this.adapter.getCountsByType();
  }

  /**
   * Check if database connection is healthy
   */
  async isHealthy(): Promise<boolean> {
    return this.adapter.isHealthy();
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (this.adapter.disconnect) {
      return this.adapter.disconnect();
    }
  }
}

// Create default PostgreSQL adapter instance
const defaultAdapter = createPostgreSQLAdapter(DATABASE_URL);

// Export singleton instance using PostgreSQL adapter
export const documentRepository = new DocumentRepository(defaultAdapter);

// Export class for custom adapter usage
export { DocumentRepository };