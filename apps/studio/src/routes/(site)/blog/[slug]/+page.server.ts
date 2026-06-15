import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { siteContext, getPreviewPerspective } from '$lib/server/site';
import { loadTagMap } from '$lib/blog/tags';
import { resolveAssets } from '$lib/blog/resolve-assets';
import { loadAuthorMap, postAuthor } from '$lib/blog/authors';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { orgId, context } = await siteContext(locals);
	const localAPI = locals.aphexCMS.localAPI;
	const perspective = getPreviewPerspective(locals.auth, url);

	const result = await localAPI.collections.blog_post.find(context, {
		perspective,
		limit: 1,
		where: { slug: { equals: params.slug } }
	});

	const post = result.docs[0];
	if (!post) error(404, 'Post not found');

	// Resolve references at the same perspective as the post, so previewing a
	// draft also shows unpublished tag/author edits. The live site is always
	// 'published' here.
	const [tagMap, authorMap] = await Promise.all([
		loadTagMap(localAPI, context, perspective),
		loadAuthorMap(localAPI, context, perspective)
	]);

	// Gather every asset ref the page renders: cover, inline images, the SEO
	// social image, and the byline author's avatar.
	const refs: Array<string | null | undefined> = [
		post.coverImage?.asset?._ref,
		post.seo?.ogImage?.asset?._ref,
		postAuthor(post.author, authorMap)?.avatarRef
	];
	if (Array.isArray(post.content)) {
		for (const block of post.content) {
			if (block._type === 'image' && block.asset?._ref) refs.push(block.asset._ref);
		}
	}
	const { urls: assetUrls, alts: assetAlts } = await resolveAssets(
		locals.aphexCMS.assetService,
		orgId,
		refs
	);

	return { post, assetUrls, assetAlts, tagMap, authorMap };
};
