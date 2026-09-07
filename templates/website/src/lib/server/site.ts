import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import type { LocalAPIContext } from '@aphexcms/cms-core/server';
import { error } from '@sveltejs/kit';

/**
 * The organization whose content powers the public site, plus the read context
 * every public load should use.
 *
 * Two things are baked in here so no individual load has to remember them:
 *
 *  - `perspective` comes from `locals.previewPerspective`, resolved once per
 *    request by the CMS hook from `preview.resolvePerspective` in
 *    `aphex.config.ts`. That's what makes `?aphex-preview=1` show drafts to a
 *    signed-in editor and published content to everyone else.
 *  - `systemContext` bypasses per-user access control, which is right for a
 *    public site: there is no user. Every read that renders a public page must
 *    still pass `public: true` so internal `_meta` never reaches the hydration
 *    payload.
 *
 * The starter is single-tenant, so content lives under the first organization.
 * Swap this for a host/slug lookup to serve several sites from one deploy.
 */
export async function siteContext(locals: App.Locals): Promise<{
	orgId: string;
	context: LocalAPIContext;
}> {
	const orgs = await locals.aphexCMS.databaseAdapter.findAllOrganizations();
	const org = orgs[0];
	if (!org) throw error(404, 'No organization configured');
	const perspective = locals.previewPerspective ?? 'published';
	return { orgId: org.id, context: { ...systemContext(org.id), perspective } };
}
