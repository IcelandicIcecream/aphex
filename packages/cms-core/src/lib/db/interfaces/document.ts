// Document interface for document operations
import type { Document } from '../../types/index';
import type { DocumentVersion, DocumentVersionList } from '../../types/version';
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
	/** Optional explicit primary key — used by singleton documents. */
	id?: string;
}

export interface UpdateDocumentData {
	draftData?: any;
	status?: string;
	updatedBy?: string; // User ID (optional for backward compatibility)
	/** Compare-and-swap guard: the revision the caller last read. Omit to skip
	 *  the check (existing unconditional-write behavior). */
	expectedRevision?: number;
}

/**
 * Thrown when a write's `expectedRevision` no longer matches the document's
 * current revision — another writer (a second tab, an AI agent, a concurrent
 * request) saved in between the caller's read and this write. Callers should
 * surface this distinctly from a validation error: re-fetch and let the user
 * decide, never silently retry with an overwrite.
 */
export class RevisionConflictError extends Error {
	constructor(
		message: string,
		public readonly documentId: string,
		public readonly expectedRevision: number,
		public readonly currentRevision: number
	) {
		super(message);
		this.name = 'RevisionConflictError';
	}
}

/**
 * Document adapter interface for document-specific operations
 */
export interface DocumentAdapter {
	// Document CRUD operations
	createDocument(data: CreateDocumentData): Promise<Document>;
	/**
	 * @param expectedRevision - Compare-and-swap guard. When provided, the
	 *   update only applies if the document's current revision matches;
	 *   otherwise implementations throw {@link RevisionConflictError}. Omit to
	 *   write unconditionally (last-write-wins, the pre-CAS behavior).
	 */
	updateDocDraft(
		organizationId: string,
		id: string,
		data: any,
		updatedBy?: string,
		expectedRevision?: number
	): Promise<Document | null>;
	deleteDocById(organizationId: string, id: string): Promise<boolean>;

	// Publishing operations
	publishDoc(
		organizationId: string,
		id: string,
		expectedRevision?: number
	): Promise<Document | null>;
	unpublishDoc(
		organizationId: string,
		id: string,
		expectedRevision?: number
	): Promise<Document | null>;

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

	/**
	 * Find documents that reference a specific asset ID in their data
	 * Searches both draftData and publishedData JSONB columns
	 * @param organizationId - Organization ID for multi-tenancy
	 * @param assetId - The asset ID to search for
	 * @returns Array of referencing documents (id, type, status, title)
	 */
	findDocumentsReferencingAsset?(
		organizationId: string,
		assetId: string,
		knownTypes?: string[]
	): Promise<Array<{ documentId: string; type: string; title: string; status: string | null }>>;

	/**
	 * Count document references for multiple asset IDs in batch
	 * @param organizationId - Organization ID for multi-tenancy
	 * @param assetIds - Array of asset IDs to count references for
	 * @param knownTypes - Only count references from these document types (excludes orphaned types)
	 * @returns Map of asset ID to reference count
	 */
	countDocumentReferencesForAssets?(
		organizationId: string,
		assetIds: string[],
		knownTypes?: string[]
	): Promise<Record<string, number>>;

	/**
	 * Clear references to a deleted asset from publishedData of non-published
	 * documents. Returns the number of documents cleaned.
	 */
	clearAssetFromPublishedData?(organizationId: string, assetId: string): Promise<number>;

	// Version history — raw CRUD (business logic in VersionService)
	createDocumentVersion?(data: {
		documentId: string;
		organizationId: string;
		eventType: 'draft' | 'publish';
		data: any;
		createdBy?: string | null;
	}): Promise<DocumentVersion | null>;

	listDocumentVersions?(
		organizationId: string,
		documentId: string,
		options?: { limit?: number; offset?: number }
	): Promise<DocumentVersionList>;

	getDocumentVersion?(
		organizationId: string,
		documentId: string,
		versionNumber: number
	): Promise<DocumentVersion | null>;

	deleteDocumentVersions?(documentId: string, versionIds: string[]): Promise<void>;
}
