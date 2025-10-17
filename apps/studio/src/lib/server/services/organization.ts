// Organization service - app-specific cross-domain queries
// Handles joins between auth (user) and CMS (organizations) tables
import { drizzleDb } from '../db';
import { user } from '../db/auth-schema';
import { organizationMembers, organizations } from '../db/cms-schema';
import { eq } from 'drizzle-orm';
import type { Organization, OrganizationMemberWithUser } from '@aphex/cms-core';

export interface OrganizationWithMembers {
	organization: Organization;
	members: OrganizationMemberWithUser[];
}

export const organizationService = {
	/**
	 * Get organization with enriched member data (includes user details)
	 * This performs a join between CMS organizationMembers and auth user tables
	 */
	async getOrganizationWithMembers(organizationId: string): Promise<OrganizationWithMembers | null> {
		// Fetch organization
		const org = await drizzleDb.query.organizations.findFirst({
			where: eq(organizations.id, organizationId)
		});

		if (!org) {
			return null;
		}

		// Fetch members with user details using join
		const members = await drizzleDb
			.select({
				member: organizationMembers,
				user: {
					id: user.id,
					email: user.email,
					name: user.name,
					image: user.image
				}
			})
			.from(organizationMembers)
			.innerJoin(user, eq(organizationMembers.userId, user.id))
			.where(eq(organizationMembers.organizationId, organizationId));

		return {
			organization: org,
			members: members.map((m) => ({
				member: m.member,
				user: {
					id: m.user.id,
					email: m.user.email,
					name: m.user.name,
					image: m.user.image
				}
			}))
		};
	}
};
