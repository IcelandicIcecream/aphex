import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import { createOrganizationRequest } from '../../../api/schemas/organizations';
import type { AphexEnv } from '../index';

export const organizationsRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/', async (c) => {
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

			const memberships = await databaseAdapter.findUserOrganizations(auth.user.id);
			const organizations = memberships.map((m) => ({
				id: m.organization.id,
				name: m.organization.name,
				slug: m.organization.slug,
				metadata: m.organization.metadata,
				role: m.member.role,
				joinedAt: m.member.createdAt,
				isActive: m.organization.id === auth.organizationId
			}));

			return c.json({ success: true, data: organizations });
		} catch (error) {
			cmsLogger.error('Failed to fetch organizations:', error);
			return c.json(
				{
					success: false,
					error: 'Failed to fetch organizations',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	})
	.post(
		'/',
		zValidator('json', createOrganizationRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Invalid request body',
						message: 'Organization name and slug are required',
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

				if (auth.user.role !== 'super_admin') {
					return c.json(
						{
							success: false,
							error: 'Forbidden',
							message: 'Only super admins can create organizations'
						},
						403
					);
				}

				const body = c.req.valid('json');

				const existingOrg = await databaseAdapter.findOrganizationBySlug(body.slug);
				if (existingOrg) {
					return c.json(
						{
							success: false,
							error: 'Slug already exists',
							message: `Organization with slug '${body.slug}' already exists`
						},
						409
					);
				}

				const newOrganization = await databaseAdapter.createOrganization({
					name: body.name,
					slug: body.slug,
					metadata: body.metadata || null,
					parentOrganizationId: auth.organizationId,
					createdBy: auth.user.id
				});

				// Seed with the install's full capability set (core + plugin-declared), the
				// same one the boot reconcile uses — otherwise a brand-new org's owner would
				// be missing every capability its plugins declare until the next restart.
				await databaseAdapter.seedBuiltinRoles(
					newOrganization.id,
					c.var.aphexCMS.cmsEngine.ownerCapabilities()
				);
				await databaseAdapter.addMember({
					organizationId: newOrganization.id,
					userId: auth.user.id,
					role: 'owner'
				});
				await databaseAdapter.updateUserSession(auth.user.id, newOrganization.id);

				return c.json({ success: true, data: newOrganization }, 201);
			} catch (error) {
				cmsLogger.error('Failed to create organization:', error);
				return c.json(
					{
						success: false,
						error: 'Failed to create organization',
						message: error instanceof Error ? error.message : 'Unknown error'
					},
					500
				);
			}
		}
	);
