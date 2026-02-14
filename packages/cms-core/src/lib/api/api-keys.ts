// API Keys client - composable API key operations
import { apiClient } from './client';
import type { ApiResponse } from './types';

export interface ApiKey {
	id: string;
	name: string | null;
	key?: string;
	permissions: ('read' | 'write')[];
	createdAt: Date | null;
	lastRequest: Date | null;
	expiresAt: Date | null;
}

export interface CreateApiKeyData {
	name: string;
	permissions: ('read' | 'write')[];
	expiresInDays?: number;
}

export interface CreateApiKeyResponse {
	apiKey: ApiKey & { key: string };
}

export class ApiKeysApi {
	/**
	 * Create a new API key
	 */
	static async create(data: CreateApiKeyData): Promise<ApiResponse<CreateApiKeyResponse>> {
		return apiClient.post<CreateApiKeyResponse>('/settings/api-keys', data);
	}

	/**
	 * Delete an API key
	 */
	static async remove(id: string): Promise<ApiResponse<{ success: boolean }>> {
		return apiClient.delete<{ success: boolean }>(`/settings/api-keys/${id}`);
	}
}

export const apiKeys = {
	create: ApiKeysApi.create.bind(ApiKeysApi),
	remove: ApiKeysApi.remove.bind(ApiKeysApi)
};
