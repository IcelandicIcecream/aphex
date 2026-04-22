import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { hasCapability } from '@aphexcms/cms-core';

export const load: PageServerLoad = async ({ locals }) => {
	const auth = locals.auth;

	// Users without org.settings can't do anything on the General tab — route
	// them to their profile (always available) so the default settings URL
	// doesn't land them on a locked page.
	if (auth?.type === 'session' && !hasCapability(auth, 'org.settings')) {
		throw redirect(302, '/admin/settings/account');
	}

	return {};
};
