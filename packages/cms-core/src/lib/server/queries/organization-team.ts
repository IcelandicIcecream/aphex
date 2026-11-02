import { hasCapability } from '../../types/capabilities';
import { isPendingInvitation } from '../../auth/invitation-status';
import { cmsLogger } from '../../utils/logger';
import type { CMSInstances } from '../../hooks';
import type { SessionAuth } from '../../types/auth';
import type { OrganizationMemberWithUser, OrganizationTeam } from '../../types/organization';

/**
 * Everything the members settings page shows, in one query: members with their
 * user profile, pending invitations (with the accept link for callers who can
 * invite), the invitable roles, and whether email is configured.
 *
 * Called by **both** the SSR load helper (`loadMembersPage`) and the Hono
 * route (`GET /organizations/team`), so the page and the HTTP API (MCP, agents,
 * tests) read the exact same code.
 */
export async function getOrganizationTeam(
	services: CMSInstances,
	auth: SessionAuth,
	origin: string
): Promise<OrganizationTeam> {
	const { databaseAdapter, rolesService, auth: authProvider, emailAdapter } = services;

	const canInvite = hasCapability(auth, 'member.invite');

	const [memberRows, invitationRows, roles] = await Promise.all([
		databaseAdapter.findOrganizationMembers(auth.organizationId),
		databaseAdapter.findOrganizationInvitations(auth.organizationId),
		rolesService.listRoles(auth.organizationId)
	]);

	// The user table belongs to the auth provider, not the CMS, so profiles
	// come through the provider one by one. Orgs are small; this is fine.
	// A member whose user row is gone is dropped rather than shown blank.
	const members: OrganizationMemberWithUser[] = [];
	if (authProvider) {
		await Promise.all(
			memberRows.map(async (member) => {
				try {
					const user = await authProvider.getUserById(member.userId);
					if (!user) return;
					members.push({
						member,
						user: {
							id: user.id,
							email: user.email,
							name: user.name ?? null,
							image: user.image ?? null
						}
					});
				} catch (error) {
					cmsLogger.warn(`Failed to resolve user ${member.userId} for team listing:`, error);
				}
			})
		);
	}
	// Promise.all settles in completion order — restore a stable listing.
	members.sort(
		(a, b) => new Date(a.member.createdAt).getTime() - new Date(b.member.createdAt).getTime()
	);

	return {
		currentUserId: auth.user.id,
		members,
		invitations: invitationRows
			.filter((inv) => isPendingInvitation(inv))
			.map((inv) => ({
				id: inv.id,
				email: inv.email,
				role: inv.role,
				...(canInvite ? { inviteUrl: `${origin}/invite/${inv.token}` } : {})
			})),
		inviteRoles: roles
			.filter((r) => r.name !== 'owner')
			.map((r) => ({ name: r.name, description: r.description })),
		emailConfigured: emailAdapter != null
	};
}
