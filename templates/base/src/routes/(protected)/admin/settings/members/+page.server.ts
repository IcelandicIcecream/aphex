import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const auth = locals.auth;

	if (!auth || auth.type !== 'session') {
		throw new Error('No session found');
	}

	const { databaseAdapter, rolesService } = locals.aphexCMS;
	let pendingInvitations: any[] = [];

	if (auth.organizationId) {
		const invitations = await databaseAdapter.findOrganizationInvitations(auth.organizationId);
		pendingInvitations = invitations.filter(
			(inv: any) => !inv.acceptedAt && inv.expiresAt && inv.expiresAt > new Date()
		);
	}

	// Load roles so the invite dropdown reflects custom roles defined for this
	// org. Owners are excluded — ownership is transferred, not invited.
	const allRoles = auth.organizationId ? await rolesService.listRoles(auth.organizationId) : [];
	const inviteRoles = allRoles
		.filter((r) => r.name !== 'owner')
		.map((r) => ({ name: r.name, description: r.description }));

	return {
		pendingInvitations,
		inviteRoles
	};
};
