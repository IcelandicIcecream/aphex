import { Hono } from 'hono';
import { cmsLogger } from '../../../utils/logger';
import { hasCapability } from '../../../types/capabilities';
import { isPendingInvitation } from '../../../auth/invitation-status';
import type { OrganizationMemberWithUser, OrganizationTeam } from '../../../types/organization';
import type { AphexEnv } from '../index';

/**
 * `GET /organizations/team` — the members settings page in one round-trip:
 * members with their user profile, pending invitations (with the accept link
 * for callers who can invite), the invitable roles, and whether email is
 * configured. Exists so the page can be a cms-core component rather than an
 * app-owned `+page.server.ts`, which every scaffold would otherwise have to
 * patch by hand to pick up improvements.
 *
 * Mounted before the `/:id` router — `team` must not be read as an org id.
 */
export const organizationsTeamRouter: Hono<AphexEnv> = new Hono<AphexEnv>().get(
	'/team',
	async (c) => {
		try {
			const { databaseAdapter, rolesService, auth: authProvider, emailAdapter } = c.var.aphexCMS;
			const auth = c.var.auth;

			if (!auth || auth.type !== 'session') {
				return c.json(
					{
						success: false,
						error: 'Unauthorized',
						message: 'Session authentication required'
					},
					401
				);
			}

			const canInvite = hasCapability(auth, 'member.invite');
			const origin = new URL(c.req.url).origin;

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

			const team: OrganizationTeam = {
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

			return c.json({ success: true, data: team });
		} catch (error) {
			cmsLogger.error('Failed to fetch organization team:', error);
			return c.json(
				{
					success: false,
					error: 'Failed to fetch team',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	}
);
