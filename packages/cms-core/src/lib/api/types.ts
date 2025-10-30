// API client types
import type { Document, NewDocument } from '../types/index';

// API Response wrappers
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

// Document-related types
export interface DocumentListParams {
	docType?: string;
	status?: string;
	limit?: number;
	offset?: number;
}

// Use database types directly instead of duplicating
export type CreateDocumentData = Omit<
	NewDocument,
	'id' | 'createdAt' | 'updatedAt' | 'publishedAt'
>;
export type UpdateDocumentData = Partial<Pick<Document, 'draftData' | 'status'>>;

// Re-export database types for convenience
export type { Document, NewDocument };
