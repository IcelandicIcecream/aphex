import { error } from '@sveltejs/kit';
import { siteContext } from './site';
import { resolveReferences } from './references';
import { loadArchiveBlocks } from './archive';
import { loadFormBlocks } from './forms';

/**
 * Load one `page` by slug, fully prepared for rendering.
 *
 * Four steps, and every one of them is load-bearing — skipping any leaves a page
 * that renders blank in a specific, hard-to-diagnose way:
 *
 *  1. **Query** by slug, with `public: true` so internal `_meta` never reaches
 *     the browser.
 *  2. **Resolve references** — every link in the hero, the CTA and the archive
 *     block's selection is a bare `{ _ref }` until this runs, and a bare ref has
 *     no slug to build an href from.
 *  3. **Inject asset URLs** — an image field is `{ asset: { _ref } }` on disk.
 *     Without this, images render nothing and raise no error.
 *  4. **Populate archives and forms** — resolve the posts each archive block asks
 *     for, and the form document each form block embeds. Both attach a derived
 *     `_`-prefixed key to their block and run together.
 *
 * Shared by `/` (which serves the page slugged `home`) and `/[slug]`.
 */
export async function loadPage(locals: App.Locals, slug: string) {
	const { orgId, context } = await siteContext(locals);
	const { aphexCMS } = locals;

	const { docs } = await aphexCMS.localAPI.collections.page.find(context, {
		where: { slug: { equals: slug } },
		limit: 1,
		public: true
	});

	const page = docs[0];
	if (!page) throw error(404, 'Not found');

	const perspective = context.perspective ?? 'published';
	const resolved = await resolveReferences(aphexCMS.databaseAdapter, orgId, page, perspective);
	await aphexCMS.assetService.injectAssetUrls(orgId, resolved);
	await Promise.all([
		loadArchiveBlocks(aphexCMS, orgId, context, resolved.layout),
		loadFormBlocks(aphexCMS, context, resolved.layout)
	]);

	return resolved;
}
