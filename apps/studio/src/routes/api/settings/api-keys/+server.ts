import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { apikey } from '$lib/server/db/auth-schema';
import { eq } from 'drizzle-orm';

// GET - List user's API keys
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.auth || locals.auth.type !== 'session') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Fetch user's API keys from database
		const userApiKeys = await db.query.apikey.findMany({
			where: eq(apikey.userId, locals.auth.user.id),
			columns: {
				id: true,
				name: true,
				metadata: true,
				expiresAt: true,
				lastRequest: true,
				createdAt: true
				// Note: We don't return the actual key hash for security
			},
			orderBy: (apikey, { desc }) => [desc(apikey.createdAt)]
		});

		// Extract permissions from metadata
		const apiKeysWithPermissions = userApiKeys.map((key) => {
			const metadata =
				typeof key.metadata === 'string' ? JSON.parse(key.metadata) : (key.metadata as any) || {};
			return {
				...key,
				permissions: metadata.permissions || []
			};
		});

		return json({ apiKeys: apiKeysWithPermissions });
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

		// Validate input
		if (!name || !permissions || !Array.isArray(permissions)) {
			return json({ error: 'Invalid input' }, { status: 400 });
		}

		// Calculate expiration in seconds (Better Auth expects expiresIn, not expiresAt)
		const expiresIn = expiresInDays ? expiresInDays * 24 * 60 * 60 : undefined;

		// Create API key using Better Auth
		const result = await auth.api.createApiKey({
			body: {
				userId: locals.auth.user.id,
				name,
				expiresIn,
				// Store permissions in metadata (as object, not string)
				metadata: { permissions }
			}
		});

		// Better Auth returns the key data directly, not wrapped in { data: ... }
		if (!result || !result.id) {
			console.error('Failed to create API key:', result);
			return json({ error: 'Failed to create API key' }, { status: 500 });
		}

		// Return the newly created key (only time it's shown)
		return json({
			apiKey: {
				id: result.id,
				name: result.name,
				key: result.key, // Only shown on creation
				permissions,
				expiresAt: result.expiresAt,
				createdAt: result.createdAt
			}
		});
	} catch (error) {
		console.error('Error creating API key:', error);
		return json({ error: 'Failed to create API key' }, { status: 500 });
	}
};
