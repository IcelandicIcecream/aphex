// CMS Documents repository using DatabaseAdapter interface
import { createPostgreSQLAdapter } from '../providers/database.js';
import { DATABASE_URL } from '$env/static/private';
/**
 * CMS Documents repository - database agnostic document data access
 */
class DocumentRepository {
    adapter;
    constructor(adapter) {
        this.adapter = adapter;
    }
    /**
     * Get all documents with optional filtering
     */
    async findMany(filters) {
        return this.adapter.findMany(filters);
    }
    /**
     * Get document by ID
     */
    async findById(id) {
        return this.adapter.findById(id);
    }
    /**
     * Create new document (always starts as draft)
     */
    async create(data) {
        return this.adapter.create(data);
    }
    /**
     * Update draft data (auto-save)
     */
    async updateDraft(id, data) {
        return this.adapter.updateDraft(id, data);
    }
    /**
     * Publish document (copy draft -> published)
     */
    async publish(id) {
        return this.adapter.publish(id);
    }
    /**
     * Unpublish document (revert to draft only)
     */
    async unpublish(id) {
        return this.adapter.unpublish(id);
    }
    /**
     * Delete document permanently
     */
    async deleteById(id) {
        return this.adapter.deleteById(id);
    }
    /**
     * Count documents by type
     */
    async countByType(type) {
        return this.adapter.countByType(type);
    }
    /**
     * Get counts for all document types
     */
    async getCountsByType() {
        return this.adapter.getCountsByType();
    }
    /**
     * Check if database connection is healthy
     */
    async isHealthy() {
        return this.adapter.isHealthy();
    }
    /**
     * Close database connection
     */
    async disconnect() {
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
