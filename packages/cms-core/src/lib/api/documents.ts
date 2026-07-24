// Documents API client - composable document operations
import { apiClient } from './client';
import type { ApiResponse } from './types';
import type {
	DocumentDTO,
	ListDocumentsQuery,
	CreateDocumentRequest,
	UpdateDocumentRequest,
	DocumentVersion,
	ListVersionsQuery
} from './schemas/documents';

/** Shared CAS-guard option accepted by publish/unpublish/restore. */
export interface RevisionGuardOptions {
	/** The revision last read from `_meta.revision`. Omit to skip the check. */
	expectedRevision?: number;
}

// Legacy shim — kept so existing call sites don't break while we migrate.
// Prefer `ListDocumentsQuery` from ./schemas/documents going forward.
export type DocumentListParams = ListDocumentsQuery;

export class DocumentsApi {
	/**
	 * List documents with optional filtering
	 * NOTE: Requires 'type' parameter - use getByType() for convenience
	 */
	static async list(params: ListDocumentsQuery = {}): Promise<ApiResponse<DocumentDTO[]>> {
		const queryParams: Record<string, unknown> = {
			...params,
			type: params.type || params.docType
		};
		delete queryParams.docType;

		return apiClient.get<DocumentDTO[]>('/documents', queryParams);
	}

	/**
	 * Get document by ID
	 */
	static async getById(id: string): Promise<ApiResponse<DocumentDTO>> {
		return apiClient.get<DocumentDTO>(`/documents/${id}`);
	}

	/**
	 * Find all documents that reference the given document. Used by the
	 * unpublish flow to warn the user that taking this doc down will leave
	 * dangling references in the published perspective of any back-referrers.
	 */
	static async getBackReferences(
		id: string
	): Promise<ApiResponse<Array<{ id: string; type: string; status: string | null }>>> {
		return apiClient.get<Array<{ id: string; type: string; status: string | null }>>(
			`/documents/${id}/back-references`
		);
	}

	/**
	 * Batch fetch — one HTTP call per N IDs. Server fans out and returns the
	 * docs that exist (missing/forbidden IDs are silently dropped). Use this
	 * when you have a known set of references to hydrate; for filtered or
	 * paginated lists use `list()`.
	 */
	static async getMany(ids: string[]): Promise<ApiResponse<DocumentDTO[]>> {
		if (ids.length === 0) return { success: true, data: [] } as ApiResponse<DocumentDTO[]>;
		return apiClient.get<DocumentDTO[]>('/documents/by-ids', { ids: ids.join(',') });
	}

	/**
	 * Create new document
	 */
	static async create(data: CreateDocumentRequest): Promise<ApiResponse<DocumentDTO>> {
		return apiClient.post<DocumentDTO>('/documents', data);
	}

	/**
	 * Update document draft by ID (auto-save)
	 * Request/response shapes come from the zod schema in ./schemas/documents.ts —
	 * single source of truth shared with the server handler.
	 */
	static async updateById(
		id: string,
		data: UpdateDocumentRequest
	): Promise<ApiResponse<DocumentDTO>> {
		return apiClient.put<DocumentDTO>(`/documents/${id}`, data);
	}

	/**
	 * Publish document (copy draft -> published)
	 */
	static async publish(
		id: string,
		options?: RevisionGuardOptions
	): Promise<ApiResponse<DocumentDTO>> {
		return apiClient.post<DocumentDTO>(`/documents/${id}/publish`, options);
	}

	/**
	 * Unpublish document (revert to draft only)
	 */
	static async unpublish(
		id: string,
		options?: RevisionGuardOptions
	): Promise<ApiResponse<DocumentDTO>> {
		return apiClient.delete<DocumentDTO>(`/documents/${id}/publish`, options);
	}

	/**
	 * Schedule a publish/unpublish for a future time (ISO-8601 `runAt`).
	 * Enqueues a job the worker runs at that time — the permission check happens now.
	 */
	static async schedule(
		id: string,
		body: { action: 'publish' | 'unpublish'; runAt: string }
	): Promise<ApiResponse<{ jobId: string; type: string; runAt: string; status: string }>> {
		return apiClient.post<{ jobId: string; type: string; runAt: string; status: string }>(
			`/documents/${id}/schedule`,
			body
		);
	}

