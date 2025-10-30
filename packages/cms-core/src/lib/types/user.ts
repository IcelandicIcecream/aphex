// Represents the data stored in the cms_user_profiles table.
export interface UserProfile {
	userId: string;
	role: 'super_admin' | 'admin' | 'editor' | 'viewer';
	preferences?: Record<string, any>;
}

// Represents the core user data from the auth provider.
export interface AuthUser {
	id: string;
	email: string;
	name?: string;
	image?: string;
}

// The final, combined object, composed from the two types above.
export interface CMSUser extends AuthUser, Omit<UserProfile, 'userId'> {}
