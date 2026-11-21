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
				const { databaseAdapter, rolesService } = c.var.aphexCMS;
				const auth = c.var.auth;

				// A session with no organization yet counts, because this is how it gets one.
				if (!auth || auth.type === 'api_key') {
					return c.json(
						{
							success: false,
							error: 'Unauthorized',
							message: 'Session authentication required'
						},
						401
					);
				}

				const isSuperAdmin = auth.user.role === 'super_admin';
				if (!isSuperAdmin) {
					const { allowUserOrgCreation } = await databaseAdapter.getInstanceSettings();
					if (!allowUserOrgCreation) {
						return c.json(
							{
								success: false,
								error: 'Forbidden',
								message: 'Only super admins can create organizations on this instance'
							},
							403
						);
					}
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

				// Members of a parent organization can reach its children, so a new organization
				// only goes under one when the caller asks for it and administers it. With no
				// parent named it is top-level, for super admins too: defaulting to the active
				// organization put organizations under whatever the caller happened to be in.
				const requestedParent = body.parentOrganizationId;
				if (requestedParent && !isSuperAdmin) {
					const membership = await databaseAdapter.findUserMembership(
						auth.user.id,
						requestedParent
					);
					const capabilities = membership
						? await rolesService.getCapabilities(requestedParent, membership.role)
						: [];
					if (!capabilities.includes('org.settings')) {
						return c.json(
							{
								success: false,
								error: 'Forbidden',
								message: 'You can only add organizations under one you administer'
							},
							403
						);
					}
				}
				if (requestedParent && !(await databaseAdapter.findOrganizationById(requestedParent))) {
					return c.json({ success: false, error: 'Parent organization not found' }, 404);
				}

				const newOrganization = await databaseAdapter.createOrganization({
					name: body.name,
					slug: body.slug,
					metadata: body.metadata || null,
					parentOrganizationId: requestedParent ?? null,
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
