import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { localAPI, databaseAdapter, assetService } = locals.aphexCMS;

	const organizations = await databaseAdapter.findAllOrganizations();
	if (!organizations[1]) error(404, 'Not found');

	const context = systemContext(organizations[1].id);

	const result = await localAPI.collections.blog_post.find(context, {
		perspective: 'published',
		limit: 50
	});

	const assetUrls: Record<string, string> = {};
	for (const post of result.docs) {
		const ref = (post as any).coverImage?.asset?._ref;
		if (ref && !assetUrls[ref]) {
			try {
				const asset = await assetService.findAssetById(organizations[1].id, ref);
				if (asset?.url) assetUrls[ref] = asset.url;
			} catch {
				// skip
			}
		}
	}

	return { posts: result.docs, assetUrls };
};
