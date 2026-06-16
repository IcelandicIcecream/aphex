import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import { getPreviewPerspective } from '@aphexcms/cms-core/server';
import type { LocalAPIContext } from '@aphexcms/cms-core/server';
import { error } from '@sveltejs/kit';

/**
 * The organization whose published content powers the public site.
 *
 * The studio seeds several organizations and the demo content lives under the
 * second one; a single-org deploy (a real blog) only has the first. `[1] ?? [0]`
 * covers both. Swap this for a slug/env lookup if you host multiple sites.
 */
export async function siteContext(locals: App.Locals): Promise<{
	orgId: string;
	context: LocalAPIContext;
}> {
	const orgs = await locals.aphexCMS.databaseAdapter.findAllOrganizations();
	const org = orgs[1] ?? orgs[0];
	if (!org) throw error(404, 'No organization configured');
	return { orgId: org.id, context: systemContext(org.id) };
}

/** Re-export so routes have a single import for everything site-load related. */
export { getPreviewPerspective };
