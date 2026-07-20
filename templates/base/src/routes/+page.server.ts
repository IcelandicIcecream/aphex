import type { PageServerLoad } from './$types';
import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';

// Reading your content: the Local API.
// ------------------------------------
// `locals.aphexCMS.localAPI` is the same typed, in-process API the admin uses —
// available on every server load, no HTTP round-trip. Here we list published
// `page` documents (defined in src/lib/schemaTypes/page.ts) and hand them to the
// component below. Query your own collections the same way once you add them.
export const load: PageServerLoad = async ({ locals }) => {
	// The starter is single-tenant, so content lives under the first (only) org.
	// `systemContext` builds a full-access server context; `perspective: 'published'`
	// returns only published content (drop it to include drafts).
	const [org] = await locals.aphexCMS.databaseAdapter.findAllOrganizations();
	if (!org) return { pages: [] };

	const context = { ...systemContext(org.id), perspective: 'published' as const };

	const { docs } = await locals.aphexCMS.localAPI.collections.page.find(context, {
		limit: 20,
		sort: ['-updatedAt']
	});

	return { pages: docs };
};
