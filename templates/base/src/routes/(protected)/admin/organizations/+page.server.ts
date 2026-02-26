import type { PageServerLoad } from './$types';
import { authService } from '$lib/server/auth/service';

export const load: PageServerLoad = async ({ locals }) => {
	const { databaseAdapter } = locals.aphexCMS;
	const auth = locals.auth;

	if (!auth || auth.type !== 'session') {
		return { organizations: [] };
	}

	const memberships = await databaseAdapter.findUserOrganizations(auth.user.id);

	const orgs = await Promise.all(
		memberships.map(async (membership) => {
			const members = await databaseAdapter.findOrganizationMembers(membership.organization.id);
			const owner = members.find((m) => m.role === 'owner');

			// Resolve owner email from auth system
			let ownerEmail: string | undefined;
			if (owner) {
				const ownerUser = await authService.getUserById(owner.userId);
				ownerEmail = ownerUser?.email;
			}

			return {
				id: membership.organization.id,
				name: membership.organization.name,
				slug: membership.organization.slug,
				role: membership.member.role,
				isActive: membership.organization.id === auth.organizationId,
				memberCount: members.length,
				ownerEmail
			};
		})
	);

	return { organizations: orgs };
};
