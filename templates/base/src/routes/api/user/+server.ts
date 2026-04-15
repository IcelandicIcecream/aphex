import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { authProvider } from '$lib/server/auth';
import { updateUserRequest } from '@aphexcms/cms-core/api/schemas/user';

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

		const rawBody = await request.json();
		const parsed = updateUserRequest.safeParse(rawBody);
		if (!parsed.success) {
			return json(
				{
					success: false,
					error: 'Invalid request body',
					message: 'name is required',
					issues: parsed.error.issues
				},
				{ status: 400 }
			);
		}

		// Update user via authProvider
		await authProvider.changeUserName(auth.user.id, parsed.data.name);

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
