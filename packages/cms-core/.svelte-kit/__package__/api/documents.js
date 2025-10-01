// Documents API client - composable document operations
import { apiClient } from './client.js';
export class DocumentsApi {
    /**
     * List documents with optional filtering
     */
    static async list(params = {}) {
        return apiClient.get('/documents', params);
    }
    /**
     * Get document by ID
     */
    static async getById(id) {
        return apiClient.get(`/documents/${id}`);
    }
    /**
     * Create new document
     */
    static async create(data) {
        return apiClient.post('/documents', data);
    }
    /**
     * Update document draft by ID (auto-save)
     */
    static async updateById(id, data) {
        return apiClient.put(`/documents/${id}`, data);
    }
    /**
     * Publish document (copy draft -> published)
     */
    static async publish(id) {
        return apiClient.post(`/documents/${id}/publish`);
    }
    /**
     * Unpublish document (revert to draft only)
     */
    static async unpublish(id) {
        return apiClient.delete(`/documents/${id}/publish`);
    }
    /**
     * Delete document by ID
     */
    static async deleteById(id) {
        return apiClient.delete(`/documents/${id}`);
    }
    /**
     * Get documents by type (convenience method)
     */
    static async getByType(docType, params = {}) {
        return this.list({ ...params, docType });
    }
    /**
     * Get published documents only (convenience method)
     */
    static async getPublished(params = {}) {
        return this.list({ ...params, status: 'published' });
    }
    /**
     * Get draft documents only (convenience method)
     */
    static async getDrafts(params = {}) {
        return this.list({ ...params, status: 'draft' });
    }
}
// Export convenience functions for direct use
export const documents = {
    list: DocumentsApi.list.bind(DocumentsApi),
    getById: DocumentsApi.getById.bind(DocumentsApi),
    create: DocumentsApi.create.bind(DocumentsApi),
    updateById: DocumentsApi.updateById.bind(DocumentsApi),
    publish: DocumentsApi.publish.bind(DocumentsApi),
    unpublish: DocumentsApi.unpublish.bind(DocumentsApi),
    deleteById: DocumentsApi.deleteById.bind(DocumentsApi),
    getByType: DocumentsApi.getByType.bind(DocumentsApi),
    getPublished: DocumentsApi.getPublished.bind(DocumentsApi),
    getDrafts: DocumentsApi.getDrafts.bind(DocumentsApi)
};
