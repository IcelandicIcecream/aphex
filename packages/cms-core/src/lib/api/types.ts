// API client types
import type { Document, NewDocument } from '../types/index';

// Pagination metadata
export interface PaginationMeta {
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

// API Response wrappers
export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	// Pagination for list responses
	pagination?: PaginationMeta;
	// Legacy meta for backward compatibility (deprecated)
	meta?: {
		count: number;
		limit: number;
		offset: number;
		filters: Record<string, any>;
	};
}

// Document-related types
export interface DocumentListParams {
	// Document type (use 'type' for consistency with REST API)
	type?: string;
	// Legacy: docType (deprecated, use 'type' instead)
	docType?: string;
	// Filter by status
	status?: string;
	// Pagination - page-based (recommended)
	page?: number;
	pageSize?: number;
	// Pagination - offset-based (legacy)
	limit?: number;
	offset?: number;
	// Query options
	depth?: number;
	sort?: string;
	perspective?: 'draft' | 'published';
	// Multi-tenancy options
	includeChildOrganizations?: boolean;
}

// Create document data (sent to POST /api/documents)
export interface CreateDocumentData {
	type: string;
	data: Record<string, any>;
	publish?: boolean;
}

// Update document data (sent to PUT /api/documents/[id])
export interface UpdateDocumentData {
	data: Record<string, any>;
	publish?: boolean;
}

// Re-export database types for convenience
export type { Document, NewDocument };
