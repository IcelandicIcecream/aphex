import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import {
	inviteMemberRequest,
	cancelInvitationRequest
} from '../../../api/schemas/organizations';
import { hasCapability } from '../../../types/capabilities';
import type { AphexEnv } from '../index';

/**
 * Note: in studio, invitations are wrapped by a SvelteKit `+server.ts`
 * that adds email sending after the invite row is created. While that
 * shim exists, this Hono router sits dormant (specific SK routes win
 * over the catch-all). Phase 5 moves the wrapper into `config.api`.
 */
export const organizationsInvitationsRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.post(
		'/invitations',
		zValidator('json', inviteMemberRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Invalid request body',
						message: 'email and role are required',
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

				if (!hasCapability(auth, 'member.invite')) {
					return c.json(
						{
							success: false,
							error: 'Forbidden',
							message: 'You do not have permission to invite members'
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

				if (body.email.toLowerCase() === auth.user.email.toLowerCase()) {
					return c.json(
						{
							success: false,
							error: 'Invalid invitation',
							message: 'You cannot invite yourself'
						},
						400
					);
				}

				if (c.var.aphexCMS.auth) {
					const existingUser = await c.var.aphexCMS.auth.getUserByEmail(body.email);
					if (existingUser) {
						const existingMembership = await databaseAdapter.findUserMembership(
							existingUser.id,
							auth.organizationId
						);
						if (existingMembership) {
							return c.json(
								{
									success: false,
									error: 'Already a member',
									message: 'This user is already a member of the organization'
								},
								400
							);
						}
					}
				}

				const existingInvitations = await databaseAdapter.findOrganizationInvitations(
					auth.organizationId
				);
				const pendingInvitation = existingInvitations.find(
					(inv) =>
						inv.email.toLowerCase() === body.email.toLowerCase() && inv.acceptedAt === null
				);

				if (pendingInvitation) {
					return c.json(
						{
							success: false,
							error: 'Already invited',
							message: 'This email has already been invited to the organization'
						},
						400
					);
				}

				const token = crypto.randomUUID();

				const invitation = await databaseAdapter.createInvitation({
					organizationId: auth.organizationId,
					email: body.email.toLowerCase(),
					role: body.role,
					invitedBy: auth.user.id,
					token,
					expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
				});

				return c.json(
					{
						success: true,
						data: invitation,
						message: 'Invitation created successfully.'
					},
					201
				);
			} catch (error) {
				cmsLogger.error('Failed to create invitation:', error);
				return c.json(
					{
						success: false,
						error: 'Failed to create invitation',
						message: error instanceof Error ? error.message : 'Unknown error'
					},
					500
				);
			}
		}
	)
	.delete(
		'/invitations',
		zValidator('json', cancelInvitationRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Missing required field',
						message: 'invitationId is required',
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

				if (!hasCapability(auth, 'member.invite')) {
					return c.json(
						{
							success: false,
							error: 'Forbidden',
							message: 'You do not have permission to cancel invitations'
						},
						403
					);
				}

				const body = c.req.valid('json');

				const deleted = await databaseAdapter.deleteInvitation(body.invitationId, auth.organizationId);

				if (!deleted) {
					return c.json({ success: false, error: 'Invitation not found' }, 404);
				}

				return c.json({ success: true, message: 'Invitation canceled successfully' });
			} catch (error) {
				cmsLogger.error('Failed to cancel invitation:', error);
				return c.json(
					{
						success: false,
						error: 'Failed to cancel invitation',
						message: error instanceof Error ? error.message : 'Unknown error'
					},
					500
				);
			}
		}
	);
