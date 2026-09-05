import type { DatabaseAdapter } from '../../../db/index';
import { cmsLogger } from '../../../utils/logger';

/**
 * Strip a deleted asset's references out of document data.
 *
 * Shared by the single and bulk delete routes so they can't drift: bulk delete
 * previously skipped this entirely, so a batch delete left every reference
 * behind while an identical single delete cleaned up.
 *
 * The adapter method is optional, so a third-party adapter that doesn't
 * implement it degrades to "references stay behind" rather than failing the
 * delete. That is survivable because asset resolution is null-safe — an
 * unresolved `_ref` renders as nothing rather than throwing.
 *
 * Never throws: the asset is already gone by the time this runs, so a cleanup
 * failure must not turn a successful delete into a 500.
 */
export async function clearAssetReferences(
	databaseAdapter: DatabaseAdapter,
	organizationId: string,
	assetId: string
): Promise<void> {
	if (!databaseAdapter.clearAssetReferences) {
		cmsLogger.debug('[Asset Delete] clearAssetReferences not available on adapter');
		return;
	}

	try {
		const cleared = await databaseAdapter.clearAssetReferences(organizationId, assetId);
		if (cleared > 0) {
			cmsLogger.debug(`[Asset Delete] Cleared asset ${assetId} from ${cleared} document(s)`);
		}
	} catch (error) {
		cmsLogger.error(`[Asset Delete] Failed clearing references for asset ${assetId}:`, error);
	}
}
