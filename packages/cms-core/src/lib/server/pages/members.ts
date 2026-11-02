import { error } from '@sveltejs/kit';
import { getOrganizationTeam } from '../queries/organization-team';
import type { OrganizationTeam } from '../../types/organization';

/**
 * Data for the members settings page. Hand-written response type (no zod) per
 * the CLAUDE.md response-type rule.
 */
export interface MembersPageData {
	team: OrganizationTeam;
}

/**
 * SSR load for `settings/members`. A scaffolded app wires it in a one-line
 * `+page.server.ts` (`export { loadMembersPage as load } from
 * '@aphexcms/cms-core/server'`), so every improvement to this page ships with
 * a version bump instead of a hand-edit in each project.
 *
 * `/admin` is already behind the auth hook; the session re-check here is the
 * honest 401 for the data, and keeps the helper correct if it's ever mounted
 * outside the protected group.
 */
export async function loadMembersPage(event: {
	locals: App.Locals;
	url: URL;
}): Promise<MembersPageData> {
	const auth = event.locals.aphexAuth;
	if (!auth || auth.type !== 'session') {
		throw error(401, 'Session authentication required');
	}
	return { team: await getOrganizationTeam(event.locals.aphexCMS, auth, event.url.origin) };
}
