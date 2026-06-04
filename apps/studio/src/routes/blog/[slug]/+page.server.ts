import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { localAPI, databaseAdapter, assetService } = locals.aphexCMS;

	const organization = await databaseAdapter.findOrganizationBySlug('breaking-music');
	if (!organization) error(404, 'Not found');

	const context = systemContext(organization.id);

	const result = await localAPI.collections.blog_post.find(context, {
		perspective: 'published',
		limit: 1,
		where: { slug: { equals: params.slug } }
	});

	const post = result.docs[0];
	if (!post) error(404, 'Post not found');

	// Resolve asset URLs for images in content and cover image
	const assetUrls: Record<string, string> = {};

	const resolveRef = async (ref: string) => {
		if (assetUrls[ref]) return;
		try {
			const asset = await assetService.findAssetById(organization.id, ref);
			if (asset?.url) assetUrls[ref] = asset.url;
		} catch {
			// skip missing
		}
	};

	const p = post as any;
	if (p.coverImage?.asset?._ref) await resolveRef(p.coverImage.asset._ref);

	if (Array.isArray(p.content)) {
		for (const block of p.content) {
			if (block._type === 'image' && block.asset?._ref) {
				await resolveRef(block.asset._ref);
			}
		}
	}

	return { post, assetUrls };
};
