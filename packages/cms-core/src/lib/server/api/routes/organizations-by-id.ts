import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import { updateOrganizationRequest } from '../../../api/schemas/organizations';
import { hasCapability } from '../../../types/capabilities';
import type { AphexEnv } from '../index';

export const organizationsByIdRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/:id', async (c) => {
		try {
			const { databaseAdapter } = c.var.aphexCMS;
			const auth = c.var.auth;
			const id = c.req.param('id');

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

			if (!id) {
				return c.json(
					{
						success: false,
						error: 'Missing required field',
						message: 'Organization ID is required'
					},
					400
				);
			}

			const membership = await databaseAdapter.findUserMembership(auth.user.id, id);
			if (!membership) {
				return c.json(
					{
						success: false,
						error: 'Forbidden',
						message: 'You are not a member of this organization'
					},
					403
				);
			}

			const organization = await databaseAdapter.findOrganizationById(id);
			if (!organization) {
				return c.json({ success: false, error: 'Organization not found' }, 404);
			}

			return c.json({ success: true, data: organization });
		} catch (error) {
			cmsLogger.error('Failed to fetch organization:', error);
			return c.json(
				{
					success: false,
					error: 'Failed to fetch organization',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	})
	.patch(
		'/:id',
		zValidator('json', updateOrganizationRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Invalid request body',
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
				const id = c.req.param('id');

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

				if (!id) {
					return c.json(
						{
							success: false,
							error: 'Missing required field',
							message: 'Organization ID is required'
						},
						400
					);
				}

				const membership = await databaseAdapter.findUserMembership(auth.user.id, id);
				if (!membership || !hasCapability(auth, 'org.settings')) {
					return c.json(
						{
							success: false,
							error: 'Forbidden',
							message: 'You do not have permission to update organization settings'
						},
						403
					);
				}

				const body = c.req.valid('json');

				if (body.slug) {
					const existingOrg = await databaseAdapter.findOrganizationBySlug(body.slug);
					if (existingOrg && existingOrg.id !== id) {
						return c.json(
							{
								success: false,
								error: 'Slug already exists',
								message: `Organization with slug '${body.slug}' already exists`
							},
							409
						);
					}
				}

				const updateData: {
					name?: string;
					slug?: string;
					metadata?: any;
				} = {};
				if (body.name !== undefined) updateData.name = body.name;
				if (body.slug !== undefined) updateData.slug = body.slug;
				if (body.metadata !== undefined) updateData.metadata = body.metadata;

				const updatedOrganization = await databaseAdapter.updateOrganization(id, updateData);
				if (!updatedOrganization) {
					return c.json({ success: false, error: 'Organization not found' }, 404);
				}

				return c.json({ success: true, data: updatedOrganization });
			} catch (error) {
				cmsLogger.error('Failed to update organization:', error);
				return c.json(
					{
						success: false,
						error: 'Failed to update organization',
						message: error instanceof Error ? error.message : 'Unknown error'
					},
					500
				);
			}
		}
	)
	.delete('/:id', async (c) => {
		try {
			const { databaseAdapter } = c.var.aphexCMS;
			const auth = c.var.auth;
			const id = c.req.param('id');

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

			if (!id) {
				return c.json(
					{
						success: false,
						error: 'Missing required field',
						message: 'Organization ID is required'
					},
					400
				);
			}

			const membership = await databaseAdapter.findUserMembership(auth.user.id, id);
			if (!membership || membership.role !== 'owner') {
				return c.json(
					{
						success: false,
						error: 'Forbidden',
						message: 'Only owners can delete an organization'
					},
					403
				);
			}

			const members = await databaseAdapter.findOrganizationMembers(id);
			for (const member of members) {
				const userSession = await databaseAdapter.findUserSession(member.userId);
				if (userSession?.activeOrganizationId === id) {
					const otherOrgs = await databaseAdapter.findUserOrganizations(member.userId);
					const remainingOrgs = otherOrgs.filter((org) => org.organization.id !== id);

					if (remainingOrgs.length > 0 && remainingOrgs[0]) {
						await databaseAdapter.updateUserSession(
							member.userId,
							remainingOrgs[0].organization.id
						);
					} else {
						await databaseAdapter.deleteUserSession(member.userId);
					}
				}
			}

			await databaseAdapter.removeAllMembers(id);
			await databaseAdapter.removeAllInvitations(id);
			await databaseAdapter.deleteOrganization(id);

			return c.json({ success: true, message: 'Organization deleted successfully' });
		} catch (error) {
			cmsLogger.error('Failed to delete organization:', error);
			return c.json(
				{
					success: false,
					error: 'Failed to delete organization',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	});
