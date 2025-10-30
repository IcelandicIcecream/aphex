// Aphex CMS Organization by ID API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/organizations/[id] - Get organization by ID
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;
		const { id } = params;

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

		if (!id) {
			return json(
				{
					success: false,
					error: 'Missing required field',
					message: 'Organization ID is required'
				},
				{ status: 400 }
			);
		}

		// Check if user is a member of this organization
		const membership = await databaseAdapter.findUserMembership(auth.user.id, id);
		if (!membership) {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'You are not a member of this organization'
				},
				{ status: 403 }
			);
		}

		const organization = await databaseAdapter.findOrganizationById(id);
		if (!organization) {
			return json(
				{
					success: false,
					error: 'Organization not found'
				},
				{ status: 404 }
			);
		}

		return json({
			success: true,
			data: organization
		});
	} catch (error) {
		console.error('Failed to fetch organization:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch organization',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// PATCH /api/organizations/[id] - Update organization
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	try {
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;
		const { id } = params;

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

		if (!id) {
			return json(
				{
					success: false,
					error: 'Missing required field',
					message: 'Organization ID is required'
				},
				{ status: 400 }
			);
		}

		// Check if user is owner or admin of this organization
		const membership = await databaseAdapter.findUserMembership(auth.user.id, id);
		if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'Only owners and admins can update organization settings'
				},
				{ status: 403 }
			);
		}

		const body = await request.json();

		// Validate: if slug is being changed, check it's not already taken
		if (body.slug) {
			const existingOrg = await databaseAdapter.findOrganizationBySlug(body.slug);
			if (existingOrg && existingOrg.id !== id) {
				return json(
					{
						success: false,
						error: 'Slug already exists',
						message: `Organization with slug '${body.slug}' already exists`
					},
					{ status: 409 }
				);
			}
		}

		// Update organization
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
			return json(
				{
					success: false,
					error: 'Organization not found'
				},
				{ status: 404 }
			);
		}

		return json({
			success: true,
			data: updatedOrganization
		});
	} catch (error) {
		console.error('Failed to update organization:', error);
		return json(
			{
				success: false,
				error: 'Failed to update organization',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// DELETE /api/organizations/[id] - Delete an organization
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;
		const { id } = params;

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

		if (!id) {
			return json(
				{
					success: false,
					error: 'Missing required field',
					message: 'Organization ID is required'
				},
				{ status: 400 }
			);
		}

		// Only owners can delete an organization
		const membership = await databaseAdapter.findUserMembership(auth.user.id, id);
		if (!membership || membership.role !== 'owner') {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'Only owners can delete an organization'
				},
				{ status: 403 }
			);
		}

		// Get all members of the organization
		const members = await databaseAdapter.findOrganizationMembers(id);

		// Handle member lifecycle
		for (const member of members) {
			const userSession = await databaseAdapter.findUserSession(member.userId);
			if (userSession?.activeOrganizationId === id) {
				const otherOrgs = await databaseAdapter.findUserOrganizations(member.userId);
				const remainingOrgs = otherOrgs.filter((org) => org.organization.id !== id);

				if (remainingOrgs.length > 0 && remainingOrgs[0]) {
					await databaseAdapter.updateUserSession(member.userId, remainingOrgs[0].organization.id);
				} else {
					await databaseAdapter.deleteUserSession(member.userId);
				}
			}
		}

		// Delete all members from the organization
		await databaseAdapter.removeAllMembers(id);

		// Delete all invitations for the organization
		await databaseAdapter.removeAllInvitations(id);

		// Delete the organization
		await databaseAdapter.deleteOrganization(id);

		return json({
			success: true,
			message: 'Organization deleted successfully'
		});
	} catch (error) {
		console.error('Failed to delete organization:', error);
		return json(
			{
				success: false,
				error: 'Failed to delete organization',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
