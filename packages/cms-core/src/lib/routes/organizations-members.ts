// Aphex CMS Organization Members API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { cmsLogger } from '../utils/logger';
import { removeMemberRequest, updateMemberRoleRequest } from '../api/schemas/organizations';
import { hasCapability } from '../types/capabilities';

// GET /api/organizations/members - List organization members
export const GET: RequestHandler = async ({ locals }) => {
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

		// Get members of the current active organization
		const members = await databaseAdapter.findOrganizationMembers(auth.organizationId);

		return json({
			success: true,
			data: members
		});
	} catch (error) {
		cmsLogger.error('Failed to fetch organization members:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch members',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// DELETE /api/organizations/members - Remove a member
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

		if (!hasCapability(auth, 'member.remove')) {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'You do not have permission to remove members'
				},
				{ status: 403 }
			);
		}

		const rawBody = await request.json();
		const parsed = removeMemberRequest.safeParse(rawBody);
		if (!parsed.success) {
			return json(
				{
					success: false,
					error: 'Missing required field',
					message: 'userId is required',
					issues: parsed.error.issues
				},
				{ status: 400 }
			);
		}
		const body = parsed.data;

		// Prevent removing yourself
		if (body.userId === auth.user.id) {
			return json(
				{
					success: false,
					error: 'Invalid operation',
					message: 'You cannot remove yourself from the organization'
				},
				{ status: 400 }
			);
		}

		// Get the target member's role
		const targetMember = await databaseAdapter.findUserMembership(body.userId, auth.organizationId);

		if (!targetMember) {
			return json(
				{
					success: false,
					error: 'Member not found',
					message: 'User is not a member of this organization'
				},
				{ status: 404 }
			);
		}

		// Admins cannot remove owners
		if (auth.organizationRole === 'admin' && targetMember.role === 'owner') {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'Admins cannot remove owners'
				},
				{ status: 403 }
			);
		}

		// Remove the member
		const removed = await databaseAdapter.removeMember(auth.organizationId, body.userId);

		if (!removed) {
			return json(
				{
					success: false,
					error: 'Failed to remove member'
				},
				{ status: 500 }
			);
		}

		// Clear the user's session if their active org is the one they were removed from
		const userSession = await databaseAdapter.findUserSession(body.userId);
		if (userSession?.activeOrganizationId === auth.organizationId) {
			cmsLogger.debug(
				`[Organizations]: Clearing user session for ${body.userId} - removed from active org ${auth.organizationId}`
			);

			// Check if user has other organizations
			const otherOrgs = await databaseAdapter.findUserOrganizations(body.userId);
			if (otherOrgs.length > 0 && otherOrgs[0]) {
				// Set their first remaining org as active
				await databaseAdapter.updateUserSession(body.userId, otherOrgs[0].organization.id);
				cmsLogger.debug(
					`[Organizations]: Set org ${otherOrgs[0].organization.id} as new active org for ${body.userId}`
				);
			} else {
				// No other orgs - delete the session so invitations can be processed on next login
				await databaseAdapter.deleteUserSession(body.userId);
				cmsLogger.debug(
					`[Organizations]: Deleted user session for ${body.userId} - no remaining organizations`
				);
			}
		}

		return json({
			success: true,
			message: 'Member removed successfully'
		});
	} catch (error) {
		cmsLogger.error('Failed to remove member:', error);
		return json(
			{
				success: false,
				error: 'Failed to remove member',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// PATCH /api/organizations/members - Update member role
export const PATCH: RequestHandler = async ({ request, locals }) => {
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

		if (!hasCapability(auth, 'member.changeRole')) {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'You do not have permission to change member roles'
				},
				{ status: 403 }
			);
		}

		const rawBody = await request.json();
		const parsed = updateMemberRoleRequest.safeParse(rawBody);
		if (!parsed.success) {
			return json(
				{
					success: false,
					error: 'Invalid request body',
					message: 'userId and role are required',
					issues: parsed.error.issues
				},
				{ status: 400 }
			);
		}
		const body = parsed.data;

		// Verify the target role exists in this organization.
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

		// Prevent changing your own role
		if (body.userId === auth.user.id) {
			return json(
				{
					success: false,
					error: 'Invalid operation',
					message: 'You cannot change your own role'
				},
				{ status: 400 }
			);
		}

		// Get the target member's current role
		const targetMember = await databaseAdapter.findUserMembership(body.userId, auth.organizationId);

		if (!targetMember) {
			return json(
				{
					success: false,
					error: 'Member not found',
					message: 'User is not a member of this organization'
				},
				{ status: 404 }
			);
		}

		// Admins cannot modify owners
		if (auth.organizationRole === 'admin' && targetMember.role === 'owner') {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'Admins cannot modify owner roles'
				},
				{ status: 403 }
			);
		}

		// Update the role
		const updatedMember = await databaseAdapter.updateMemberRole(
			auth.organizationId,
			body.userId,
			body.role
		);

		if (!updatedMember) {
			return json(
				{
					success: false,
					error: 'Failed to update role'
				},
				{ status: 500 }
			);
		}

		return json({
			success: true,
			data: updatedMember
		});
	} catch (error) {
		cmsLogger.error('Failed to update member role:', error);
		return json(
			{
				success: false,
				error: 'Failed to update role',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
