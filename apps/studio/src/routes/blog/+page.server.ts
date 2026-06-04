import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { localAPI, databaseAdapter, assetService } = locals.aphexCMS;

	const organization = await databaseAdapter.findOrganizationBySlug('breaking-music');
	if (!organization) return { posts: [], assetUrls: {} };

	const context = systemContext(organization.id);

	const result = await localAPI.collections.blog_post.find(context, {
		perspective: 'published',
		limit: 50
	});

	const assetUrls: Record<string, string> = {};
	for (const post of result.docs) {
		const ref = (post as any).coverImage?.asset?._ref;
		if (ref && !assetUrls[ref]) {
			try {
				const asset = await assetService.findAssetById(organization.id, ref);
				if (asset?.url) assetUrls[ref] = asset.url;
			} catch {
				// skip
			}
		}
	}

	return { posts: result.docs, assetUrls };
};
