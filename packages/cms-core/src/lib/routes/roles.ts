// Aphex CMS Roles API Handlers
//
// GET  /api/roles          — list roles for the active org
// POST /api/roles          — create a custom role (requires role.manage)
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { cmsLogger } from '../utils/logger';
import { hasCapability, BUILTIN_ROLE_NAMES } from '../types/capabilities';
import { createRoleRequest } from '../api/schemas/roles';

function unauthorized() {
	return json(
		{ success: false, error: 'Unauthorized', message: 'Session authentication required' },
		{ status: 401 }
	);
}

function forbidden(message: string) {
	return json({ success: false, error: 'Forbidden', message }, { status: 403 });
}

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const { rolesService } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type !== 'session') return unauthorized();

		const roles = await rolesService.listRoles(auth.organizationId);
		return json({ success: true, data: roles });
	} catch (error) {
		cmsLogger.error('Failed to list roles:', error);
		return json(
			{
				success: false,
				error: 'Failed to list roles',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { databaseAdapter, rolesService } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type !== 'session') return unauthorized();
		if (!hasCapability(auth, 'role.manage')) {
			return forbidden('You do not have permission to manage roles');
		}

		const rawBody = await request.json();
		const parsed = createRoleRequest.safeParse(rawBody);
		if (!parsed.success) {
			return json(
				{
					success: false,
					error: 'Invalid request body',
					message: 'name and capabilities are required',
					issues: parsed.error.issues
				},
				{ status: 400 }
			);
		}
		const body = parsed.data;

		// Reject collisions with reserved built-in names — built-ins are seeded
		// on every org; a matching custom row would never be reachable.
		if ((BUILTIN_ROLE_NAMES as readonly string[]).includes(body.name)) {
			return json(
				{
					success: false,
					error: 'Reserved name',
					message: `"${body.name}" is a built-in role name. Edit the existing role instead.`
				},
				{ status: 409 }
			);
		}

		const existing = await databaseAdapter.findRoleByName(auth.organizationId, body.name);
		if (existing) {
			return json(
				{
					success: false,
					error: 'Conflict',
					message: `A role named "${body.name}" already exists in this organization.`
				},
				{ status: 409 }
			);
		}

		const role = await databaseAdapter.createRole({
			organizationId: auth.organizationId,
			name: body.name,
			description: body.description ?? null,
			capabilities: body.capabilities,
			isBuiltIn: false
		});

		// New role can't be in use yet, but invalidate the prefix just in case
		// a prior lookup populated the cache with an empty fallback entry.
		await rolesService.invalidate(auth.organizationId, body.name);

		return json({ success: true, data: role }, { status: 201 });
	} catch (error) {
		cmsLogger.error('Failed to create role:', error);
		return json(
			{
				success: false,
				error: 'Failed to create role',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
