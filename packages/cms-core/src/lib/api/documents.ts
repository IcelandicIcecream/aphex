// Documents API client - composable document operations
import { apiClient } from './client';
import type {
	Document,
	DocumentListParams,
	CreateDocumentData,
	UpdateDocumentData,
	ApiResponse
} from './types';

export class DocumentsApi {
	/**
	 * List documents with optional filtering
	 */
	static async list(params: DocumentListParams = {}): Promise<ApiResponse<Document[]>> {
		return apiClient.get<Document[]>('/documents', params);
	}

	/**
	 * Get document by ID
	 */
	static async getById(id: string): Promise<ApiResponse<Document>> {
		return apiClient.get<Document>(`/documents/${id}`);
	}

	/**
	 * Create new document
	 */
	static async create(data: CreateDocumentData): Promise<ApiResponse<Document>> {
		return apiClient.post<Document>('/documents', data);
	}

	/**
	 * Update document draft by ID (auto-save)
	 */
	static async updateById(id: string, data: UpdateDocumentData): Promise<ApiResponse<Document>> {
		return apiClient.put<Document>(`/documents/${id}`, data);
	}

	/**
	 * Publish document (copy draft -> published)
	 */
	static async publish(id: string): Promise<ApiResponse<Document>> {
		return apiClient.post<Document>(`/documents/${id}/publish`);
	}

	/**
	 * Unpublish document (revert to draft only)
	 */
	static async unpublish(id: string): Promise<ApiResponse<Document>> {
		return apiClient.delete<Document>(`/documents/${id}/publish`);
	}

	/**
	 * Delete document by ID
	 */
	static async deleteById(id: string): Promise<ApiResponse<void>> {
		return apiClient.delete<void>(`/documents/${id}`);
	}

	/**
	 * Get documents by type (convenience method)
	 */
	static async getByType(
		docType: string,
		params: Omit<DocumentListParams, 'docType'> = {}
	): Promise<ApiResponse<Document[]>> {
		return this.list({ ...params, docType });
	}

	/**
	 * Get published documents only (convenience method)
	 */
	static async getPublished(
		params: Omit<DocumentListParams, 'status'> = {}
	): Promise<ApiResponse<Document[]>> {
		return this.list({ ...params, status: 'published' });
	}

	/**
	 * Get draft documents only (convenience method)
	 */
	static async getDrafts(
		params: Omit<DocumentListParams, 'status'> = {}
	): Promise<ApiResponse<Document[]>> {
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
