import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import { updateUserPreferencesRequest } from '../../../api/schemas/user';
import type { AphexEnv } from '../index';

export const userPreferencesRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/preferences', async (c) => {
		try {
			const { databaseAdapter } = c.var.aphexCMS;
			const auth = c.var.auth;

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

			const userProfile = await databaseAdapter.findUserProfileById(auth.user.id);

			return c.json({ success: true, data: userProfile?.preferences || {} });
		} catch (error) {
			cmsLogger.error('Failed to get user preferences:', error);
			return c.json(
				{
					success: false,
					error: 'Failed to get user preferences',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	})
	.patch(
		'/preferences',
		zValidator('json', updateUserPreferencesRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Invalid request body',
						message: 'Invalid preference values',
						issues: result.error.issues
					},
					400
				);
			}
		}),
		async (c) => {
			try {
				const { databaseAdapter } = c.var.aphexCMS;
				const auth = c.var.auth;

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

				const body = c.req.valid('json');

				await databaseAdapter.updateUserPreferences(auth.user.id, body);

				const userProfile = await databaseAdapter.findUserProfileById(auth.user.id);

				return c.json({ success: true, data: userProfile?.preferences || {} });
			} catch (error) {
				cmsLogger.error('Failed to update user preferences:', error);
				return c.json(
					{
						success: false,
						error: 'Failed to update user preferences',
						message: error instanceof Error ? error.message : 'Unknown error'
					},
					500
				);
			}
		}
	);
