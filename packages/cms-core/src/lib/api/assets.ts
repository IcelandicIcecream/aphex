// Assets API client - manage uploaded files and images
import { apiClient, ApiError } from './client';
import { putToStorage, uploadFormData, type UploadOptions } from './upload';
import { uploadTimeoutFor, uploadTimeoutForBytes } from './upload-timeout';
import type { ApiResponse } from './types';
import type { Asset } from '../types/asset';
import type {
	AssetDeleteConflict,
	AssetReference,
	ListAssetsQuery,
	UpdateAssetRequest
} from './schemas/assets';

// Legacy shims — kept so existing call sites don't break while we migrate.
// Prefer schema-inferred types from ./schemas/assets going forward.
export type AssetFilters = ListAssetsQuery;
export type UpdateAssetData = UpdateAssetRequest;
export type { AssetReference, AssetDeleteConflict };

export class AssetsApi {
	/**
	 * List assets with optional filters
	 */
	static async list(filters?: ListAssetsQuery): Promise<ApiResponse<Asset[]>> {
		return apiClient.get<Asset[]>('/assets', filters as Record<string, unknown> | undefined);
	}

	/**
	 * Get asset by ID
	 */
	static async getById(id: string): Promise<ApiResponse<Asset>> {
		return apiClient.get<Asset>(`/assets/${id}`);
	}

	/**
	 * Upload a file, choosing the transport.
	 *
	 * Direct-to-storage when the server reports it available, otherwise through
	 * the app. The choice is the server's to report, not the client's to guess:
	 * it depends on whether the adapter can sign, whether an encryption key is
	 * configured, and whether the operator opted in — the last of which implies
	 * bucket CORS that nothing here can detect.
	 */
	static async uploadFile(
		file: File,
		opts: { direct?: boolean; schemaType?: string; fieldPath?: string } & UploadOptions = {}
	): Promise<ApiResponse<Asset>> {
		const { direct, schemaType, fieldPath, ...uploadOptions } = opts;

		if (direct) {
			try {
				return await AssetsApi.uploadDirect(file, { schemaType, fieldPath }, uploadOptions);
			} catch (err) {
				// Only a missing endpoint justifies retrying the other way. A CORS
				// failure or a rejected signature must surface: silently proxying a
				// file the platform will refuse turns a fixable misconfiguration
				// into a confusing size error.
				if (!(err instanceof ApiError) || err.status !== 404) throw err;
			}
		}

		const formData = new FormData();
		formData.append('file', file);
		if (schemaType) formData.append('schemaType', schemaType);
		if (fieldPath) formData.append('fieldPath', fieldPath);
		return AssetsApi.upload(formData, uploadOptions);
	}

	/**
	 * Three-step direct upload: get a signed URL, PUT to storage, confirm.
	 *
	 * Progress covers only the PUT — it is the whole transfer, and reporting the
	 * two bookkeeping calls would just make the bar jump.
	 */
	private static async uploadDirect(
		file: File,
		meta: { schemaType?: string; fieldPath?: string },
		options: UploadOptions
	): Promise<ApiResponse<Asset>> {
		const grant = (
			await apiClient.post<{
				assetId: string;
				uploadUrl: string;
				headers: Record<string, string>;
				ticket: string;
			}>('/assets/upload-url', {
				filename: file.name,
				mimeType: file.type || 'application/octet-stream',
				size: file.size,
				...meta
			})
		).data;

		if (!grant) throw new ApiError(500, null, 'Malformed upload grant');

		await putToStorage(grant.uploadUrl, file, grant.headers, {
			...options,
			timeoutMs: options.timeoutMs ?? uploadTimeoutForBytes(file.size)
		});

		return apiClient.post<Asset>(
			'/assets/confirm',
			{ assetId: grant.assetId },
			{ 'x-upload-ticket': grant.ticket }
		);
	}

	/**
	 * Upload a new asset (multipart/form-data)
	 * Note: Use FormData for file uploads
	 */
	static async upload(formData: FormData, options?: UploadOptions): Promise<ApiResponse<Asset>> {
		return uploadFormData<Asset>('/api/assets', formData, {
			...options,
			// Derived from the payload rather than configured: a fixed deadline
			// either aborts large uploads that were succeeding or waits far too
			// long on small ones that have genuinely died.
			timeoutMs: options?.timeoutMs ?? uploadTimeoutFor(formData)
		});
	}

	/**
	 * Update asset metadata
	 */
	static async update(id: string, data: UpdateAssetRequest): Promise<ApiResponse<Asset>> {
		return apiClient.patch<Asset>(`/assets/${id}`, data);
	}

	/**
	 * Delete an asset.
	 *
	 * Throws `ApiError` with status 409 and an {@link AssetDeleteConflict} body when
	 * the asset is still referenced. Pass `{ force: true }` to delete anyway —
	 * necessary when the reference is held by a document whose schema type is no
	 * longer registered, since that document can't be opened to remove it by hand.
	 */
	static async delete(
		id: string,
		options?: { force?: boolean }
	): Promise<ApiResponse<{ success: boolean }>> {
		const query = options?.force ? '?force=true' : '';
		return apiClient.delete<{ success: boolean }>(`/assets/${id}${query}`);
	}

	/**
	 * Bulk delete assets
	 */
	static async deleteBulk(
		ids: string[]
	): Promise<ApiResponse<{ deleted: number; failed: number }>> {
		return apiClient.delete<{ deleted: number; failed: number }>('/assets/bulk', { ids });
	}

	/**
	 * Get documents that reference a specific asset
	 */
	static async getReferences(
		id: string
	): Promise<ApiResponse<{ references: AssetReference[]; total: number }>> {
		return apiClient.get<{ references: AssetReference[]; total: number }>(
			`/assets/${id}/references`
		);
	}

	/**
	 * Get reference counts for multiple assets in batch
	 */
	static async getReferenceCounts(ids: string[]): Promise<ApiResponse<Record<string, number>>> {
		return apiClient.post<Record<string, number>>('/assets/references/counts', { ids });
	}
}

// Export convenience functions for direct use
export const assets = {
	list: AssetsApi.list.bind(AssetsApi),
	getById: AssetsApi.getById.bind(AssetsApi),
	upload: AssetsApi.upload.bind(AssetsApi),
	uploadFile: AssetsApi.uploadFile.bind(AssetsApi),
	update: AssetsApi.update.bind(AssetsApi),
	delete: AssetsApi.delete.bind(AssetsApi),
	deleteBulk: AssetsApi.deleteBulk.bind(AssetsApi),
	getReferences: AssetsApi.getReferences.bind(AssetsApi),
	getReferenceCounts: AssetsApi.getReferenceCounts.bind(AssetsApi)
};
