import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { authProvider } from '$lib/server/auth';

// POST /api/user/reset-password - Reset password with token
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		if (!body.token || !body.newPassword) {
			return json(
				{
					success: false,
					error: 'Missing required fields',
					message: 'token and newPassword are required'
				},
				{ status: 400 }
			);
		}

		await authProvider.resetPassword(body.token, body.newPassword);

		return json({
			success: true,
			message: 'Password reset successfully'
		});
	} catch (error) {
		console.error('Failed to reset password:', error);
		return json(
			{
				success: false,
				error: 'Failed to reset password',
				message: error instanceof Error ? error.message : 'Invalid or expired token'
			},
			{ status: 500 }
		);
	}
};
