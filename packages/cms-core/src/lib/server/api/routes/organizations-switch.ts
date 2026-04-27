import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import { switchOrganizationRequest } from '../../../api/schemas/organizations';
import type { AphexEnv } from '../index';

export const organizationsSwitchRouter: Hono<AphexEnv> = new Hono<AphexEnv>().post(
	'/switch',
	zValidator('json', switchOrganizationRequest, (result, c) => {
		if (!result.success) {
			return c.json(
				{
					success: false,
					error: 'Missing required field',
					message: 'organizationId is required',
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

			const membership = await databaseAdapter.findUserMembership(
				auth.user.id,
				body.organizationId
			);

			if (!membership) {
				return c.json(
					{
						success: false,
						error: 'Access denied',
						message: 'You are not a member of this organization'
					},
					403
				);
			}

			await databaseAdapter.updateUserSession(auth.user.id, body.organizationId);
			const organization = await databaseAdapter.findOrganizationById(body.organizationId);

			return c.json({
				success: true,
				data: {
					organizationId: body.organizationId,
					organizationName: organization?.name,
					role: membership.role
				}
			});
		} catch (error) {
			cmsLogger.error('Failed to switch organization:', error);
			return c.json(
				{
					success: false,
					error: 'Failed to switch organization',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	}
);
