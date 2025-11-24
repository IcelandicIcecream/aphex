import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { authProvider } from '$lib/server/auth';

// PATCH /api/user - Update current user's profile
export const PATCH: RequestHandler = async ({ request, locals }) => {
	try {
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

		const body = await request.json();

		// Validate: only allow updating name for now
		if (body.name === undefined) {
			return json(
				{
					success: false,
					error: 'Missing required field',
					message: 'name is required'
				},
				{ status: 400 }
			);
		}

		// Update user via authProvider
		await authProvider.changeUserName(auth.user.id, body.name);

		return json({
			success: true,
			message: 'User updated successfully'
		});
	} catch (error) {
		console.error('Failed to update user:', error);
		return json(
			{
				success: false,
				error: 'Failed to update user',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
