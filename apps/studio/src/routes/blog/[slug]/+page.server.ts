import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import { getPreviewPerspective } from '@aphexcms/cms-core/server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolveAssetUrls } from '$lib/blog/resolve-assets';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { localAPI, databaseAdapter, assetService } = locals.aphexCMS;

	const organizations = await databaseAdapter.findAllOrganizations();
	if (!organizations[1]) error(404, 'Not found');

	const orgId = organizations[1].id;
	const context = systemContext(orgId);
	const perspective = getPreviewPerspective(locals.auth, url);

	const result = await localAPI.collections.blog_post.find(context, {
		perspective,
		limit: 1,
		where: { slug: { equals: params.slug } }
	});

	const post = result.docs[0];
	if (!post) error(404, 'Post not found');

	// Gather every asset ref the page renders: cover image + inline image blocks.
	const refs: Array<string | null | undefined> = [post.coverImage?.asset?._ref];
	if (Array.isArray(post.content)) {
		for (const block of post.content) {
			if (block._type === 'image' && block.asset?._ref) refs.push(block.asset._ref);
		}
	}
	const assetUrls = await resolveAssetUrls(assetService, orgId, refs);

	return { post, assetUrls };
};
