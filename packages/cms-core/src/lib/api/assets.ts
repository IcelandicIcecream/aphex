// Assets API client - manage uploaded files and images
import { apiClient } from './client';
import type { Asset } from '../types/asset';
import type { ApiResponse } from './types';

export interface AssetFilters {
	assetType?: 'image' | 'file';
	mimeType?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

export interface AssetReference {
	documentId: string;
	type: string;
	title: string;
	status: string | null;
}

export interface UpdateAssetData {
	title?: string;
	description?: string;
	alt?: string;
	creditLine?: string;
}

export class AssetsApi {
	/**
	 * List assets with optional filters
	 */
	static async list(filters?: AssetFilters): Promise<ApiResponse<Asset[]>> {
		const params = new URLSearchParams();
		if (filters) {
			Object.entries(filters).forEach(([key, value]) => {
				if (value !== undefined) {
					params.append(key, String(value));
				}
			});
		}
		const query = params.toString();
		return apiClient.get<Asset[]>(`/assets${query ? `?${query}` : ''}`);
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
	static async update(id: string, data: UpdateAssetData): Promise<ApiResponse<Asset>> {
		return apiClient.patch<Asset>(`/assets/${id}`, data);
	}

	/**
	 * Delete an asset
	 */
	static async delete(id: string): Promise<ApiResponse<{ success: boolean }>> {
		return apiClient.delete<{ success: boolean }>(`/assets/${id}`);
	}

	/**
	 * Bulk delete assets
	 */
	static async deleteBulk(ids: string[]): Promise<ApiResponse<{ deleted: number; failed: number }>> {
		return apiClient.delete<{ deleted: number; failed: number }>('/assets/bulk', { ids });
	}

	/**
	 * Get documents that reference a specific asset
	 */
	static async getReferences(id: string): Promise<ApiResponse<{ references: AssetReference[]; total: number }>> {
		return apiClient.get<{ references: AssetReference[]; total: number }>(`/assets/${id}/references`);
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
