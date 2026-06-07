import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { siteContext, getPreviewPerspective } from '$lib/server/site';
import { resolveAssetUrls } from '$lib/blog/resolve-assets';
import { loadTagMap } from '$lib/blog/tags';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { orgId, context } = await siteContext(locals);
	const localAPI = locals.aphexCMS.localAPI;
	const perspective = getPreviewPerspective(locals.auth, url);

	const authorRes = await localAPI.collections.author.find(context, {
		perspective,
		limit: 1,
		where: { slug: { equals: params.slug } }
	});
	const author = authorRes.docs[0];
	if (!author) error(404, 'Author not found');

	const postRes = await localAPI.collections.blog_post.find(context, {
		perspective: 'published',
		limit: 100
	});
	const posts = postRes.docs
		.filter((post) => post.author?._ref === author.id)
		.sort((a, b) => (b.postDate ?? '').localeCompare(a.postDate ?? ''));

	const [tagMap, assetUrls] = await Promise.all([
		loadTagMap(localAPI, context),
		resolveAssetUrls(locals.aphexCMS.assetService, orgId, [
			author.avatar?.asset?._ref,
			author.seo?.ogImage?.asset?._ref,
			...posts.map((post) => post.coverImage?.asset?._ref)
		])
	]);

	return { author, posts, assetUrls, tagMap };
};
