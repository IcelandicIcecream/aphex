import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const auth = locals.auth;

	if (!auth || auth.type !== 'session') {
		throw new Error('No session found');
	}

	const databaseAdapter = locals.aphexCMS.databaseAdapter;
	let pendingInvitations: any[] = [];

	if (auth.organizationId) {
		const invitations = await databaseAdapter.findOrganizationInvitations(auth.organizationId);
		pendingInvitations = invitations.filter(
			(inv: any) => !inv.acceptedAt && inv.expiresAt && inv.expiresAt > new Date()
		);
	}

	return {
		pendingInvitations
	};
};
