import type { PageServerLoad } from './$types';

const ORG_ID = 'd8f92c5c-c7c9-46f3-b491-9c8c60dd9cda';

export const load: PageServerLoad = async ({ locals }) => {
	const localAPI = locals.aphexCMS.localAPI;
	const context = { organizationId: ORG_ID, overrideAccess: true };

	let result = await localAPI.collections.simple_document.find(context, {
		perspective: 'published',
		limit: 10
	});

	if (result.docs.length === 0) {
		result = await localAPI.collections.simple_document.find(context, {
			perspective: 'draft',
			limit: 10
		});
	}

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
						const asset = await assetService.findAssetById(ORG_ID, block.asset._ref);
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
