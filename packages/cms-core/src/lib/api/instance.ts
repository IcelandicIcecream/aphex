// Instance Settings API client - composable instance operations
import { apiClient } from './client';
import type { InstanceSettings } from '../types/instance';
import type { DeleteInstanceUserRequest } from './schemas/instance';
import type { ApiResponse } from './types';

export class InstanceApi {
	/**
	 * Get instance settings
	 */
	static async getSettings(): Promise<ApiResponse<InstanceSettings>> {
		return apiClient.get<InstanceSettings>('/instance-settings');
	}

	/**
	 * Delete someone's account and the workspaces only they belong to (super_admin only).
	 * `email` must be the account's, as typed to confirm.
	 */
	static async deleteUser(
		id: string,
		data: DeleteInstanceUserRequest
	): Promise<ApiResponse<{ success: boolean }>> {
		return apiClient.delete<{ success: boolean }>(`/instance-users/${id}`, data);
	}

	/**
	 * Update instance settings (super_admin only)
	 */
	static async updateSettings(
		data: Partial<InstanceSettings>
	): Promise<ApiResponse<InstanceSettings>> {
		return apiClient.patch<InstanceSettings>('/instance-settings', data);
	}
}

// Export convenience functions for direct use
export const instance = {
	getSettings: InstanceApi.getSettings.bind(InstanceApi),
	deleteUser: InstanceApi.deleteUser.bind(InstanceApi),
	updateSettings: InstanceApi.updateSettings.bind(InstanceApi)
};
