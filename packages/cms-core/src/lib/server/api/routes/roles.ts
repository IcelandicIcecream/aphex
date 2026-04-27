import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import { hasCapability, BUILTIN_ROLE_NAMES } from '../../../types/capabilities';
import { createRoleRequest, updateRoleRequest } from '../../../api/schemas/roles';
import type { AphexEnv } from '../index';

/**
 * Roles router. Combines `/roles` (list, create) and `/roles/:name`
 * (update, delete) so the wire URLs are
 * `/api/roles` and `/api/roles/:name`.
 *
 * Note: built-in role names cannot be deleted; they're seeded on every
 * org and a custom row with the same name would be unreachable.
 */
export const rolesRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/', async (c) => {
		try {
			const { rolesService } = c.var.aphexCMS;
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

			const roles = await rolesService.listRoles(auth.organizationId);
			return c.json({ success: true, data: roles });
		} catch (error) {
			cmsLogger.error('Failed to list roles:', error);
			return c.json(
				{
					success: false,
					error: 'Failed to list roles',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	})
	.post(
		'/',
		zValidator('json', createRoleRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Invalid request body',
						message: 'name and capabilities are required',
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

				if (!hasCapability(auth, 'role.manage')) {
					return c.json(
						{
							success: false,
							error: 'Forbidden',
							message: 'You do not have permission to manage roles'
						},
						403
					);
				}

				const body = c.req.valid('json');

				if ((BUILTIN_ROLE_NAMES as readonly string[]).includes(body.name)) {
					return c.json(
						{
							success: false,
							error: 'Reserved name',
							message: `"${body.name}" is a built-in role name. Edit the existing role instead.`
						},
						409
					);
				}

				const existing = await databaseAdapter.findRoleByName(auth.organizationId, body.name);
				if (existing) {
					return c.json(
						{
							success: false,
							error: 'Conflict',
							message: `A role named "${body.name}" already exists in this organization.`
						},
						409
					);
				}

				const role = await databaseAdapter.createRole({
					organizationId: auth.organizationId,
					name: body.name,
					description: body.description ?? null,
					capabilities: body.capabilities,
					isBuiltIn: false
				});

				await rolesService.invalidate(auth.organizationId, body.name);

				return c.json({ success: true, data: role }, 201);
			} catch (error) {
				cmsLogger.error('Failed to create role:', error);
				return c.json(
					{
						success: false,
						error: 'Failed to create role',
						message: error instanceof Error ? error.message : 'Unknown error'
					},
					500
				);
			}
		}
	)
	.patch(
		'/:name',
		zValidator('json', updateRoleRequest, (result, c) => {
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

				if (!hasCapability(auth, 'role.manage')) {
					return c.json(
						{
							success: false,
							error: 'Forbidden',
							message: 'You do not have permission to manage roles'
						},
						403
					);
				}

				const name = c.req.param('name');
				if (!name) {
					return c.json(
						{
							success: false,
							error: 'Invalid request',
							message: 'Role name is required'
						},
						400
					);
				}

				const body = c.req.valid('json');

				const updated = await databaseAdapter.updateRole(auth.organizationId, name, body);
				if (!updated) {
					return c.json(
						{
							success: false,
							error: 'Not found',
							message: `No role named "${name}" in this organization`
						},
						404
					);
				}

				await rolesService.invalidate(auth.organizationId, name);
				return c.json({ success: true, data: updated });
			} catch (error) {
				cmsLogger.error('Failed to update role:', error);
				return c.json(
					{
						success: false,
						error: 'Failed to update role',
						message: error instanceof Error ? error.message : 'Unknown error'
					},
					500
				);
			}
		}
	)
	.delete('/:name', async (c) => {
		try {
			const { databaseAdapter, rolesService } = c.var.aphexCMS;
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

			if (!hasCapability(auth, 'role.manage')) {
				return c.json(
					{
						success: false,
						error: 'Forbidden',
						message: 'You do not have permission to manage roles'
					},
					403
				);
			}

			const name = c.req.param('name');
			if (!name) {
				return c.json(
					{
						success: false,
						error: 'Invalid request',
						message: 'Role name is required'
					},
					400
				);
			}

			if ((BUILTIN_ROLE_NAMES as readonly string[]).includes(name)) {
				return c.json(
					{
						success: false,
						error: 'Forbidden',
						message: `"${name}" is a built-in role and cannot be deleted.`
					},
					403
				);
			}

			const members = await databaseAdapter.findOrganizationMembers(auth.organizationId);
			const inUseByMember = members.some((m) => m.role === name);
			const invitations = await databaseAdapter.findOrganizationInvitations(auth.organizationId);
			const inUseByInvitation = invitations.some((i) => i.role === name && !i.acceptedAt);

			if (inUseByMember || inUseByInvitation) {
				return c.json(
					{
						success: false,
						error: 'Role in use',
						message: `Cannot delete "${name}": reassign affected members or invitations first.`
					},
					409
				);
			}

			const deleted = await databaseAdapter.deleteRole(auth.organizationId, name);
			if (!deleted) {
				return c.json(
					{
						success: false,
						error: 'Not found',
						message: `No role named "${name}" in this organization`
					},
					404
				);
			}

			await rolesService.invalidate(auth.organizationId, name);
			return c.json({ success: true, message: 'Role deleted' });
		} catch (error) {
			cmsLogger.error('Failed to delete role:', error);
			return c.json(
				{
					success: false,
					error: 'Failed to delete role',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	});
