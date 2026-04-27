import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import {
	updateUserRequest,
	requestPasswordResetRequest,
	resetPasswordRequest
} from '../../../api/schemas/user';
import type { AphexEnv } from '../index';

/**
 * User account routes that delegate to the configured AuthProvider.
 *
 * cms-core ships these as Hono routers so studio doesn't need to maintain
 * SvelteKit `+server.ts` files for them. The wire format and side effects
 * (e.g. the password-reset email) are owned by the AuthProvider impl —
 * cms-core's role is just to expose them over HTTP.
 */
export const userRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.patch(
		'/',
		zValidator('json', updateUserRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Invalid request body',
						message: 'name is required',
						issues: result.error.issues
					},
					400
				);
			}
		}),
		async (c) => {
			try {
				const auth = c.var.auth;
				const provider = c.var.aphexCMS.auth;

				if (!auth || auth.type !== 'session') {
					return c.json(
						{
							success: false,
							error: 'Unauthorized',
							message: 'Session authentication required'
						},
						401
					);
				}

				if (!provider) {
					return c.json(
						{
							success: false,
							error: 'Auth provider not configured'
						},
						500
					);
				}

				const { name } = c.req.valid('json');
				await provider.changeUserName(auth.user.id, name);

				return c.json({ success: true, message: 'User updated successfully' });
			} catch (error) {
				cmsLogger.error('Failed to update user:', error);
				return c.json(
					{
						success: false,
						error: 'Failed to update user',
						message: error instanceof Error ? error.message : 'Unknown error'
					},
					500
				);
			}
		}
	)
	.post(
		'/request-password-reset',
		zValidator('json', requestPasswordResetRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Missing required field',
						message: 'email is required',
						issues: result.error.issues
					},
					400
				);
			}
		}),
		async (c) => {
			try {
				const provider = c.var.aphexCMS.auth;
				if (!provider) {
					return c.json({ success: false, error: 'Auth provider not configured' }, 500);
				}

				const { email, redirectTo } = c.req.valid('json');
				await provider.requestPasswordReset(email, redirectTo);

				// Constant response shape regardless of whether the email exists,
				// to avoid account enumeration via the API.
				return c.json({
					success: true,
					message: 'If an account exists with that email, a password reset link has been sent'
				});
			} catch (error) {
				cmsLogger.error('Failed to request password reset:', error);
				return c.json(
					{
						success: false,
						error: 'Failed to request password reset',
						message: error instanceof Error ? error.message : 'Unknown error'
					},
					500
				);
			}
		}
	)
	.post(
		'/reset-password',
		zValidator('json', resetPasswordRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Missing required fields',
						message: 'token and newPassword are required',
						issues: result.error.issues
					},
					400
				);
			}
		}),
		async (c) => {
			try {
				const provider = c.var.aphexCMS.auth;
				if (!provider) {
					return c.json({ success: false, error: 'Auth provider not configured' }, 500);
				}

				const { token, newPassword } = c.req.valid('json');
				await provider.resetPassword(token, newPassword);

				return c.json({ success: true, message: 'Password reset successfully' });
			} catch (error) {
				cmsLogger.error('Failed to reset password:', error);
				return c.json(
					{
						success: false,
						error: 'Failed to reset password',
						message: error instanceof Error ? error.message : 'Invalid or expired token'
					},
					500
				);
			}
		}
	);
