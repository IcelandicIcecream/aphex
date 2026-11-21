import { siteContext as coreSiteContext, type LocalAPIContext } from '@aphexcms/cms-core/server';

/**
 * The organization whose content powers the public site, and a context to read it.
 *
 * Core's `siteContext` picks the organization: the tenant on a tenant's URL, or
 * the oldest organization in an app without tenants (the studio seeds several, and
 * the demo content lives in the first). It reads drafts during an authenticated
 * preview and published content otherwise. This keeps the `{ orgId, context }`
 * shape the studio's pages already use.
 */
export async function siteContext(locals: App.Locals): Promise<{
	orgId: string;
	context: LocalAPIContext;
}> {
	const { organization, context } = await coreSiteContext(locals);
	return { orgId: organization.id, context };
}
