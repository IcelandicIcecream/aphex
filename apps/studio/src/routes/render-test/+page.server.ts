import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const auth = locals.auth;
	if (!auth || auth.type !== 'session') {
		return { documents: [] };
	}

	const localAPI = locals.aphexCMS.localAPI;
	const context = { organizationId: auth.organizationId!, overrideAccess: true };

	const result = await localAPI.collections.simple_document.find(context, {
		perspective: 'published',
		limit: 10
	});

	return {
		documents: result.docs
	};
};
