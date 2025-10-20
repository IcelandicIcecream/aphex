// Assets API client - manage uploaded files and images
import { apiClient } from './client.js';
import type { Asset } from '../types/asset.js';
import type { ApiResponse } from './types.js'

export interface AssetFilters {
	assetType?: 'image' | 'file';
	mimeType?: string;
	search?: string;
	limit?: number;
	offset?: number;
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
}

// Export convenience functions for direct use
export const assets = {
	list: AssetsApi.list.bind(AssetsApi),
	getById: AssetsApi.getById.bind(AssetsApi),
	upload: AssetsApi.upload.bind(AssetsApi),
	update: AssetsApi.update.bind(AssetsApi),
	delete: AssetsApi.delete.bind(AssetsApi)
};
