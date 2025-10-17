// Organization types for multi-tenancy
// These match the inferred types from Drizzle schema

export type OrganizationRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Organization {
	id: string;
	name: string;
	slug: string;
	parentOrganizationId: string | null;
	metadata: {
		logo?: string;
		theme?: {
			primaryColor: string;
			fontFamily: string;
			logoUrl: string;
		};
		website?: string;
		settings?: Record<string, any>;
	} | null;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface NewOrganization {
	name: string;
	slug: string;
	createdBy: string;
	id?: string;
	parentOrganizationId?: string | null;
	metadata?: {
		logo?: string;
		theme?: {
			primaryColor: string;
			fontFamily: string;
			logoUrl: string;
		};
		website?: string;
		settings?: Record<string, any>;
	} | null;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface OrganizationMember {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	organizationId: string;
	userId: string;
	role: OrganizationRole;
	preferences: Record<string, any> | null;
	invitedBy: string | null;
}

export interface NewOrganizationMember {
	organizationId: string;
	userId: string;
	role: OrganizationRole;
	id?: string;
	createdAt?: Date;
	updatedAt?: Date;
	preferences?: Record<string, any> | null;
	invitedBy?: string | null;
}

export interface Invitation {
	id: string;
	createdAt: Date;
	organizationId: string;
	role: OrganizationRole;
	invitedBy: string;
	email: string;
	token: string;
	expiresAt: Date;
	acceptedAt: Date | null;
}

export interface NewInvitation {
	organizationId: string;
	role: OrganizationRole;
	invitedBy: string;
	email: string;
	token: string;
	expiresAt: Date;
	id?: string;
	createdAt?: Date;
	acceptedAt?: Date | null;
}

export interface UserSession {
	updatedAt: Date;
	userId: string;
	activeOrganizationId: string | null;
}

export interface NewUserSession {
	userId: string;
	updatedAt?: Date;
	activeOrganizationId?: string | null;
}

// Helper type for organization with member info
export interface OrganizationMembership {
	organization: Organization;
	member: OrganizationMember;
}

// Helper type for member with user info
export interface OrganizationMemberWithUser {
	member: OrganizationMember;
	user: {
		id: string;
		email: string;
		name: string | null;
		image: string | null;
	};
}
