import type { LayoutServerLoad } from './$types';
import { siteContext } from '$lib/server/site';
import { resolveReferences } from '$lib/server/references';

/**
 * Shared data for every public page: the three singletons that make up the
 * chrome (site settings, header, footer) and whether someone is signed in.
 *
 * Reading them here rather than per-route means the header and footer cost one
 * query each per request, not one per page.
 *
 * Public pages aren't behind the auth hook, so `locals.auth` is empty — the
 * session is read directly and only a boolean crosses into the payload.
 */
export const load: LayoutServerLoad = async ({ locals, request }) => {
	const { aphexCMS } = locals;

	const session = await aphexCMS.auth?.getSession(request, aphexCMS.databaseAdapter);
	const signedIn = !!session;
	// Only the email crosses into the payload, and only when signed in — the rest
	// of the session has no business in a page's hydration data.
	const email = session?.user?.email ?? null;

	// Tolerate a fresh install: nobody has filled these in yet, and the site
	// should render rather than 500 on an empty settings row.
	let orgId: string;
	let context;
	try {
		({ orgId, context } = await siteContext(locals));
	} catch {
		return { signedIn, email, settings: null, header: null, footer: null };
	}

	// A singleton is read with `.get()` — there's only ever one, so there's no id.
	const [settings, header, footer] = await Promise.all([
		aphexCMS.localAPI.collections.siteSettings.get(context, { public: true }).catch(() => null),
		aphexCMS.localAPI.collections.header.get(context, { public: true }).catch(() => null),
		aphexCMS.localAPI.collections.footer.get(context, { public: true }).catch(() => null)
	]);

	// The logo is an image field, so it needs its asset ref expanded like any
	// other; the nav items hold document references, which need resolving to
	// slugs before they can become hrefs.
	await aphexCMS.assetService.injectAssetUrls(orgId, settings);

	const perspective = context.perspective ?? 'published';
	const [resolvedHeader, resolvedFooter] = await Promise.all([
		resolveReferences(aphexCMS.databaseAdapter, orgId, header, perspective),
		resolveReferences(aphexCMS.databaseAdapter, orgId, footer, perspective)
	]);

	return { signedIn, email, settings, header: resolvedHeader, footer: resolvedFooter };
};
