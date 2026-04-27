import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import {
	removeMemberRequest,
	updateMemberRoleRequest
} from '../../../api/schemas/organizations';
import { hasCapability } from '../../../types/capabilities';
import type { AphexEnv } from '../index';

export const organizationsMembersRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/members', async (c) => {
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

			const members = await databaseAdapter.findOrganizationMembers(auth.organizationId);
			return c.json({ success: true, data: members });
		} catch (error) {
			cmsLogger.error('Failed to fetch organization members:', error);
			return c.json(
				{
					success: false,
					error: 'Failed to fetch members',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	})
	.delete(
		'/members',
		zValidator('json', removeMemberRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Missing required field',
						message: 'userId is required',
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

				if (!hasCapability(auth, 'member.remove')) {
					return c.json(
						{
							success: false,
							error: 'Forbidden',
							message: 'You do not have permission to remove members'
						},
						403
					);
				}

				const body = c.req.valid('json');

				if (body.userId === auth.user.id) {
					return c.json(
						{
							success: false,
							error: 'Invalid operation',
							message: 'You cannot remove yourself from the organization'
						},
						400
					);
				}

				const targetMember = await databaseAdapter.findUserMembership(
					body.userId,
					auth.organizationId
				);

				if (!targetMember) {
					return c.json(
						{
							success: false,
							error: 'Member not found',
							message: 'User is not a member of this organization'
						},
						404
					);
				}

				if (auth.organizationRole === 'admin' && targetMember.role === 'owner') {
					return c.json(
						{
							success: false,
							error: 'Forbidden',
							message: 'Admins cannot remove owners'
						},
						403
					);
				}

				const removed = await databaseAdapter.removeMember(auth.organizationId, body.userId);
				if (!removed) {
					return c.json({ success: false, error: 'Failed to remove member' }, 500);
				}

				const userSession = await databaseAdapter.findUserSession(body.userId);
				if (userSession?.activeOrganizationId === auth.organizationId) {
					cmsLogger.debug(
						`[Organizations]: Clearing user session for ${body.userId} - removed from active org ${auth.organizationId}`
					);

					const otherOrgs = await databaseAdapter.findUserOrganizations(body.userId);
					if (otherOrgs.length > 0 && otherOrgs[0]) {
						await databaseAdapter.updateUserSession(
							body.userId,
							otherOrgs[0].organization.id
						);
						cmsLogger.debug(
							`[Organizations]: Set org ${otherOrgs[0].organization.id} as new active org for ${body.userId}`
						);
					} else {
						await databaseAdapter.deleteUserSession(body.userId);
						cmsLogger.debug(
							`[Organizations]: Deleted user session for ${body.userId} - no remaining organizations`
						);
					}
				}

				return c.json({ success: true, message: 'Member removed successfully' });
			} catch (error) {
				cmsLogger.error('Failed to remove member:', error);
				return c.json(
					{
						success: false,
						error: 'Failed to remove member',
						message: error instanceof Error ? error.message : 'Unknown error'
					},
					500
				);
			}
		}
	)
	.patch(
		'/members',
		zValidator('json', updateMemberRoleRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Invalid request body',
						message: 'userId and role are required',
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

				if (!hasCapability(auth, 'member.changeRole')) {
					return c.json(
						{
							success: false,
							error: 'Forbidden',
							message: 'You do not have permission to change member roles'
						},
						403
					);
				}

				const body = c.req.valid('json');

				const roleRow = await databaseAdapter.findRoleByName(auth.organizationId, body.role);
				if (!roleRow) {
					return c.json(
						{
							success: false,
							error: 'Unknown role',
							message: `No role named "${body.role}" in this organization`
						},
						400
					);
				}

				if (body.userId === auth.user.id) {
					return c.json(
						{
							success: false,
							error: 'Invalid operation',
							message: 'You cannot change your own role'
						},
						400
					);
				}

				const targetMember = await databaseAdapter.findUserMembership(
					body.userId,
					auth.organizationId
				);

				if (!targetMember) {
					return c.json(
						{
							success: false,
							error: 'Member not found',
							message: 'User is not a member of this organization'
						},
						404
					);
				}

				if (auth.organizationRole === 'admin' && targetMember.role === 'owner') {
					return c.json(
						{
							success: false,
							error: 'Forbidden',
							message: 'Admins cannot modify owner roles'
						},
						403
					);
				}

				const updatedMember = await databaseAdapter.updateMemberRole(
					auth.organizationId,
					body.userId,
					body.role
				);

				if (!updatedMember) {
					return c.json({ success: false, error: 'Failed to update role' }, 500);
				}

				return c.json({ success: true, data: updatedMember });
			} catch (error) {
				cmsLogger.error('Failed to update member role:', error);
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
	);
