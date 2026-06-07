import type { LayoutServerLoad } from './$types';
import type { SiteSettings } from '$lib/generated-types';
import { siteContext } from '$lib/server/site';

export const load: LayoutServerLoad = async ({ locals }) => {
	// The siteSettings singleton drives the header wordmark/nav and the footer.
	// Tolerate a missing org / unpublished settings (fresh DB) — the shell falls
	// back to sensible defaults so the site still renders before it's filled in.
	const isAuthed = locals.auth?.type === 'session';
	try {
		const { context } = await siteContext(locals);
		const settings = await locals.aphexCMS.localAPI.collections.siteSettings.get(context, {
			perspective: 'published'
		});
		return { settings: (settings ?? null) as SiteSettings | null, isAuthed };
	} catch {
		return { settings: null as SiteSettings | null, isAuthed };
	}
};
