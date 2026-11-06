import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createApiKeyRequest } from '@aphexcms/cms-core/api/schemas/api-keys';
import { hasCapability } from '@aphexcms/cms-core';

// GET - List user's API keys
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.aphexAuth || locals.aphexAuth.type !== 'session') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const apiKeys = (await locals.aphexCMS.auth?.listApiKeys?.(locals.aphexAuth.user.id)) ?? [];
		return json({ success: true, data: apiKeys });
	} catch (error) {
		console.error('Error fetching API keys:', error);
		return json({ error: 'Failed to fetch API keys' }, { status: 500 });
	}
};

// POST - Create new API key
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.aphexAuth || locals.aphexAuth.type !== 'session') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const auth = locals.aphexAuth;

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
		const createApiKey = locals.aphexCMS.auth?.createApiKey;
		if (!createApiKey) {
			return json({ error: 'API keys are not supported by this auth provider' }, { status: 501 });
		}
		const apiKey = await createApiKey(auth.user.id, auth.organizationId, parsed.data);

		return json({ success: true, data: { apiKey } });
	} catch (error) {
		console.error('Error creating API key:', error);
		return json({ error: 'Failed to create API key' }, { status: 500 });
	}
};