	/** Pending scheduled publish/unpublish for a document (for the editor's schedule indicator). */
	static async getSchedule(
		id: string
	): Promise<
		ApiResponse<
			Array<{ jobId: string; type: string; runAt: string; status: string; createdAt: string }>
		>
	> {
		return apiClient.get<
			Array<{ jobId: string; type: string; runAt: string; status: string; createdAt: string }>
		>(`/documents/${id}/schedule`);
	}

	/** Cancel the pending schedule for a document. */
	static async cancelSchedule(id: string): Promise<ApiResponse<{ cancelled: number }>> {
		return apiClient.delete<{ cancelled: number }>(`/documents/${id}/schedule`);
	}

	/**
	 * Delete document by ID
	 */
	static async deleteById(id: string): Promise<ApiResponse<void>> {
		return apiClient.delete<void>(`/documents/${id}`);
	}

	/**
	 * Get documents by type (convenience method)
	 */
	static async getByType(
		docType: string,
		params: Omit<ListDocumentsQuery, 'docType'> = {}
	): Promise<ApiResponse<DocumentDTO[]>> {
		return this.list({ ...params, docType });
	}

	/**
	 * Get published documents only (convenience method)
	 */
	static async getPublished(
		params: Omit<ListDocumentsQuery, 'status'> = {}
	): Promise<ApiResponse<DocumentDTO[]>> {
		return this.list({ ...params, status: 'published' });
	}

	/**
	 * Get draft documents only (convenience method)
	 */
	static async getDrafts(
		params: Omit<ListDocumentsQuery, 'status'> = {}
	): Promise<ApiResponse<DocumentDTO[]>> {
		return this.list({ ...params, status: 'draft' });
	}

	/**
	 * List document version history
	 */
	static async listVersions(
		id: string,
		params?: ListVersionsQuery
	): Promise<ApiResponse<DocumentVersion[]>> {
		return apiClient.get<DocumentVersion[]>(`/documents/${id}/versions`, params);
	}

	/**
	 * Get a specific version
	 */
	static async getVersion(
		id: string,
		versionNumber: number
	): Promise<ApiResponse<DocumentVersion>> {
		return apiClient.get<DocumentVersion>(`/documents/${id}/versions/${versionNumber}`);
	}

	/**
	 * Restore a version to draft
	 */
	static async restoreVersion(
		id: string,
		versionNumber: number,
		options?: RevisionGuardOptions
	): Promise<ApiResponse<DocumentDTO>> {
		return apiClient.post<DocumentDTO>(
			`/documents/${id}/versions/${versionNumber}/restore`,
			options
		);
	}
}

// Export convenience functions for direct use
export const documents = {
	list: DocumentsApi.list.bind(DocumentsApi),
	getById: DocumentsApi.getById.bind(DocumentsApi),
	getMany: DocumentsApi.getMany.bind(DocumentsApi),
	getBackReferences: DocumentsApi.getBackReferences.bind(DocumentsApi),
	create: DocumentsApi.create.bind(DocumentsApi),
	updateById: DocumentsApi.updateById.bind(DocumentsApi),
	publish: DocumentsApi.publish.bind(DocumentsApi),
	unpublish: DocumentsApi.unpublish.bind(DocumentsApi),
	schedule: DocumentsApi.schedule.bind(DocumentsApi),
	getSchedule: DocumentsApi.getSchedule.bind(DocumentsApi),
	cancelSchedule: DocumentsApi.cancelSchedule.bind(DocumentsApi),
	deleteById: DocumentsApi.deleteById.bind(DocumentsApi),
	getByType: DocumentsApi.getByType.bind(DocumentsApi),
	getPublished: DocumentsApi.getPublished.bind(DocumentsApi),
	getDrafts: DocumentsApi.getDrafts.bind(DocumentsApi),
	listVersions: DocumentsApi.listVersions.bind(DocumentsApi),
	getVersion: DocumentsApi.getVersion.bind(DocumentsApi),
	restoreVersion: DocumentsApi.restoreVersion.bind(DocumentsApi)
};
