import postgres from 'postgres';
import { type Document } from '../../schema.js';
import type { DocumentAdapter, DocumentFilters, CreateDocumentData } from '../../interfaces/document.js';
export declare const DOCUMENT_STATUS: {
    DRAFT: "draft";
    PUBLISHED: "published";
};
export type DocumentStatus = 'draft' | 'published';
/**
 * PostgreSQL document adapter implementation
 * Handles all document-related database operations
 */
export declare class PostgreSQLDocumentAdapter implements DocumentAdapter {
    private db;
    constructor(client: ReturnType<typeof postgres>);
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
    updateDraft(id: string, data: any, updatedBy?: string): Promise<Document | null>;
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
}
//# sourceMappingURL=document-adapter.d.ts.map