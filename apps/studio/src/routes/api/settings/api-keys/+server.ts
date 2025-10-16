import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/auth/service';

// GET - List user's API keys
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.auth || locals.auth.type !== 'session') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { databaseAdapter } = locals.aphexCMS;
		const apiKeys = await authService.listApiKeys(databaseAdapter, locals.auth.user.id);
		return json({ apiKeys });
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

	try {
		const { name, permissions, expiresInDays } = await request.json();

		if (!name || !permissions || !Array.isArray(permissions)) {
			return json({ error: 'Invalid input' }, { status: 400 });
		}

		// Create API key bound to the user's current active organization
		const apiKey = await authService.createApiKey(
			locals.auth.user.id,
			locals.auth.organizationId,
			{
				name,
				permissions,
				expiresInDays
			}
		);

		return json({ apiKey });
	} catch (error) {
		console.error('Error creating API key:', error);
		return json({ error: 'Failed to create API key' }, { status: 500 });
	}
};
