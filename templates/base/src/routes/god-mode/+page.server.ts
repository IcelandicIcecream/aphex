import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { databaseAdapter } = locals.aphexCMS;
	const instanceSettings = await databaseAdapter.getInstanceSettings();

	return {
		instanceSettings
	};
};
