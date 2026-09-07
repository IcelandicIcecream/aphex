import type { LayoutServerLoad } from './$types';
import { organizationService } from '$lib/server/services/organization';

export const load: LayoutServerLoad = async ({ locals }) => {
	const auth = locals.auth;

	if (!auth || auth.type !== 'session') {
		throw new Error('No session found');
	}

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

	// Name and image come from the database, not from `auth.user`. The session is
	// served from Better Auth's signed cookie cache (60s), which is the right
	// trade-off for *auth* state but makes it stale for *profile* state: editing
	// your name or avatar writes the user row directly, so a cached session would
	// keep serving the old values for up to a minute and the settings form would
	// visibly revert right after saving. Auth identity still comes from the
	// session; only the editable display fields are re-read.
	// Falling back per-field would be wrong: once the row is found, an absent
	// `image` means "removed", and coalescing to the session value would
	// resurrect the avatar the user just deleted. So the row wins wholesale, and
	// the session is only the fallback when there is no row at all.
	const provider = locals.aphexCMS.auth;
	const profile = provider ? await provider.getUserById(auth.user.id) : null;
	const { name, image } = profile ?? { name: auth.user.name, image: auth.user.image };

	return {
		user: {
			id: auth.user.id,
			email: auth.user.email,
			name,
			image,
			role: auth.user.role,
			organizationRole: currentUserOrgRole
		},
		activeOrganization
	};
};
