// Instance Settings API client - composable instance operations
import { apiClient } from './client';
import type { InstanceSettings } from '../types/instance';
import type { ApiResponse } from './types';

export class InstanceApi {
	/**
	 * Get instance settings
	 */
	static async getSettings(): Promise<ApiResponse<InstanceSettings>> {
		return apiClient.get<InstanceSettings>('/instance-settings');
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
	updateSettings: InstanceApi.updateSettings.bind(InstanceApi)
};
