// API Keys client - composable API key operations
import { apiClient } from './client';
import type { ApiResponse } from './types';
import type { ApiKeyPermission, CreateApiKeyRequest } from './schemas/api-keys';
import type { Capability } from '../types/capabilities';

export interface ApiKey {
	id: string;
	name: string | null;
	key?: string;
	/** Legacy coarse scopes; preserved for UI compatibility. */
	permissions: ApiKeyPermission[];
	/** Fine-grained capability allowlist (if this key was issued with one). */
	capabilities?: Capability[];
	createdAt: Date | null;
	lastRequest: Date | null;
	expiresAt: Date | null;
}

// Legacy shim — kept so existing call sites don't break.
// Prefer `CreateApiKeyRequest` from ./schemas/api-keys going forward.
export type CreateApiKeyData = CreateApiKeyRequest;

export interface CreateApiKeyResponse {
	apiKey: ApiKey & { key: string };
}

export class ApiKeysApi {
	/**
	 * Create a new API key
	 */
	static async create(data: CreateApiKeyRequest): Promise<ApiResponse<CreateApiKeyResponse>> {
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
