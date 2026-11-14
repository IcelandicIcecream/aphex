import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { updateInstanceSettingsRequest } from '../../../api/schemas/instance';
import { cmsLogger } from '../../../utils/logger';
import type { AphexEnv } from '../index';

const UNAUTHORIZED = {
	success: false,
	error: 'Unauthorized',
	message: 'Session authentication required'
};

export const instanceSettingsRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/', async (c) => {
		const auth = c.var.auth;
		if (!auth || auth.type !== 'session') return c.json(UNAUTHORIZED, 401);
		try {
			const data = await c.var.aphexCMS.databaseAdapter.getInstanceSettings();
			return c.json({ success: true, data });
		} catch (error) {
			cmsLogger.error('Failed to fetch instance settings:', error);
			return c.json({ success: false, error: 'Failed to fetch instance settings' }, 500);
		}
	})
	.patch(
		'/',
		zValidator('json', updateInstanceSettingsRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{ success: false, error: 'Invalid request body', issues: result.error.issues },
					400
				);
			}
		}),
		async (c) => {
			const auth = c.var.auth;
			if (!auth || auth.type !== 'session') return c.json(UNAUTHORIZED, 401);
			if (auth.user.role !== 'super_admin') {
				return c.json(
					{
						success: false,
						error: 'Forbidden',
						message: 'Only super admins can update instance settings'
					},
					403
				);
			}
			try {
				const data = await c.var.aphexCMS.databaseAdapter.updateInstanceSettings(
					c.req.valid('json')
				);
				return c.json({ success: true, data });
			} catch (error) {
				cmsLogger.error('Failed to update instance settings:', error);
				return c.json({ success: false, error: 'Failed to update instance settings' }, 500);
			}
		}
	);
