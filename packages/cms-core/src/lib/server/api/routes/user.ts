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

/** The slice of `AssetService` these helpers need. */
type AvatarAssetService = {
	findAssetById(
		organizationId: string,
		id: string
	): Promise<{ createdBy: string | null; metadata: unknown } | null>;
	deleteAsset(organizationId: string, id: string): Promise<unknown>;
};

/**
 * Is `assetId` an asset this user uploaded as their own avatar?
 *
 * The gate on both pointing the profile field at an asset and deleting the one
 * it used to point at. Both checks read *server-written* facts only:
 *
 * - `createdBy` is stamped from the session by the upload route, so it can't be
 *   forged onto somebody else's asset.
 * - `metadata.system` marks the asset as hidden infrastructure rather than
 *   content, which is what an avatar is.
 *
 * Without this, `image` was simply a string the client chose: an attacker could
 * point their avatar at any asset in the organization and then change it again,
 * and the replace-cleanup below would delete that asset for them — a delete with
 * none of the `asset.delete` capability checks the assets API enforces, usable
 * by any authenticated user including a viewer.
 */
async function isOwnAvatarAsset(
	assetService: AvatarAssetService,
	organizationId: string,
	userId: string,
	assetId: string
): Promise<boolean> {
	const asset = await assetService.findAssetById(organizationId, assetId);
	if (!asset || asset.createdBy !== userId) return false;
	const metadata = asset.metadata;
	return (
		typeof metadata === 'object' &&
		metadata !== null &&
		(metadata as { system?: unknown }).system === true
	);
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
 * Re-checks ownership rather than trusting that the stored value passed the
 * inbound check: rows written before that check existed are still out there.
 *
 * Best-effort by design: the profile field has already moved, so a failure here
 * leaks a file but never leaves a broken avatar. Failing the request would
 * report the leak by making the user's save look broken, which is worse.
 */
async function discardAvatarAsset(
	assetService: AvatarAssetService,
	organizationId: string,
	userId: string,
	image: string
): Promise<void> {
	const id = avatarAssetId(image);
	if (!id) return;
	try {
		if (!(await isOwnAvatarAsset(assetService, organizationId, userId, id))) {
			cmsLogger.warn(
				'[User API] Refusing to delete superseded avatar asset that is not the user’s own:',
				id
			);
			return;
		}
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

					// An avatar may only point at an asset this user uploaded as an avatar.
					// `image` is a free-form string from the client, and the replace
					// cleanup below deletes whatever the *previous* value pointed at — so
					// without this, setting the field to another asset's path and then
					// changing it again is an unauthenticated-by-capability delete of any
					// asset in the organization. Non-asset values (an external provider's
					// URL, or the absolute storage URLs avatars used to use) have no asset
					// of ours behind them and pass through.
					const incomingAssetId = image === null ? null : avatarAssetId(image);
					if (
						incomingAssetId &&
						!(await isOwnAvatarAsset(
							c.var.aphexCMS.assetService,
							auth.organizationId,
							auth.user.id,
							incomingAssetId
						))
					) {
						return c.json(
							{
								success: false,
								error: 'Forbidden',
								message: 'That image is not one of your uploaded avatars'
							},
							403
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
							auth.user.id,
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
