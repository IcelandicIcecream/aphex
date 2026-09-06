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
	/**
	 * Server-side limits the client should respect, reported by endpoints whose
	 * clients need to pre-check against them. Present on `GET /assets` so the
	 * media browser can refuse an oversized file without hardcoding a size that
	 * drifts from whatever the server actually enforces.
	 */
	limits?: {
		maxUploadBytes?: number;
		/** Installation-wide MIME types accepted for new uploads. */
		allowedMimeTypes?: string[];
		/** Whether the browser may upload straight to storage. */
		directUpload?: boolean;
	};
	/**
	 * The resolved image pipeline, or null when it's off.
	 *
	 * Reported so the media browser can address a small derivative instead of
	 * the original. `configHash` comes from the server rather than being
	 * recomputed here: it is the server that decides which files exist, and a
	 * client that derived a different hash would request URLs that quietly fall
	 * back to the original — the exact bug this exists to fix, but silent.
	 */
	images?: {
		widths: number[];
		quality: number;
		configHash: string;
	} | null;
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
	sort?: string | string[];
	perspective?: 'draft' | 'published';
	// Multi-tenancy options
	includeChildOrganizations?: boolean;
	filterOrganizationIds?: string[];
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
