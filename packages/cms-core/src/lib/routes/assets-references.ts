import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

/**
 * GET /api/assets/:id/references
 * Find documents that reference a specific asset
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type === 'partial_session') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = params;
		if (!id) {
			return json({ success: false, error: 'Asset ID is required' }, { status: 400 });
		}

		if (!databaseAdapter.findDocumentsReferencingAsset) {
			return json({ success: true, data: { references: [], total: 0 } });
		}

		const references = await databaseAdapter.findDocumentsReferencingAsset(
			auth.organizationId,
			id
		);

		return json({
			success: true,
			data: {
				references,
				total: references.length
			}
		});
	} catch (error) {
		console.error('Failed to find asset references:', error);
		return json(
			{ success: false, error: 'Failed to find asset references' },
			{ status: 500 }
		);
	}
};
