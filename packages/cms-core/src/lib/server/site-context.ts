import { error } from '@sveltejs/kit';
import { systemContext } from '../local-api/auth-helpers';
import type { LocalAPIContext } from '../local-api/types';
import type { Organization } from '../types/organization';

export interface SiteContextOptions {
	/**
	 * The slug of the organization to read from when the URL names no tenant.
	 * A multi-tenant app passes this on pages outside any tenant, such as its
	 * marketing site at the apex domain.
	 */
	organization?: string;
}

export interface SiteContext {
	/** The organization whose content this page shows. */
	organization: Organization;
	/**
	 * A Local API context for that organization's public pages. It reads
	 * published content, or drafts during an authenticated preview
	 * (`locals.previewPerspective`), without passing `perspective` on each query.
	 */
	context: LocalAPIContext;
}

/**
 * The organization a site page reads its content from, with a context to read it.
 *
 * - On a tenant's URL (`locals.aphexTenant` set by your hook), it's the tenant.
 *   A slug no organization has is a 404.
 * - With `options.organization`, it's that organization.
 * - In an app with no tenant hook (`locals.aphexTenant` never set), it's the
 *   oldest organization, the one the site was set up with.
 * - In an app with a tenant hook, on a URL with no tenant (`null`), it's a 404
 *   unless you pass `options.organization`. Guessing would show one customer's
 *   content on a page meant for no one in particular.
 *
 * The context skips permission checks, like `systemContext`, so a page sees what
 * the organization has published. Pass `public: true` on reads whose results go
 * into the page, to leave out `organizationId` and the editors' ids.
 */
export async function siteContext(
	locals: App.Locals,
	options: SiteContextOptions = {}
): Promise<SiteContext> {
	const organization = await siteOrganization(locals, options);
	const perspective = locals.previewPerspective ?? 'published';
	return { organization, context: { ...systemContext(organization.id), perspective } };
}

async function siteOrganization(
	locals: App.Locals,
	options: SiteContextOptions
): Promise<Organization> {
	const { databaseAdapter } = locals.aphexCMS;

	if (locals.aphexTenant) {
		if (!locals.aphexTenantOrganization) throw error(404, 'Not found');
		return locals.aphexTenantOrganization;
	}

	if (options.organization) {
		const named = await databaseAdapter.findOrganizationBySlug(options.organization);
		if (!named) throw error(404, `No organization has the slug "${options.organization}"`);
		return named;
	}

	if (locals.aphexTenant === null) {
		throw error(404, 'Not found');
	}

	const organizations = await databaseAdapter.findAllOrganizations();
	const oldest = organizations.reduce<Organization | null>(
		(first, candidate) =>
			first === null || candidate.createdAt < first.createdAt ? candidate : first,
		null
	);
	if (!oldest) throw error(404, 'No organization has been set up yet');
	return oldest;
}
