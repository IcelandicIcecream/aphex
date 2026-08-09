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
/**
 * Avatars are stored as the CDN path `/media/<assetId>/<filename>`, which is what
 * makes the underlying asset recoverable from the profile field. Anything else —
 * an absolute storage URL from before this format, or an external provider's
 * avatar — has no asset of ours behind it and is left alone.
 */
function avatarAssetId(image: string): string | null {
	return /^\/media\/([^/]+)\//.exec(image)?.[1] ?? null;
}

/**
 * Delete the asset behind a superseded avatar.
 *
 * Server-side rather than in the client for two reasons. The `asset.delete`
 * capability gates the assets API, so a viewer replacing their own avatar could
 * never clean up after themselves — their old pictures would accumulate forever.
 * And doing it here means every caller of this route inherits the behaviour
 * instead of each one remembering to orchestrate it.
 *
 * Best-effort by design: the profile field has already moved, so a failure here
 * leaks a file but never leaves a broken avatar. Failing the request would
 * report the leak by making the user's save look broken, which is worse.
 */
async function discardAvatarAsset(
	assetService: { deleteAsset(organizationId: string, id: string): Promise<unknown> },
	organizationId: string,
	image: string
): Promise<void> {
	const id = avatarAssetId(image);
	if (!id) return;
	try {
		await assetService.deleteAsset(organizationId, id);
	} catch (error) {
		cmsLogger.warn('[User API] Could not delete superseded avatar asset:', error);
	}
}

export const userRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.patch(
		'/',
		zValidator('json', updateUserRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Invalid request body',
						message: 'name or image is required',
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

				const { name, image } = c.req.valid('json');
				if (name !== undefined) {
					await provider.changeUserName(auth.user.id, name);
				}
				if (image !== undefined) {
					if (!provider.changeUserImage) {
						return c.json(
							{
								success: false,
								error: 'Auth provider does not support profile image updates'
							},
							500
						);
					}

					// Read the outgoing avatar before overwriting the field — once it's
					// gone the asset is unreachable, and an avatar nothing points at is
					// personal data with no way left to find or erase it.
					const current = await provider.getUserById(auth.user.id);
					await provider.changeUserImage(auth.user.id, image);
					if (current?.image && current.image !== image) {
						await discardAvatarAsset(
							c.var.aphexCMS.assetService,
							auth.organizationId,
							current.image
						);
					}
				}

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
