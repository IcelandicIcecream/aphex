// User API client - composable user operations
import { apiClient } from './client';
import type { CMSUser } from '../types/user';
import type { UserSessionPreferences } from '../types/organization';
import type { ApiResponse } from './types';

export interface UpdateProfileData {
	name?: string;
}

export class UserApi {
	/**
	 * Update user profile
	 */
	static async updateProfile(data: UpdateProfileData): Promise<ApiResponse<CMSUser>> {
		return apiClient.patch<CMSUser>('/user', data);
	}

	/**
	 * Update CMS preferences (e.g. includeChildOrganizations)
	 */
	static async updatePreferences(
		prefs: Partial<UserSessionPreferences>
	): Promise<ApiResponse<{ success: boolean }>> {
		return apiClient.patch<{ success: boolean }>('/user/cms-preference', prefs);
	}
}

export const user = {
	updateProfile: UserApi.updateProfile.bind(UserApi),
	updatePreferences: UserApi.updatePreferences.bind(UserApi)
};
