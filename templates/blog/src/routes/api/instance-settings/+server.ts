import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { updateInstanceSettingsRequest } from '@aphexcms/cms-core/api/schemas/instance';

// GET /api/instance-settings — Get instance settings
export const GET: RequestHandler = async ({ locals }) => {
	try {
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type !== 'session') {
			return json(
				{ success: false, error: 'Unauthorized', message: 'Session authentication required' },
				{ status: 401 }
			);
		}

		const settings = await databaseAdapter.getInstanceSettings();
		return json({ success: true, data: settings });
	} catch {
		return json({ success: false, error: 'Failed to fetch instance settings' }, { status: 500 });
	}
};

// PATCH /api/instance-settings — Update instance settings (super_admin only)
export const PATCH: RequestHandler = async ({ request, locals }) => {
	try {
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type !== 'session') {
			return json(
				{ success: false, error: 'Unauthorized', message: 'Session authentication required' },
				{ status: 401 }
			);
		}

		if (auth.user.role !== 'super_admin') {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'Only super admins can update instance settings'
				},
				{ status: 403 }
			);
		}

		const body = await request.json();
		const parsed = updateInstanceSettingsRequest.safeParse(body);
		if (!parsed.success) {
			return json(
				{ success: false, error: 'Invalid request body', issues: parsed.error.issues },
				{ status: 400 }
			);
		}

		const updated = await databaseAdapter.updateInstanceSettings(parsed.data);
		return json({ success: true, data: updated });
	} catch {
		return json({ success: false, error: 'Failed to update instance settings' }, { status: 500 });
	}
};
