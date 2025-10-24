import type { UserProfile } from '../../types/index.js';

export interface NewUserProfileData {
	userId: string;
	role?: 'super_admin' | 'admin' | 'editor' | 'viewer';
	preferences?: Record<string, any>;
}

/**
 * Defines database operations for managing user profiles.
 */
export interface UserProfileAdapter {
	createUserProfile(data: NewUserProfileData): Promise<UserProfile>;
	findUserProfileById(userId: string): Promise<UserProfile | null>;
	deleteUserProfile(userId: string): Promise<boolean>;
}
