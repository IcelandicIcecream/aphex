import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import {
	setOrganizationCapabilitiesRequest,
	updateOrganizationRequest
} from '../../../api/schemas/organizations';
import { grantedOrganizationCapabilities } from '../../../auth/organization-capabilities';
import { eraseOrganization, isDeletionBlocked } from '../../../auth/erase';
import { isInstanceRole } from '../../../types/capabilities';
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
	// A super admin turns an organization's features on or off (God Mode). Only where
	// the config can store them (`organizationCapabilities.set`); an organization's
	// own owner never can, or they could give themselves a paid feature.
	.put(
		'/:id/capabilities',
		zValidator('json', setOrganizationCapabilitiesRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{ success: false, error: 'Invalid request body', issues: result.error.issues },
					400
				);
			}
		}),
		async (c) => {
			const auth = c.var.auth;
			if (!auth || auth.type !== 'session') {
				return c.json(
					{ success: false, error: 'Unauthorized', message: 'Session authentication required' },
					401
				);
			}
			if (auth.user.role !== 'super_admin') {
				return c.json(
					{
						success: false,
						error: 'Forbidden',
						message: "Only super admins can change an organization's features"
					},
					403
				);
			}
			const { config, databaseAdapter } = c.var.aphexCMS;
			const declared = config.organizationCapabilities;
			if (!declared?.set) {
				return c.json(
					{
						success: false,
						error: 'Not supported',
						message:
							'organizationCapabilities.set is not configured, so features are decided elsewhere'
					},
					404
				);
			}
			const id = c.req.param('id');
			if (!(await databaseAdapter.findOrganizationById(id))) {
				return c.json({ success: false, error: 'Organization not found' }, 404);
			}
			const ids = [...new Set(c.req.valid('json').capabilities)];
			const known = new Set(declared.ids);
			const unknown = ids.filter((capability) => !known.has(capability));
			if (unknown.length > 0) {
				return c.json(
					{
						success: false,
						error: 'Unknown capability',
						message: `Not in organizationCapabilities.ids: ${unknown.join(', ')}`
					},
					400
				);
			}
			try {
				await declared.set({ organizationId: id, ids, databaseAdapter });
				const capabilities = await grantedOrganizationCapabilities(declared, id, databaseAdapter);
				return c.json({ success: true, data: { capabilities } });
			} catch (error) {
				cmsLogger.error('Failed to set organization capabilities:', error);
				return c.json({ success: false, error: "Failed to save the organization's features" }, 500);
			}
		}
	)
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
				const { databaseAdapter, rolesService } = c.var.aphexCMS;
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

				// Capabilities have to be evaluated against the *target* organization.
				// `auth.capabilities` is resolved once per request for the caller's
				// **active** org, so checking it here let an admin in org A who is only a
				// viewer in org B edit B's settings simply by leaving A active.
				// Instance roles still override — they hold every capability everywhere.
				let canEditSettings = isInstanceRole(auth);
				if (membership && !canEditSettings) {
					const targetCapabilities = await rolesService.getCapabilities(id, membership.role);
					canEditSettings = targetCapabilities.includes('org.settings');
				}

				if (!membership || !canEditSettings) {
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

				// The app's own rules for a name (blocked words), the same as at creation.
				// Saving the name unchanged isn't a rename, as with the slug below.
				const checkName = c.var.aphexCMS.config?.checkOrganizationName;
				if (body.name !== undefined && checkName) {
					const current = await databaseAdapter.findOrganizationById(id);
					if (body.name !== current?.name) {
						const nameProblem = await checkName(body.name, { organizationId: id });
						if (nameProblem) {
							return c.json({ success: false, error: 'Invalid name', message: nameProblem }, 400);
						}
					}
				}

				// The app's own rules for a slug (its address format, reserved names), the
				// same as at creation. Saving the name alone, or the slug unchanged, isn't
				// a rename: an organization keeps a slug made before a rule existed.
				const checkSlug = c.var.aphexCMS.config?.checkOrganizationSlug;
				if (body.slug !== undefined && checkSlug) {
					const current = await databaseAdapter.findOrganizationById(id);
					if (body.slug !== current?.slug) {
						const slugProblem = await checkSlug(body.slug, { organizationId: id });
						if (slugProblem) {
							return c.json({ success: false, error: 'Invalid slug', message: slugProblem }, 400);
						}
					}
				}

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

			// Its owner, or whoever runs the instance (God Mode).
			const membership = await databaseAdapter.findUserMembership(auth.user.id, id);
			if (membership?.role !== 'owner' && auth.user.role !== 'super_admin') {
				return c.json(
					{
						success: false,
						error: 'Forbidden',
						message: 'Only owners can delete an organization'
					},
					403
				);
			}

			if (!(await databaseAdapter.findOrganizationById(id))) {
				return c.json({ success: false, error: 'Organization not found' }, 404);
			}

			try {
				await eraseOrganization(c.var.aphexCMS, { organizationId: id, actorId: auth.user.id });
			} catch (error) {
				if (!isDeletionBlocked(error)) throw error;
				return c.json(
					{ success: false, error: 'Could not delete organization', message: error.message },
					409
				);
			}

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
