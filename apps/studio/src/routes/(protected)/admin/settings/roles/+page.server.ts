import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const auth = locals.auth;
	if (!auth || auth.type !== 'session') {
		throw error(401, 'Not authenticated');
	}

	const { rolesService } = locals.aphexCMS;
	const roles = await rolesService.listRoles(auth.organizationId);

	return {
		roles,
		canManageRoles: auth.capabilities?.includes('role.manage') ?? false
	};
};
