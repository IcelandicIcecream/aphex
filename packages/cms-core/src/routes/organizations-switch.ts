// Aphex CMS Organization Switch API Handler
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// POST /api/organizations/switch - Switch active organization
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

		const body = await request.json();

		if (!body.organizationId) {
			return json(
				{
					success: false,
					error: 'Missing required field',
					message: 'organizationId is required'
				},
				{ status: 400 }
			);
		}

		// Verify user is a member of the target organization
		const membership = await databaseAdapter.findUserMembership(
			auth.user.id,
			body.organizationId
		);

		if (!membership) {
			return json(
				{
					success: false,
					error: 'Access denied',
					message: 'You are not a member of this organization'
				},
				{ status: 403 }
			);
		}

		// Update user's active organization
		await databaseAdapter.updateUserSession(auth.user.id, body.organizationId);

		// Get the organization details
		const organization = await databaseAdapter.findOrganizationById(body.organizationId);

		return json({
			success: true,
			data: {
				organizationId: body.organizationId,
				organizationName: organization?.name,
				role: membership.role
			}
		});
	} catch (error) {
		console.error('Failed to switch organization:', error);
		return json(
			{
				success: false,
				error: 'Failed to switch organization',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
