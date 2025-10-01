import type { DatabaseAdapter, DocumentFilters, CreateDocumentData } from '../interfaces/database.js';
import type { Document } from '../schema.js';
/**
 * CMS Documents repository - database agnostic document data access
 */
declare class DocumentRepository {
    private adapter;
    constructor(adapter: DatabaseAdapter);
    /**
     * Get all documents with optional filtering
     */
    findMany(filters?: DocumentFilters): Promise<Document[]>;
    /**
     * Get document by ID
     */
    findById(id: string): Promise<Document | null>;
    /**
     * Create new document (always starts as draft)
     */
    create(data: CreateDocumentData): Promise<Document>;
    /**
     * Update draft data (auto-save)
     */
    updateDraft(id: string, data: any): Promise<Document | null>;
    /**
     * Publish document (copy draft -> published)
     */
    publish(id: string): Promise<Document | null>;
    /**
     * Unpublish document (revert to draft only)
     */
    unpublish(id: string): Promise<Document | null>;
    /**
     * Delete document permanently
     */
    deleteById(id: string): Promise<boolean>;
    /**
     * Count documents by type
     */
    countByType(type: string): Promise<number>;
    /**
     * Get counts for all document types
     */
    getCountsByType(): Promise<Record<string, number>>;
    /**
     * Check if database connection is healthy
     */
    isHealthy(): Promise<boolean>;
    /**
     * Close database connection
     */
    disconnect(): Promise<void>;
}
export declare const documentRepository: DocumentRepository;
export { DocumentRepository };
//# sourceMappingURL=documents.d.ts.map