import type { LayoutServerLoad } from './$types';
import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import type { SiteSettings } from '$lib/generated-types';

/**
 * Shared data for every public page: whether someone is signed in, and the
 * siteSettings singleton that drives the header and default meta.
 *
 * Public pages aren't behind the auth hook, so `locals.auth` is empty here — the
 * session is read directly, and only a boolean crosses into the page payload.
 */
export const load: LayoutServerLoad = async ({ locals, request }) => {
	const { aphexCMS } = locals;

	const session = await aphexCMS.auth?.getSession(request, aphexCMS.databaseAdapter);
	const signedIn = !!session;

	// A singleton is read with `.get()` — there's only ever one, so there's no id.
	// Tolerate its absence: on a fresh install nobody has filled it in yet, and the
	// site should still render rather than 500 on an empty settings row.
	const [org] = await aphexCMS.databaseAdapter.findAllOrganizations();
	if (!org) return { signedIn, settings: null as SiteSettings | null };

	const context = { ...systemContext(org.id), perspective: 'published' as const };

	try {
		const settings = (await aphexCMS.localAPI.collections.siteSettings.get(context, {
			public: true
		})) as SiteSettings | null;

		// The logo is an image field, so it needs its ref expanded like any other.
		await aphexCMS.assetService.injectAssetUrls(org.id, settings);

		return { signedIn, settings };
	} catch {
		return { signedIn, settings: null as SiteSettings | null };
	}
};
