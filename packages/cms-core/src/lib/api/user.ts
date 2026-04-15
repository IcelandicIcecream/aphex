// User API client - composable user operations
import { apiClient } from './client';
import type { CMSUser } from '../types/user';
import type { ApiResponse } from './types';
import type { UpdateUserRequest, UpdateUserPreferencesRequest } from './schemas/user';

// Legacy shim — kept so existing call sites don't break.
// Prefer `UpdateUserRequest` from ./schemas/user going forward.
export type UpdateProfileData = UpdateUserRequest;

export class UserApi {
	/**
	 * Update user profile
	 */
	static async updateProfile(data: UpdateUserRequest): Promise<ApiResponse<CMSUser>> {
		return apiClient.patch<CMSUser>('/user', data);
	}

	/**
	 * Update CMS preferences (e.g. includeChildOrganizations)
	 */
	static async updatePreferences(
		prefs: UpdateUserPreferencesRequest
	): Promise<ApiResponse<{ success: boolean }>> {
		return apiClient.patch<{ success: boolean }>('/user/cms-preference', prefs);
	}
}

export const user = {
	updateProfile: UserApi.updateProfile.bind(UserApi),
	updatePreferences: UserApi.updatePreferences.bind(UserApi)
};
