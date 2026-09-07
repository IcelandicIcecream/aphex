import { redirect } from '@sveltejs/kit';
import { isPendingInvitation } from '@aphexcms/cms-core';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const auth = locals.auth;

	// Require authentication — redirect to login if no session
	// Both 'session' and 'partial_session' users can view invitations
	if (!auth || auth.type === 'api_key') {
		throw redirect(302, '/login');
	}

	const { databaseAdapter } = locals.aphexCMS;

	// Fetch all pending invitations for this user's email
	const allInvitations = await databaseAdapter.findInvitationsByEmail(auth.user.email);

	const pending = allInvitations
		.filter((inv) => isPendingInvitation(inv))
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

	// Enrich with organization names
	const enriched = await Promise.all(
		pending.map(async (inv) => {
			const org = await databaseAdapter.findOrganizationById(inv.organizationId);
			return {
				id: inv.id,
				organizationId: inv.organizationId,
				organizationName: org?.name ?? 'Unknown',
				organizationSlug: org?.slug ?? '',
				role: inv.role,
				email: inv.email,
				expiresAt: inv.expiresAt,
				createdAt: inv.createdAt
			};
		})
	);

	return {
		pendingInvitations: enriched,
		hasOrganization: auth.type === 'session',
		user: {
			email: auth.user.email,
			name: auth.user.name
		}
	};
};
