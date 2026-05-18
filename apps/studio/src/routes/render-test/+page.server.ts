import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const auth = locals.auth;
	if (!auth || auth.type !== 'session') {
		return { documents: [], assetUrls: {} };
	}

	const localAPI = locals.aphexCMS.localAPI;
	const context = { organizationId: auth.organizationId!, overrideAccess: true };

	const result = await localAPI.collections.simple_document.find(context, {
		perspective: 'published',
		limit: 10
	});

	// Resolve asset URLs for image blocks in portable text
	const assetService = locals.aphexCMS.assetService;
	const assetUrls: Record<string, string> = {};
	for (const doc of result.docs) {
		const content = (doc as any).content;
		if (!Array.isArray(content)) continue;
		for (const block of content) {
			if (block._type === 'image' && block.asset?._ref) {
				if (!assetUrls[block.asset._ref]) {
					try {
						const asset = await assetService.findAssetById(auth.organizationId!, block.asset._ref);
						if (asset?.url) {
							assetUrls[block.asset._ref] = asset.url;
						}
					} catch {
						// Skip missing assets
					}
				}
			}
		}
	}

	return {
		documents: result.docs,
		assetUrls
	};
};
