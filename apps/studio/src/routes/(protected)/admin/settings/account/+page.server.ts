import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const auth = locals.auth;

	if (!auth || auth.type !== 'session') {
		throw new Error('No session found');
	}

	const databaseAdapter = locals.aphexCMS.databaseAdapter;

	const userProfile = await databaseAdapter.findUserProfileById(auth.user.id);
	const userPreferences = userProfile?.preferences || {};

	let hasChildOrganizations = false;
	if (auth.organizationId && databaseAdapter.hierarchyEnabled) {
		const childOrgs = await databaseAdapter.getChildOrganizations(auth.organizationId);
		hasChildOrganizations = childOrgs.length > 0;
	}

	return {
		userPreferences,
		hasChildOrganizations
	};
};
