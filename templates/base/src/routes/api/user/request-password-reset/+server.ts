import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';

// POST /api/user/request-password-reset - Request password reset
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		if (!body.email) {
			return json(
				{
					success: false,
					error: 'Missing required field',
					message: 'email is required'
				},
				{ status: 400 }
			);
		}

		await auth.api.requestPasswordReset({
			body: {
				email: body.email,
				redirectTo: body.redirectTo
			}
		});

		return json({
			success: true,
			message: 'If an account exists with that email, a password reset link has been sent'
		});
	} catch (error) {
		console.error('Failed to request password reset:', error);
		return json(
			{
				success: false,
				error: 'Failed to request password reset',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
