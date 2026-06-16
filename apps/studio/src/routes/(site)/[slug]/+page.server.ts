import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { siteContext, getPreviewPerspective } from '$lib/server/site';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { orgId, context } = await siteContext(locals);
	const perspective = getPreviewPerspective(locals.auth, url);

	const result = await locals.aphexCMS.localAPI.collections.page.find(context, {
		perspective,
		limit: 1,
		where: { slug: { equals: params.slug } }
	});

	const page = result.docs[0];
	if (!page) error(404, 'Page not found');

	// Hydrate images (cover, inline blocks, SEO social image) in place so the frontend
	// reads `image.asset.url` directly.
	await locals.aphexCMS.assetService.injectAssetUrls(orgId, page);

	return { page };
};
