import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { apikey } from '$lib/server/db/auth-schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// User is guaranteed to exist because /admin is protected
	const auth = locals.auth;

	if (!auth || auth.type !== 'session') {
		throw new Error('No session found');
	}

	// Fetch user's API keys
	const userApiKeys = await db.query.apikey.findMany({
		where: eq(apikey.userId, auth.user.id),
		columns: {
			id: true,
			name: true,
			metadata: true,
			expiresAt: true,
			lastRequest: true,
			createdAt: true
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

	return {
		apiKeys: apiKeysWithPermissions
	};
};
