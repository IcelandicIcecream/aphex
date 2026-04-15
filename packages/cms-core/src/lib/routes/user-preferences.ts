// Aphex CMS User Preferences API Handler
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { cmsLogger } from '../utils/logger';
import { updateUserPreferencesRequest } from '../api/schemas/user';

// GET /api/user/preferences - Get user preferences
export const GET: RequestHandler = async ({ locals }) => {
	try {
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type !== 'session') {
			return json(
				{
					success: false,
					error: 'Unauthorized',
					message: 'Session authentication required'
				},
				{ status: 401 }
			);
		}

		const userProfile = await databaseAdapter.findUserProfileById(auth.user.id);

		return json({
			success: true,
			data: userProfile?.preferences || {}
		});
	} catch (error) {
		cmsLogger.error('Failed to get user preferences:', error);
		return json(
			{
				success: false,
				error: 'Failed to get user preferences',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// PATCH /api/user/preferences - Update user preferences (partial update)
export const PATCH: RequestHandler = async ({ request, locals }) => {
	try {
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type !== 'session') {
			return json(
				{
					success: false,
					error: 'Unauthorized',
					message: 'Session authentication required'
				},
				{ status: 401 }
			);
		}

		const rawBody = await request.json();
		const parsed = updateUserPreferencesRequest.safeParse(rawBody);
		if (!parsed.success) {
			return json(
				{
					success: false,
					error: 'Invalid request body',
					message: 'Invalid preference values',
					issues: parsed.error.issues
				},
				{ status: 400 }
			);
		}
		const body = parsed.data;

		// Update preferences
		await databaseAdapter.updateUserPreferences(auth.user.id, body);

		// Get updated profile
		const userProfile = await databaseAdapter.findUserProfileById(auth.user.id);

		return json({
			success: true,
			data: userProfile?.preferences || {}
		});
	} catch (error) {
		cmsLogger.error('Failed to update user preferences:', error);
		return json(
			{
				success: false,
				error: 'Failed to update user preferences',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
