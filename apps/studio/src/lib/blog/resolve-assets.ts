import type { AssetService } from '@aphexcms/cms-core/server';

/**
 * Resolve a batch of asset `_ref` ids to their public URLs in one pass.
 * De-dupes repeated refs and silently skips missing/erroring assets, so the
 * caller gets a `{ ref: url }` map it can look up without further guarding.
 */
export async function resolveAssetUrls(
	assetService: AssetService,
	organizationId: string,
	refs: Array<string | null | undefined>
): Promise<Record<string, string>> {
	const urls: Record<string, string> = {};
	for (const ref of refs) {
		if (!ref || urls[ref]) continue;
		try {
			const asset = await assetService.findAssetById(organizationId, ref);
			if (asset?.url) urls[ref] = asset.url;
		} catch {
			// missing asset — leave it out of the map
		}
	}
	return urls;
}
