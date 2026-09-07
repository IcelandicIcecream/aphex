import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';

/**
 * One page, looked up by its slug — the route the `slug` field on the `page`
 * schema exists to feed, and what `previewUrl` opens from the studio.
 *
 * `slug` is stored as a bare string ("about"), not Sanity's `{ current }`, so it
 * filters directly.
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	const [org] = await locals.aphexCMS.databaseAdapter.findAllOrganizations();
	if (!org) throw error(404, 'Not found');

	const context = { ...systemContext(org.id), perspective: 'published' as const };

	const { docs } = await locals.aphexCMS.localAPI.collections.page.find(context, {
		where: { slug: { equals: params.slug } },
		limit: 1,
		// Strips organizationId/createdBy/updatedBy/publishedHash before this
		// reaches the hydration payload. Required on every public-facing read.
		public: true
	});

	const page = docs[0];
	if (!page) throw error(404, 'Not found');

	// An image field stores only a reference — `{ asset: { _ref } }`. This expands
	// every one of them in place (cover image, inline blocks in the rich text) so
	// the component can read a real URL. Without it images silently render nothing,
	// because there is no URL to render.
	await locals.aphexCMS.assetService.injectAssetUrls(org.id, page);

	return { page };
};
