import type { LayoutServerLoad } from './$types';
import { organizationService } from '$lib/server/services/organization';

export const load: LayoutServerLoad = async ({ locals }) => {
	const auth = locals.auth;

	if (!auth || auth.type !== 'session') {
		throw new Error('No session found');
	}

	const databaseAdapter = locals.aphexCMS.databaseAdapter;
	let activeOrganization = null;
	let currentUserOrgRole = null;

	if (auth.organizationId) {
		const orgData = await organizationService.getOrganizationWithMembers(auth.organizationId);
		if (orgData) {
			activeOrganization = {
				...orgData.organization,
				members: orgData.members.map((m) => ({
					...m.member,
					user: m.user,
					invitedEmail: m.invitedEmail
				}))
			};

			const currentMember = orgData.members.find((m) => m.user.id === auth.user.id);
			currentUserOrgRole = currentMember?.member.role || null;
		}
	}

	return {
		user: {
			id: auth.user.id,
			email: auth.user.email,
			name: auth.user.name,
			role: auth.user.role,
			organizationRole: currentUserOrgRole
		},
		activeOrganization
	};
};
