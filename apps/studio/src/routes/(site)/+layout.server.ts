import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import type { SiteSettings } from '$lib/generated-types';
import { siteContext } from '$lib/server/site';
import { isPreviewMode } from '@aphexcms/visual-editing';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const isAuthed = locals.auth?.type === 'session';

	// `?aphex-preview` only enables the editing overlay; it never grants draft access on its
	// own (the backend gates that on an authenticated session). So for a logged-out visitor the
	// marker does nothing but muddy the URL — strip it and serve the clean public page, making
	// it unambiguous they're looking at the live site. Authenticated editors keep it (that's
	// what the studio iframe loads). This must run before the try/catch below, or `redirect()`'s
	// control-flow throw would be swallowed.
	if (!isAuthed && isPreviewMode(url)) {
		const clean = new URL(url);
		clean.searchParams.delete('aphex-preview');
		redirect(307, clean.pathname + clean.search + clean.hash);
	}

	// The siteSettings singleton drives the header wordmark/logo, nav, and footer.
	// Tolerate a missing org / unpublished settings (fresh DB) — the shell falls
	// back to sensible defaults so the site still renders before it's filled in.
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
