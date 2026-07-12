import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import type { LocalAPIContext } from '@aphexcms/cms-core/server';
import { error } from '@sveltejs/kit';

/**
 * The organization whose content powers the public site.
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
	const org = orgs[0];
	if (!org) throw error(404, 'No organization configured');
	// Bake the request's read perspective (resolved once in the CMS hook →
	// `locals.previewPerspective`) into the context, so every site load inherits
	// draft-in-preview / published without threading `perspective` per query.
	const perspective = locals.previewPerspective ?? 'published';
	return { orgId: org.id, context: { ...systemContext(org.id), perspective } };
}
