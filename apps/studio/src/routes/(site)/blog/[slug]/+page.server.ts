import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { siteContext } from '$lib/server/site';
import { loadTagMap } from '$lib/blog/tags';
import { loadAuthorMap } from '$lib/blog/authors';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { orgId, context } = await siteContext(locals);
	const localAPI = locals.aphexCMS.localAPI;
	const assetService = locals.aphexCMS.assetService;

	const result = await localAPI.collections.blog_post.find(context, {
		limit: 1,
		where: { slug: { equals: params.slug } }
	});

	const post = result.docs[0];
	if (!post) error(404, 'Post not found');

	// References resolve at the context perspective too, so previewing a draft
	// also shows unpublished tag/author edits; the live site sees published.
	const [tagMap, authorMap] = await Promise.all([
		loadTagMap(localAPI, context),
		loadAuthorMap(localAPI, context, assetService, orgId)
	]);

	// Hydrate the post's images (cover, inline blocks, SEO social image) in place — the
	// frontend then reads `image.asset.url` directly, no side-channel maps.
	await assetService.injectAssetUrls(orgId, post);

	return { post, tagMap, authorMap };
};
