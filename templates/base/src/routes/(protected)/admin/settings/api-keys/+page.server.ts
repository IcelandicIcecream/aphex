import type { PageServerLoad } from './$types';
import { drizzleDb } from '$lib/server/db';
import { apikey } from '$lib/server/db/auth-schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const auth = locals.auth;

	if (!auth || auth.type !== 'session') {
		throw new Error('No session found');
	}

	const userApiKeys = await drizzleDb.query.apikey.findMany({
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

	const apiKeysWithPermissions = userApiKeys
		.map((key) => {
			let metadata: any = key.metadata;
			if (typeof metadata === 'string') {
				metadata = JSON.parse(metadata);
				if (typeof metadata === 'string') {
					metadata = JSON.parse(metadata);
				}
			}
			metadata = metadata || null;

			return {
				...key,
				permissions: metadata?.permissions || [],
				organizationId: metadata?.organizationId
			};
		})
		.filter((key) => auth.type === 'session' && key.organizationId === auth.organizationId);

	return {
		apiKeys: apiKeysWithPermissions
	};
};
