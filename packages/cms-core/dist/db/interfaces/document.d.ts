import type { Document } from '../schema.js';
export interface DocumentFilters {
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
}
export interface CreateDocumentData {
    type: string;
    draftData: any;
    createdBy?: string;
}
export interface UpdateDocumentData {
    draftData?: any;
    status?: string;
    updatedBy?: string;
}
/**
 * Document adapter interface for document-specific operations
 */
export interface DocumentAdapter {
    findMany(filters?: DocumentFilters): Promise<Document[]>;
    findById(id: string): Promise<Document | null>;
    create(data: CreateDocumentData): Promise<Document>;
    updateDraft(id: string, data: any, updatedBy?: string): Promise<Document | null>;
    deleteById(id: string): Promise<boolean>;
    publish(id: string): Promise<Document | null>;
    unpublish(id: string): Promise<Document | null>;
    countByType(type: string): Promise<number>;
    getCountsByType(): Promise<Record<string, number>>;
}
//# sourceMappingURL=document.d.ts.map