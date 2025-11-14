// Document interface for document operations
import type { Document } from '../../types/index';
import type { Where, FindOptions, FindResult } from '../../types/filters';

export interface DocumentFilters {
	organizationId: string; // Required for multi-tenancy (user's current org for RLS context)
	type?: string;
	status?: string;
	limit?: number;
	offset?: number;
	depth?: number; // How deep to resolve nested references (0 = no resolution, default = 0)
	filterOrganizationIds?: string[]; // Optional: Filter to specific org(s). RLS still enforces access.
}

export interface CreateDocumentData {
	organizationId: string; // Required for multi-tenancy
	type: string;
	draftData: any;
	createdBy?: string; // User ID (optional for backward compatibility)
}

export interface UpdateDocumentData {
	draftData?: any;
	status?: string;
	updatedBy?: string; // User ID (optional for backward compatibility)
}

/**
 * Document adapter interface for document-specific operations
 */
export interface DocumentAdapter {
	// Document CRUD operations
	findManyDoc(
		organizationId: string,
		filters?: Omit<DocumentFilters, 'organizationId'>
	): Promise<Document[]>;
	findByDocId(organizationId: string, id: string, depth?: number): Promise<Document | null>;
	createDocument(data: CreateDocumentData): Promise<Document>;
	updateDocDraft(
		organizationId: string,
		id: string,
		data: any,
		updatedBy?: string
	): Promise<Document | null>;
	deleteDocById(organizationId: string, id: string): Promise<boolean>;

	// Publishing operations
	publishDoc(organizationId: string, id: string): Promise<Document | null>;
	unpublishDoc(organizationId: string, id: string): Promise<Document | null>;

	// Analytics/counts
	countDocsByType(organizationId: string, type: string): Promise<number>;
	getDocCountsByType(organizationId: string): Promise<Record<string, number>>;

	// Advanced filtering methods (for unified Local API)
	/**
	 * Find multiple documents with advanced filtering and pagination
	 * @param organizationId - Organization ID for multi-tenancy
	 * @param collectionName - Collection/document type to query
	 * @param options - Advanced filter options (where, limit, offset, sort, etc.)
	 * @returns Paginated result with documents and metadata
	 */
	findManyDocAdvanced(
		organizationId: string,
		collectionName: string,
		options?: FindOptions
	): Promise<FindResult<Document>>;

	/**
	 * Find a single document by ID with advanced options
	 * @param organizationId - Organization ID for multi-tenancy
	 * @param id - Document ID
	 * @param options - Options for depth, select, perspective
	 * @returns Document or null if not found
	 */
	findByDocIdAdvanced(
		organizationId: string,
		id: string,
		options?: Partial<FindOptions>
	): Promise<Document | null>;

	/**
	 * Count documents matching a where clause
	 * @param organizationId - Organization ID for multi-tenancy
	 * @param collectionName - Collection/document type to query
	 * @param where - Filter conditions
	 * @returns Count of matching documents
	 */
	countDocuments(organizationId: string, collectionName: string, where?: Where): Promise<number>;
}
