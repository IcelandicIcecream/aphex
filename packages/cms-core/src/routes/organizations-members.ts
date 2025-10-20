// Aphex CMS Organization Members API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

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
		console.error('Failed to fetch organization members:', error);
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

		// Only owners and admins can remove members
		if (auth.organizationRole !== 'owner' && auth.organizationRole !== 'admin') {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'Only owners and admins can remove members'
				},
				{ status: 403 }
			);
		}

		const body = await request.json();

		if (!body.userId) {
			return json(
				{
					success: false,
					error: 'Missing required field',
					message: 'userId is required'
				},
				{ status: 400 }
			);
		}

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
		const targetMember = await databaseAdapter.findUserMembership(
			body.userId,
			auth.organizationId
		);

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
			console.log(`[Organizations]: Clearing user session for ${body.userId} - removed from active org ${auth.organizationId}`);

			// Check if user has other organizations
			const otherOrgs = await databaseAdapter.findUserOrganizations(body.userId);
			if (otherOrgs.length > 0) {
				// Set their first remaining org as active
				await databaseAdapter.updateUserSession(body.userId, otherOrgs[0].organization.id);
				console.log(`[Organizations]: Set org ${otherOrgs[0].organization.id} as new active org for ${body.userId}`);
			} else {
				// No other orgs - delete the session so invitations can be processed on next login
				await databaseAdapter.deleteUserSession(body.userId);
				console.log(`[Organizations]: Deleted user session for ${body.userId} - no remaining organizations`);
			}
		}

		return json({
			success: true,
			message: 'Member removed successfully'
		});
	} catch (error) {
		console.error('Failed to remove member:', error);
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

		// Only owners and admins can update roles
		if (auth.organizationRole !== 'owner' && auth.organizationRole !== 'admin') {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'Only owners and admins can update member roles'
				},
				{ status: 403 }
			);
		}

		const body = await request.json();

		if (!body.userId || !body.role) {
			return json(
				{
					success: false,
					error: 'Missing required fields',
					message: 'userId and role are required'
				},
				{ status: 400 }
			);
		}

		// Validate role
		const validRoles = ['owner', 'admin', 'editor', 'viewer'];
		if (!validRoles.includes(body.role)) {
			return json(
				{
					success: false,
					error: 'Invalid role',
					message: 'Role must be one of: owner, admin, editor, viewer'
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
		const targetMember = await databaseAdapter.findUserMembership(
			body.userId,
			auth.organizationId
		);

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
		console.error('Failed to update member role:', error);
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
