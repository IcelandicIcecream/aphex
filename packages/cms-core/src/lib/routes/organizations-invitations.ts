// Aphex CMS Organization Invitations API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { cmsLogger } from '../utils/logger';
import { inviteMemberRequest, cancelInvitationRequest } from '../api/schemas/organizations';
import { hasCapability } from '../types/capabilities';

// POST /api/organizations/invitations - Create/send an invitation
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type !== 'session') {
			return json(
				{
					success: false,
					error: 'Unauthorized',
					message: 'Session authentication required'
				},
				{ status: 401 }
			);
		}

		if (!hasCapability(auth, 'member.invite')) {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'You do not have permission to invite members'
				},
				{ status: 403 }
			);
		}

		const rawBody = await request.json();
		const parsed = inviteMemberRequest.safeParse(rawBody);
		if (!parsed.success) {
			return json(
				{
					success: false,
					error: 'Invalid request body',
					message: 'email and role are required',
					issues: parsed.error.issues
				},
				{ status: 400 }
			);
		}
		const body = parsed.data;

		// Verify the role exists in this organization. Defends against
		// clients sending a role name that was deleted between page load
		// and submit, or against typos slipping past the format regex.
		const roleRow = await databaseAdapter.findRoleByName(auth.organizationId, body.role);
		if (!roleRow) {
			return json(
				{
					success: false,
					error: 'Unknown role',
					message: `No role named "${body.role}" in this organization`
				},
				{ status: 400 }
			);
		}

		// Reject self-invitation
		if (body.email.toLowerCase() === auth.user.email.toLowerCase()) {
			return json(
				{
					success: false,
					error: 'Invalid invitation',
					message: 'You cannot invite yourself'
				},
				{ status: 400 }
			);
		}

		// Reject if the invitee is already a member of the organization
		if (locals.aphexCMS.auth) {
			const existingUser = await locals.aphexCMS.auth.getUserByEmail(body.email);
			if (existingUser) {
				const existingMembership = await databaseAdapter.findUserMembership(
					existingUser.id,
					auth.organizationId
				);
				if (existingMembership) {
					return json(
						{
							success: false,
							error: 'Already a member',
							message: 'This user is already a member of the organization'
						},
						{ status: 400 }
					);
				}
			}
		}

		// Check if there's already a pending invitation for this email
		const existingInvitations = await databaseAdapter.findOrganizationInvitations(
			auth.organizationId
		);
		const pendingInvitation = existingInvitations.find(
			(inv) => inv.email.toLowerCase() === body.email.toLowerCase() && inv.acceptedAt === null
		);

		if (pendingInvitation) {
			return json(
				{
					success: false,
					error: 'Already invited',
					message: 'This email has already been invited to the organization'
				},
				{ status: 400 }
			);
		}

		// Generate a unique invitation token
		const token = crypto.randomUUID();

		// Create invitation - email sending is handled by the app layer
		const invitation = await databaseAdapter.createInvitation({
			organizationId: auth.organizationId,
			email: body.email.toLowerCase(),
			role: body.role,
			invitedBy: auth.user.id,
			token,
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
		});

		return json(
			{
				success: true,
				data: invitation,
				message: 'Invitation created successfully.'
			},
			{ status: 201 }
		);
	} catch (error) {
		cmsLogger.error('Failed to create invitation:', error);
		return json(
			{
				success: false,
				error: 'Failed to create invitation',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// DELETE /api/organizations/invitations - Cancel an invitation
export const DELETE: RequestHandler = async ({ request, locals }) => {
	try {
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type !== 'session') {
			return json(
				{
					success: false,
					error: 'Unauthorized',
					message: 'Session authentication required'
				},
				{ status: 401 }
			);
		}

		if (!hasCapability(auth, 'member.invite')) {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'You do not have permission to cancel invitations'
				},
				{ status: 403 }
			);
		}

		const rawBody = await request.json();
		const parsed = cancelInvitationRequest.safeParse(rawBody);
		if (!parsed.success) {
			return json(
				{
					success: false,
					error: 'Missing required field',
					message: 'invitationId is required',
					issues: parsed.error.issues
				},
				{ status: 400 }
			);
		}
		const body = parsed.data;

		// Delete the invitation
		const deleted = await databaseAdapter.deleteInvitation(body.invitationId);

		if (!deleted) {
			return json(
				{
					success: false,
					error: 'Invitation not found'
				},
				{ status: 404 }
			);
		}

		return json({
			success: true,
			message: 'Invitation canceled successfully'
		});
	} catch (error) {
		cmsLogger.error('Failed to cancel invitation:', error);
		return json(
			{
				success: false,
				error: 'Failed to cancel invitation',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
