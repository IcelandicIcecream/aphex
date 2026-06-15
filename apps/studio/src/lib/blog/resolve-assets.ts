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
	return (await resolveAssets(assetService, organizationId, refs)).urls;
}

/**
 * Like {@link resolveAssetUrls} but also returns each asset's default alt text.
 * Render precedence on the frontend is `value.alt (override) || alts[ref] (default)`,
 * so callers that draw images should pass `assetAlts` to their components.
 */
export async function resolveAssets(
	assetService: AssetService,
	organizationId: string,
	refs: Array<string | null | undefined>
): Promise<{ urls: Record<string, string>; alts: Record<string, string> }> {
	const urls: Record<string, string> = {};
	const alts: Record<string, string> = {};
	for (const ref of refs) {
		if (!ref || urls[ref] || alts[ref]) continue;
		try {
			const asset = await assetService.findAssetById(organizationId, ref);
			if (asset?.url) urls[ref] = asset.url;
			if (asset?.alt) alts[ref] = asset.alt;
		} catch {
			// missing asset — leave it out of the maps
		}
	}
	return { urls, alts };
}
