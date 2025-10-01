import type { Document, DocumentListParams, CreateDocumentData, UpdateDocumentData, ApiResponse } from './types.js';
export declare class DocumentsApi {
    /**
     * List documents with optional filtering
     */
    static list(params?: DocumentListParams): Promise<ApiResponse<Document[]>>;
    /**
     * Get document by ID
     */
    static getById(id: string): Promise<ApiResponse<Document>>;
    /**
     * Create new document
     */
    static create(data: CreateDocumentData): Promise<ApiResponse<Document>>;
    /**
     * Update document draft by ID (auto-save)
     */
    static updateById(id: string, data: UpdateDocumentData): Promise<ApiResponse<Document>>;
    /**
     * Publish document (copy draft -> published)
     */
    static publish(id: string): Promise<ApiResponse<Document>>;
    /**
     * Unpublish document (revert to draft only)
     */
    static unpublish(id: string): Promise<ApiResponse<Document>>;
    /**
     * Delete document by ID
     */
    static deleteById(id: string): Promise<ApiResponse<void>>;
    /**
     * Get documents by type (convenience method)
     */
    static getByType(docType: string, params?: Omit<DocumentListParams, 'docType'>): Promise<ApiResponse<Document[]>>;
    /**
     * Get published documents only (convenience method)
     */
    static getPublished(params?: Omit<DocumentListParams, 'status'>): Promise<ApiResponse<Document[]>>;
    /**
     * Get draft documents only (convenience method)
     */
    static getDrafts(params?: Omit<DocumentListParams, 'status'>): Promise<ApiResponse<Document[]>>;
}
export declare const documents: {
    list: typeof DocumentsApi.list;
    getById: typeof DocumentsApi.getById;
    create: typeof DocumentsApi.create;
    updateById: typeof DocumentsApi.updateById;
    publish: typeof DocumentsApi.publish;
    unpublish: typeof DocumentsApi.unpublish;
    deleteById: typeof DocumentsApi.deleteById;
    getByType: typeof DocumentsApi.getByType;
    getPublished: typeof DocumentsApi.getPublished;
    getDrafts: typeof DocumentsApi.getDrafts;
};
//# sourceMappingURL=documents.d.ts.map