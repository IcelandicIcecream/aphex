import type { Document, NewDocument } from '$lib/server/db/schema.js';
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    meta?: {
        count: number;
        limit: number;
        offset: number;
        filters: Record<string, any>;
    };
}
export interface DocumentListParams {
    docType?: string;
    status?: string;
    limit?: number;
    offset?: number;
}
export type CreateDocumentData = Omit<NewDocument, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'>;
export type UpdateDocumentData = Partial<Pick<Document, 'draftData' | 'status'>>;
export type { Document, NewDocument };
//# sourceMappingURL=types.d.ts.map