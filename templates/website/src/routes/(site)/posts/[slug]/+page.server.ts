import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { siteContext } from '$lib/server/site';
import { resolveReferences } from '$lib/server/references';
import { refToCard } from '$lib/utils/card';
import { findPosts } from '$lib/server/posts';

/**
 * One post, by slug.
 *
 * The related-posts strip has a fallback the schema can't express: when an
 * editor hasn't hand-picked anything, it shows the most recent other posts
 * rather than leaving an empty gap. Hand-picked wins when it exists.
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	const { orgId, context } = await siteContext(locals);
	const { aphexCMS } = locals;

	const { docs } = await aphexCMS.localAPI.collections.post.find(context, {
		where: { slug: { equals: params.slug } },
		limit: 1,
		public: true
	});

	const found = docs[0];
	if (!found) throw error(404, 'Not found');

	// `resolveReferences` returns `Resolved<Post>`, so `relatedPosts` and
	// `categories` are typed as resolved references from here on — no casts.
	const perspective = context.perspective ?? 'published';
	const post = await resolveReferences(aphexCMS.databaseAdapter, orgId, found, perspective);

	// Expands the hero image and every image inside the body's rich text. Without
	// it they render nothing, and there's no error to explain why.
	await aphexCMS.assetService.injectAssetUrls(orgId, post);

	let related = (post.relatedPosts ?? [])
		// A reference whose target was deleted or unpublished resolves to null.
		.filter((ref) => !!ref)
		// A copied document can carry a reference to itself; a post shouldn't
		// appear in its own "related" list.
		.filter((ref) => ref.id !== post.id)
		.map(refToCard);

	if (related.length === 0) {
		const { cards } = await findPosts(aphexCMS, orgId, context, {
			limit: 3,
			excludeIds: [post.id]
		});
		related = cards;
	}

	return { post, related };
};
