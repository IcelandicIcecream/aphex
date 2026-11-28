import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createApiKeyRequest } from '../../../api/schemas/api-keys';
import { hasCapability } from '../../../types/capabilities';
import { cmsLogger } from '../../../utils/logger';
import type { AphexEnv } from '../index';

const UNAUTHORIZED = {
	success: false,
	error: 'Unauthorized',
	message: 'Session authentication required'
};

/**
 * The row is gone but a cached copy survived, so the key may still authenticate. This
 * is matched on its code because the error comes from the auth provider's package,
 * which can load its own copy of any class (see `isAuthError`).
 */
function isIncompleteRevocation(error: unknown): error is Error {
	return (
		error instanceof Error && 'code' in error && error.code === 'API_KEY_REVOCATION_INCOMPLETE'
	);
}

export const apiKeysRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/', async (c) => {
		const auth = c.var.auth;
		if (!auth || auth.type !== 'session') return c.json(UNAUTHORIZED, 401);
		try {
			const data = (await c.var.aphexCMS.auth?.listApiKeys?.(auth.user.id)) ?? [];
			return c.json({ success: true, data });
		} catch (error) {
			cmsLogger.error('Failed to fetch API keys:', error);
			return c.json({ success: false, error: 'Failed to fetch API keys' }, 500);
		}
	})
	.post(
		'/',
		zValidator('json', createApiKeyRequest, (result, c) => {
			if (!result.success) {
				return c.json({ success: false, error: 'Invalid input', issues: result.error.issues }, 400);
			}
		}),
		async (c) => {
			const auth = c.var.auth;
			if (!auth || auth.type !== 'session') return c.json(UNAUTHORIZED, 401);
			if (!hasCapability(auth, 'apiKey.manage')) {
				return c.json(
					{
						success: false,
						error: 'Forbidden',
						message: 'You do not have permission to create API keys'
					},
					403
				);
			}

			const createApiKey = c.var.aphexCMS.auth?.createApiKey;
			if (!createApiKey) {
				return c.json(
					{ success: false, error: 'API keys are not supported by this auth provider' },
					501
				);
			}

			try {
				const apiKey = await createApiKey(auth.user.id, auth.organizationId, c.req.valid('json'));
				return c.json({ success: true, data: { apiKey } });
			} catch (error) {
				cmsLogger.error('Failed to create API key:', error);
				return c.json({ success: false, error: 'Failed to create API key' }, 500);
			}
		}
	)
	.delete('/:id', async (c) => {
		const auth = c.var.auth;
		if (!auth || auth.type !== 'session') return c.json(UNAUTHORIZED, 401);
		if (!hasCapability(auth, 'apiKey.manage')) {
			return c.json(
				{
					success: false,
					error: 'Forbidden',
					message: 'You do not have permission to delete API keys'
				},
				403
			);
		}

		try {
			// The provider scopes this to the caller, so another account's key id does nothing.
			const deleted = await c.var.aphexCMS.auth?.deleteApiKey?.(auth.user.id, c.req.param('id'));
			if (deleted) return c.json({ success: true });
			return c.json({ success: false, error: 'Failed to delete API key' }, 500);
		} catch (error) {
			// Not "failed to delete": that implies retrying helps, and this needs a cache flush.
			if (isIncompleteRevocation(error)) {
				cmsLogger.error('Incomplete API key revocation:', error);
				return c.json(
					{ success: false, error: 'Revocation incomplete', message: error.message },
					500
				);
			}
			cmsLogger.error('Failed to delete API key:', error);
			return c.json({ success: false, error: 'Failed to delete API key' }, 500);
		}
	});
