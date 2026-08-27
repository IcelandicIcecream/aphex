// Assets API client - manage uploaded files and images
import { apiClient } from './client';
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
	 * Upload a new asset (multipart/form-data)
	 * Note: Use FormData for file uploads
	 */
	static async upload(formData: FormData): Promise<ApiResponse<Asset>> {
		return apiClient.post<Asset>('/assets', formData);
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
	update: AssetsApi.update.bind(AssetsApi),
	delete: AssetsApi.delete.bind(AssetsApi),
	deleteBulk: AssetsApi.deleteBulk.bind(AssetsApi),
	getReferences: AssetsApi.getReferences.bind(AssetsApi),
	getReferenceCounts: AssetsApi.getReferenceCounts.bind(AssetsApi)
};
