import type { PageServerLoad } from './$types';
import { siteContext } from '$lib/server/site';
import { resolveAssets } from '$lib/blog/resolve-assets';
import { loadTagMap } from '$lib/blog/tags';

export const load: PageServerLoad = async ({ locals }) => {
	const { orgId, context } = await siteContext(locals);
	const localAPI = locals.aphexCMS.localAPI;

	const result = await localAPI.collections.blog_post.find(context, {
		perspective: 'published',
		limit: 50
	});

	// Newest first by post date (fall back to created order).
	const posts = [...result.docs].sort((a, b) => (b.postDate ?? '').localeCompare(a.postDate ?? ''));

	const [assetData, tagMap] = await Promise.all([
		resolveAssets(
			locals.aphexCMS.assetService,
			orgId,
			posts.map((post) => post.coverImage?.asset?._ref)
		),
		loadTagMap(localAPI, context)
	]);

	return { posts, assetUrls: assetData.urls, assetAlts: assetData.alts, tagMap };
};
