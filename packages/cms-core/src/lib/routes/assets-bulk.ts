import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const DELETE: RequestHandler = async ({ request, locals }) => {
	try {
		const { assetService, databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type === 'partial_session') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { ids } = await request.json();

		if (!Array.isArray(ids) || ids.length === 0) {
			return json({ success: false, error: 'No asset IDs provided' }, { status: 400 });
		}

		// Check for references before deleting
		let referencedIds: string[] = [];
		if (databaseAdapter.countDocumentReferencesForAssets) {
			const counts = await databaseAdapter.countDocumentReferencesForAssets(auth.organizationId, ids);
			referencedIds = ids.filter((id) => (counts[id] || 0) > 0);
		}

		if (referencedIds.length > 0) {
			return json(
				{
					success: false,
					error: `Cannot delete ${referencedIds.length} asset${referencedIds.length > 1 ? 's' : ''} because ${referencedIds.length > 1 ? 'they are' : 'it is'} still referenced by documents`,
					referencedIds
				},
				{ status: 409 }
			);
		}

		const results = { deleted: 0, failed: 0 };

		for (const id of ids) {
			try {
				const result = await assetService.deleteAsset(auth.organizationId, id);
				if (result) {
					results.deleted++;
				} else {
					results.failed++;
				}
			} catch {
				results.failed++;
			}
		}

		return json({ success: true, data: results });
	} catch (error) {
		console.error('Bulk delete failed:', error);
		return json({ success: false, error: 'Bulk delete failed' }, { status: 500 });
	}
};
