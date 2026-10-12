// Organization types for multi-tenancy
// These match the inferred types from Drizzle schema

/**
 * Built-in organization roles. Custom roles use free-form strings — see
 * `OrganizationRoleName` for the widened type used on persisted records.
 */
export type OrganizationRole = 'owner' | 'admin' | 'editor' | 'viewer';

/**
 * Role name stored on organization_members / invitations.
 * Built-ins plus any custom role name defined for the organization.
 */
export type OrganizationRoleName = OrganizationRole | string;

export interface Organization {
	id: string;
	name: string;
	slug: string;
	parentOrganizationId: string | null;
	metadata: {
		logo?: string;
		logoInvertOnDark?: boolean;
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
		logoInvertOnDark?: boolean;
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
	role: OrganizationRoleName;
	preferences: Record<string, any> | null;
	invitationId: string | null; // Link to invitation (get invitedBy, invitedEmail from there)
}

export interface NewOrganizationMember {
	organizationId: string;
	userId: string;
	role: OrganizationRoleName;
	id?: string;
	createdAt?: Date;
	updatedAt?: Date;
	preferences?: Record<string, any> | null;
	invitationId?: string | null;
}

export interface Invitation {
	id: string;
	createdAt: Date;
	organizationId: string;
	role: OrganizationRoleName;
	invitedBy: string;
	email: string;
	token: string;
	expiresAt: Date;
	acceptedAt: Date | null;
}

export interface NewInvitation {
	organizationId: string;
	role: OrganizationRoleName;
	invitedBy: string;
	email: string;
	token: string;
	expiresAt: Date;
	id?: string;
	createdAt?: Date;
	acceptedAt?: Date | null;
}

export interface UserSessionPreferences {
	includeChildOrganizations?: boolean;
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

/**
 * A pending invitation as the members settings page shows it. `inviteUrl` is
 * the accept link (`/invite/<token>`) and is present only when the caller can
 * invite — the token is the credential, so members without `member.invite`
 * see who's pending but not the link.
 */
export interface PendingInvitationView {
	id: string;
	email: string;
	role: OrganizationRoleName;
	inviteUrl?: string;
}

/**
 * Everything the members settings page needs in one round-trip
 * (`GET /api/organizations/team`). Served by cms-core so the page itself can
 * live in cms-core and improve with a version bump rather than a file edit in
 * every scaffolded app.
 */
export interface OrganizationTeam {
	currentUserId: string;
	members: OrganizationMemberWithUser[];
	invitations: PendingInvitationView[];
	/** Roles a member can be invited as — owner is excluded (ownership is transferred, not invited). */
	inviteRoles: Array<{ name: string; description: string | null }>;
	/** False when no email adapter is configured, so invitations are never sent — only the link works. */
	emailConfigured: boolean;
}
