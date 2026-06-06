import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import { getPreviewPerspective } from '@aphexcms/cms-core/server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

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

	const assetUrls: Record<string, string> = {};

	const resolveRef = async (ref: string) => {
		if (assetUrls[ref]) return;
		try {
			const asset = await assetService.findAssetById(orgId, ref);
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
