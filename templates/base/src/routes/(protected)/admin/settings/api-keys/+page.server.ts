import type { PageServerLoad } from './$types';
import { drizzleDb } from '$lib/server/db';
import { apikey } from '$lib/server/db/auth-schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { hasCapability } from '@aphexcms/cms-core';
import { isApiDocsEnabled, API_DOCS_PATH } from '@aphexcms/cms-core/server';

export const load: PageServerLoad = async ({ locals }) => {
	const auth = locals.auth;

	if (!auth || auth.type !== 'session') {
		throw new Error('No session found');
	}

	if (!hasCapability(auth, 'apiKey.manage')) {
		throw error(403, 'You do not have permission to manage API keys');
	}

	const userApiKeys = await drizzleDb.query.apikey.findMany({
		where: eq(apikey.referenceId, auth.user.id),
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
		apiKeys: apiKeysWithPermissions,
		// Resolved here rather than assumed in the component: the reference is
		// unmounted on an instance that opts out, and a link to a 404 is worse
		// than no link. Same predicate the route itself mounts on.
		apiDocs: isApiDocsEnabled(locals.aphexCMS.config) ? API_DOCS_PATH : null
	};
};
