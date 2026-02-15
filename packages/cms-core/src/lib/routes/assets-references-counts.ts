import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

/**
 * POST /api/assets/references/counts
 * Get reference counts for multiple asset IDs in batch
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type === 'partial_session') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { ids } = await request.json();

		if (!Array.isArray(ids) || ids.length === 0) {
			return json({ success: true, data: {} });
		}

		if (!databaseAdapter.countDocumentReferencesForAssets) {
			const counts: Record<string, number> = {};
			for (const id of ids) counts[id] = 0;
			return json({ success: true, data: counts });
		}

		const counts = await databaseAdapter.countDocumentReferencesForAssets(
			auth.organizationId,
			ids
		);

		return json({ success: true, data: counts });
	} catch (error) {
		console.error('Failed to count asset references:', error);
		return json(
			{ success: false, error: 'Failed to count asset references' },
			{ status: 500 }
		);
	}
};
