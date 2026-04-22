import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/auth/service';
import { createApiKeyRequest } from '@aphexcms/cms-core/api/schemas/api-keys';
import { hasCapability } from '@aphexcms/cms-core';

// GET - List user's API keys
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.auth || locals.auth.type !== 'session') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { databaseAdapter } = locals.aphexCMS;
		const apiKeys = await authService.listApiKeys(databaseAdapter, locals.auth.user.id);
		return json({ success: true, data: apiKeys });
	} catch (error) {
		console.error('Error fetching API keys:', error);
		return json({ error: 'Failed to fetch API keys' }, { status: 500 });
	}
};

// POST - Create new API key
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.auth || locals.auth.type !== 'session') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const auth = locals.auth;

	try {
		// Capability-driven — custom roles with apiKey.manage are welcome.
		if (!hasCapability(auth, 'apiKey.manage')) {
			return json(
				{
					error: 'Forbidden',
					message: 'You do not have permission to create API keys'
				},
				{ status: 403 }
			);
		}

		const rawBody = await request.json();
		const parsed = createApiKeyRequest.safeParse(rawBody);
		if (!parsed.success) {
			return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
		}

		// Create API key bound to the user's current active organization
		const apiKey = await authService.createApiKey(auth.user.id, auth.organizationId, parsed.data);

		return json({ success: true, data: { apiKey } });
	} catch (error) {
		console.error('Error creating API key:', error);
		return json({ error: 'Failed to create API key' }, { status: 500 });
	}
};
