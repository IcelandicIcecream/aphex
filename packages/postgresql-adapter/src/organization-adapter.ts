// PostgreSQL organization adapter implementation
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, sql } from 'drizzle-orm';
import type { OrganizationAdapter } from '@aphexcms/cms-core/server';
import type {
	Organization,
	NewOrganization,
	OrganizationMember,
	NewOrganizationMember,
	Invitation,
	NewInvitation,
	UserSession,
	OrganizationMembership
} from '@aphexcms/cms-core';
import type { CMSSchema } from './schema';

/**
 * PostgreSQL organization adapter implementation
 * Handles all multi-tenancy related database operations
 */
export class PostgreSQLOrganizationAdapter implements OrganizationAdapter {
	private db: ReturnType<typeof drizzle>;
	private tables: CMSSchema;

	constructor(db: ReturnType<typeof drizzle>, tables: CMSSchema) {
		this.db = db;
		this.tables = tables;
	}

	// ============================================
	// ORGANIZATION CRUD
	// ============================================

	async createOrganization(data: NewOrganization): Promise<Organization> {
		const result = await this.db.insert(this.tables.organizations).values(data).returning();

		return result[0]!;
	}

	async findOrganizationById(id: string): Promise<Organization | null> {
		const result = await this.db
			.select()
			.from(this.tables.organizations)
			.where(eq(this.tables.organizations.id, id))
			.limit(1);

		return result[0] || null;
	}

	async findOrganizationBySlug(slug: string): Promise<Organization | null> {
		const result = await this.db
			.select()
			.from(this.tables.organizations)
			.where(eq(this.tables.organizations.slug, slug))
			.limit(1);

		return result[0] || null;
	}

	async updateOrganization(
		id: string,
		data: Partial<Omit<Organization, 'id' | 'createdAt' | 'createdBy'>>
	): Promise<Organization | null> {
		const result = await this.db
			.update(this.tables.organizations)
			.set({
				...data,
				updatedAt: new Date()
			})
			.where(eq(this.tables.organizations.id, id))
			.returning();

		return result[0] || null;
	}

	async deleteOrganization(id: string): Promise<boolean> {
		const result = await this.db
			.delete(this.tables.organizations)
			.where(eq(this.tables.organizations.id, id))
			.returning({ id: this.tables.organizations.id });

		return result.length > 0;
	}

	// ============================================
	// MEMBER MANAGEMENT
	// ============================================

	async addMember(data: NewOrganizationMember): Promise<OrganizationMember> {
		const result = await this.db.insert(this.tables.organizationMembers).values(data).returning();

		return result[0]!;
	}

	async removeMember(organizationId: string, userId: string): Promise<boolean> {
		const result = await this.db
			.delete(this.tables.organizationMembers)
			.where(
				and(
					eq(this.tables.organizationMembers.organizationId, organizationId),
					eq(this.tables.organizationMembers.userId, userId)
				)
			)
			.returning({ id: this.tables.organizationMembers.id });

		return result.length > 0;
	}

	async removeAllMembers(organizationId: string): Promise<boolean> {
		const result = await this.db
			.delete(this.tables.organizationMembers)
			.where(eq(this.tables.organizationMembers.organizationId, organizationId))
			.returning({ id: this.tables.organizationMembers.id });

		return result.length > 0;
	}
	async updateMemberRole(
		organizationId: string,
		userId: string,
		role: 'owner' | 'admin' | 'editor' | 'viewer'
	): Promise<OrganizationMember | null> {
		const result = await this.db
			.update(this.tables.organizationMembers)
			.set({
				role,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(this.tables.organizationMembers.organizationId, organizationId),
					eq(this.tables.organizationMembers.userId, userId)
				)
			)
			.returning();

		return result[0] || null;
	}

	async findUserMembership(
		userId: string,
		organizationId: string
	): Promise<OrganizationMember | null> {
		const result = await this.db
			.select()
			.from(this.tables.organizationMembers)
			.where(
				and(
					eq(this.tables.organizationMembers.userId, userId),
					eq(this.tables.organizationMembers.organizationId, organizationId)
				)
			)
			.limit(1);

		return result[0] || null;
	}

	async findUserOrganizations(userId: string): Promise<OrganizationMembership[]> {
		const result = await this.db
			.select()
			.from(this.tables.organizationMembers)
			.innerJoin(
				this.tables.organizations,
				eq(this.tables.organizationMembers.organizationId, this.tables.organizations.id)
			)
			.where(eq(this.tables.organizationMembers.userId, userId));

		return result.map((row) => ({
			organization: row.cms_organizations,
			member: row.cms_organization_members
		}));
	}

