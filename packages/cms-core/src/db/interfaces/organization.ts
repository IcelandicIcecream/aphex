// Organization adapter interface for multi-tenancy operations
import type {
	Organization,
	NewOrganization,
	OrganizationMember,
	NewOrganizationMember,
	Invitation,
	NewInvitation,
	UserSession,
	NewUserSession,
	OrganizationMembership
} from '../../types/organization.js';

export interface OrganizationAdapter {
	// Organization CRUD
	createOrganization(data: NewOrganization): Promise<Organization>;
	findOrganizationById(id: string): Promise<Organization | null>;
	findOrganizationBySlug(slug: string): Promise<Organization | null>;
	updateOrganization(
		id: string,
		data: Partial<Omit<Organization, 'id' | 'createdAt' | 'createdBy'>>
	): Promise<Organization | null>;
	deleteOrganization(id: string): Promise<boolean>;

	// Member management
	addMember(data: NewOrganizationMember): Promise<OrganizationMember>;
	removeMember(organizationId: string, userId: string): Promise<boolean>;
	updateMemberRole(
		organizationId: string,
		userId: string,
		role: 'owner' | 'admin' | 'editor' | 'viewer'
	): Promise<OrganizationMember | null>;
	findUserMembership(
		userId: string,
		organizationId: string
	): Promise<OrganizationMember | null>;
	findUserOrganizations(userId: string): Promise<OrganizationMembership[]>;
	findOrganizationMembers(organizationId: string): Promise<OrganizationMember[]>;

	// Invitation management
	createInvitation(data: NewInvitation): Promise<Invitation>;
	findInvitationByToken(token: string): Promise<Invitation | null>;
	findOrganizationInvitations(organizationId: string): Promise<Invitation[]>;
	findInvitationsByEmail(email: string): Promise<Invitation[]>;
	acceptInvitation(token: string, userId: string): Promise<OrganizationMember>;
	deleteInvitation(id: string): Promise<boolean>;
	cleanupExpiredInvitations(): Promise<number>;

	// User session management
	updateUserSession(userId: string, organizationId: string): Promise<void>;
	findUserSession(userId: string): Promise<UserSession | null>;
}
