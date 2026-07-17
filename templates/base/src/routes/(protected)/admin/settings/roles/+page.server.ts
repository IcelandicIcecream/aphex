import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const auth = locals.auth;
	if (!auth || auth.type !== 'session') {
		throw error(401, 'Not authenticated');
	}

	const { rolesService, partResolver } = locals.aphexCMS;
	const roles = await rolesService.listRoles(auth.organizationId);

	return {
		roles,
		canManageRoles: auth.capabilities?.includes('role.manage') ?? false,
		// The full capability registry (built-in + plugin-declared) drives the editor's
		// grouped checklist, with titles/descriptions — instead of a hardcoded list.
		capabilityCatalog: partResolver.capabilityCatalog()
	};
};
