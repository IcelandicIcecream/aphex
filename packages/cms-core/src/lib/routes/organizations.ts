// Aphex CMS Organization API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/organizations - List user's organizations
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

		// Get all organizations the user belongs to
		const memberships = await databaseAdapter.findUserOrganizations(auth.user.id);

		// Map to a cleaner format with organization details and user's role
		const organizations = memberships.map((membership) => ({
			id: membership.organization.id,
			name: membership.organization.name,
			slug: membership.organization.slug,
			metadata: membership.organization.metadata,
			role: membership.member.role,
			joinedAt: membership.member.createdAt,
			isActive: membership.organization.id === auth.organizationId
		}));

		return json({
			success: true,
			data: organizations
		});
	} catch (error) {
		console.error('Failed to fetch organizations:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch organizations',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// POST /api/organizations - Create new organization
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

		// Only SUPER_ADMIN can create organizations
		if (auth.user.role !== 'super_admin') {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'Only super admins can create organizations'
				},
				{ status: 403 }
			);
		}

		const body = await request.json();

		// Validate required fields
		if (!body.name || !body.slug) {
			return json(
				{
					success: false,
					error: 'Missing required fields',
					message: 'Organization name and slug are required'
				},
				{ status: 400 }
			);
		}

		// Check if slug is already taken
		const existingOrg = await databaseAdapter.findOrganizationBySlug(body.slug);
		if (existingOrg) {
			return json(
				{
					success: false,
					error: 'Slug already exists',
					message: `Organization with slug '${body.slug}' already exists`
				},
				{ status: 409 }
			);
		}

		// Create the organization with current active org as parent
		// Note: Only supports 1-level hierarchy for performance
		const newOrganization = await databaseAdapter.createOrganization({
			name: body.name,
			slug: body.slug,
			metadata: body.metadata || null,
			parentOrganizationId: auth.organizationId, // Current active org becomes parent
			createdBy: auth.user.id
		});

		// Add the creator as owner
		await databaseAdapter.addMember({
			organizationId: newOrganization.id,
			userId: auth.user.id,
			role: 'owner'
		});

		// Set as active organization for this user
		await databaseAdapter.updateUserSession(auth.user.id, newOrganization.id);

		return json(
			{
				success: true,
				data: newOrganization
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Failed to create organization:', error);
		return json(
			{
				success: false,
				error: 'Failed to create organization',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
