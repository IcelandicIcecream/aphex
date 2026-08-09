import type { PageServerLoad } from './$types';
import { email } from '$lib/server/email';
import { authOptions } from '$lib/server/auth/auth.config';

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

	// Same resolution as the sign-in challenge: email needs an adapter behind it,
	// and TOTP comes back if dropping it would leave no factor at all.
	const emailOtpAvailable = Boolean(authOptions.twoFactorMethods.includes('email') && email);

	return {
		userPreferences,
		hasChildOrganizations,
		totpAvailable: authOptions.twoFactorMethods.includes('totp') || !emailOtpAvailable,
		emailOtpAvailable
	};
};
