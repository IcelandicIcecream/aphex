import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { latestPasswordResetUrl } from '$lib/server/auth/better-auth/instance';

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

		const { auth } = await import('$lib/server/auth');
		await auth.api.requestPasswordReset({
			body: {
				email: body.email,
				redirectTo: body.redirectTo
			}
		});

		// In development, return the reset URL
		const response: any = {
			success: true,
			message: 'If an account exists with that email, a password reset link has been sent'
		};

		// For development: include the reset URL so we can show it in the UI
		if (process.env.NODE_ENV === 'development' && latestPasswordResetUrl) {
			response.resetUrl = latestPasswordResetUrl;
		}

		return json(response);
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
