import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { resolveAssetUrls } from '$lib/blog/resolve-assets';

export const load: PageServerLoad = async ({ locals }) => {
	const { localAPI, databaseAdapter, assetService } = locals.aphexCMS;

	const organizations = await databaseAdapter.findAllOrganizations();
	if (!organizations[1]) error(404, 'Not found');

	const orgId = organizations[1].id;
	const context = systemContext(orgId);

	const result = await localAPI.collections.blog_post.find(context, {
		perspective: 'published',
		limit: 50
	});

	const assetUrls = await resolveAssetUrls(
		assetService,
		orgId,
		result.docs.map((post) => post.coverImage?.asset?._ref)
	);

	return { posts: result.docs, assetUrls };
};
