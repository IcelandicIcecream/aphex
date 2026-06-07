import type { LayoutServerLoad } from './$types';
import type { SiteSettings } from '$lib/generated-types';
import { siteContext } from '$lib/server/site';
import { resolveAssetUrls } from '$lib/blog/resolve-assets';

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

		const assetUrls = await resolveAssetUrls(locals.aphexCMS.assetService, orgId, [
			settings?.logo?.asset?._ref,
			settings?.favicon?.asset?._ref
		]);
		const logoUrl = settings?.logo?.asset?._ref
			? (assetUrls[settings.logo.asset._ref] ?? null)
			: null;
		const faviconUrl = settings?.favicon?.asset?._ref
			? (assetUrls[settings.favicon.asset._ref] ?? null)
			: null;

		return { settings, isAuthed, logoUrl, faviconUrl };
	} catch {
		return { settings: null as SiteSettings | null, isAuthed, logoUrl: null, faviconUrl: null };
	}
};
