import type { LayoutServerLoad } from './$types';
import type { SiteSettings } from '$lib/generated-types';
import { siteContext } from '$lib/server/site';

export const load: LayoutServerLoad = async ({ locals }) => {
	// The siteSettings singleton drives the header wordmark/logo, nav, and footer.
	// Tolerate a missing org / unpublished settings (fresh DB) — the shell falls
	// back to sensible defaults so the site still renders before it's filled in.
	const isAuthed = locals.auth?.type === 'session';
	try {
		const { orgId, context } = await siteContext(locals);
		const settings = (await locals.aphexCMS.localAPI.collections.siteSettings.get(context, {
			perspective: 'published'
		})) as SiteSettings | null;

		await locals.aphexCMS.assetService.injectAssetUrls(orgId, settings);
		const logoUrl = settings?.logo?.asset?.url ?? null;
		const faviconUrl = settings?.favicon?.asset?.url ?? null;

		return { settings, isAuthed, logoUrl, faviconUrl };
	} catch {
		return { settings: null as SiteSettings | null, isAuthed, logoUrl: null, faviconUrl: null };
	}
};