	async findOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
		const result = await this.db
			.select()
			.from(this.tables.organizationMembers)
			.where(eq(this.tables.organizationMembers.organizationId, organizationId));

		return result;
	}

	// ============================================
	// INVITATION MANAGEMENT
	// ============================================

	async createInvitation(data: NewInvitation): Promise<Invitation> {
		const result = await this.db.insert(this.tables.invitations).values(data).returning();

		return result[0]!;
	}

	async findInvitationByToken(token: string): Promise<Invitation | null> {
		const result = await this.db
			.select()
			.from(this.tables.invitations)
			.where(eq(this.tables.invitations.token, token))
			.limit(1);

		return result[0] || null;
	}

	async findOrganizationInvitations(organizationId: string): Promise<Invitation[]> {
		const result = await this.db
			.select()
			.from(this.tables.invitations)
			.where(eq(this.tables.invitations.organizationId, organizationId));

		return result;
	}

	async findInvitationsByEmail(email: string): Promise<Invitation[]> {
		const result = await this.db
			.select()
			.from(this.tables.invitations)
			.where(eq(this.tables.invitations.email, email.toLowerCase()));

		return result;
	}

	async acceptInvitation(token: string, userId: string): Promise<OrganizationMember> {
		// Find the invitation
		const invitation = await this.findInvitationByToken(token);
		if (!invitation) {
			throw new Error('Invitation not found');
		}

		if (invitation.acceptedAt) {
			throw new Error('Invitation already accepted');
		}

		if (invitation.expiresAt < new Date()) {
			throw new Error('Invitation expired');
		}

		// Check if user is already a member to prevent duplicates
		const existingMembership = await this.findUserMembership(userId, invitation.organizationId);
		if (existingMembership) {
			// User is already a member - just mark the invitation as accepted and return existing membership
			await this.db
				.update(this.tables.invitations)
				.set({ acceptedAt: new Date() })
				.where(eq(this.tables.invitations.token, token));

			return existingMembership;
		}

		// Create the membership with invitation link
		const member = await this.addMember({
			organizationId: invitation.organizationId,
			userId,
			role: invitation.role,
			invitationId: invitation.id
		});

		// Mark invitation as accepted
		await this.db
			.update(this.tables.invitations)
			.set({ acceptedAt: new Date() })
			.where(eq(this.tables.invitations.token, token));

		return member;
	}

	async deleteInvitation(id: string): Promise<boolean> {
		const result = await this.db
			.delete(this.tables.invitations)
			.where(eq(this.tables.invitations.id, id))
			.returning({ id: this.tables.invitations.id });

		return result.length > 0;
	}

	async removeAllInvitations(organizationId: string): Promise<boolean> {
		const result = await this.db
			.delete(this.tables.invitations)
			.where(eq(this.tables.invitations.organizationId, organizationId))
			.returning({ id: this.tables.invitations.id });

		return result.length > 0;
	}
	async cleanupExpiredInvitations(): Promise<number> {
		const result = await this.db
			.delete(this.tables.invitations)
			.where(sql`${this.tables.invitations.expiresAt} < NOW()`)
			.returning({ id: this.tables.invitations.id });

		return result.length;
	}

	// ============================================
	// USER SESSION MANAGEMENT
	// ============================================

	async updateUserSession(userId: string, organizationId: string): Promise<void> {
		await this.db
			.insert(this.tables.userSessions)
			.values({
				userId,
				activeOrganizationId: organizationId,
				updatedAt: new Date()
			})
			.onConflictDoUpdate({
				target: this.tables.userSessions.userId,
				set: {
					activeOrganizationId: organizationId,
					updatedAt: new Date()
				}
			});
	}

	async findUserSession(userId: string): Promise<UserSession | null> {
		const result = await this.db
			.select()
			.from(this.tables.userSessions)
			.where(eq(this.tables.userSessions.userId, userId))
			.limit(1);

		return result[0] || null;
	}

	async deleteUserSession(userId: string): Promise<boolean> {
		const result = await this.db
			.delete(this.tables.userSessions)
			.where(eq(this.tables.userSessions.userId, userId))
			.returning({ userId: this.tables.userSessions.userId });

		return result.length > 0;
	}
}
