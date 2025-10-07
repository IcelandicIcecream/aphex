export interface CMSUser {
	id: string; // From the auth provider
	email: string; // From the auth provider
	name?: string; // From the auth provider
	image?: string; // From the auth provider
	role: 'admin' | 'editor' | 'viewer'; // From your userProfiles table
	preferences?: Record<string, any>; // From your userProfiles table
}
