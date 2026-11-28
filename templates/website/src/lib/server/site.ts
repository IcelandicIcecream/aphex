import { siteContext as coreSiteContext, type LocalAPIContext } from '@aphexcms/cms-core/server';

/**
 * The organization whose content powers the public site, and a context to read it.
 *
 * Core's `siteContext` picks the organization: the tenant on a tenant's URL, or
 * the oldest organization in an app without tenants. It reads drafts during an
 * authenticated preview (`?aphex-preview=1`) and published content otherwise.
 * Every read that renders a public page must still pass `public: true`, so
 * internal `_meta` never reaches the hydration payload.
 */
export async function siteContext(locals: App.Locals): Promise<{
	orgId: string;
	context: LocalAPIContext;
}> {
	const { organization, context } = await coreSiteContext(locals);
	return { orgId: organization.id, context };
}
