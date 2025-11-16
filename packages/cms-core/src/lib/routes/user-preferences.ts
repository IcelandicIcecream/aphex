// Aphex CMS User Preferences API Handler
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import type { UserSessionPreferences } from '../types/organization';

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
		console.error('Failed to get user preferences:', error);
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

		const body = (await request.json()) as Partial<UserSessionPreferences>;

		// Validate the preferences object
		if (typeof body !== 'object' || body === null) {
			return json(
				{
					success: false,
					error: 'Invalid request body',
					message: 'Expected an object with preference values'
				},
				{ status: 400 }
			);
		}

		// Validate individual preference types
		if (
			body.includeChildOrganizations !== undefined &&
			typeof body.includeChildOrganizations !== 'boolean'
		) {
			return json(
				{
					success: false,
					error: 'Invalid preference value',
					message: 'includeChildOrganizations must be a boolean'
				},
				{ status: 400 }
			);
		}

		// Update preferences
		await databaseAdapter.updateUserPreferences(auth.user.id, body);

		// Get updated profile
		const userProfile = await databaseAdapter.findUserProfileById(auth.user.id);

		return json({
			success: true,
			data: userProfile?.preferences || {}
		});
	} catch (error) {
		console.error('Failed to update user preferences:', error);
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
