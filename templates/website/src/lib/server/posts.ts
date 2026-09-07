import type { LocalAPIContext } from '@aphexcms/cms-core/server';
import { isResolvedRef } from '$lib/utils/reference';
import { postToCard, type CardData } from '$lib/utils/card';
import { resolveReferences } from './references';

/**
 * The one place posts are queried for a listing — the archive page, its
 * paginated pages, and the archive block all come through here.
 *
 * ## Why category filtering happens in memory
 *
 * A `where` path like `categories._ref` compiles to `data->'categories'->>'_ref'`,
 * which reads a *key* off an object. `categories` is an array, so that never
 * matches: there is no supported operator for "this array contains a reference to
 * X". So when a category filter is active, this fetches a bounded page of posts
 * and filters them here.
 *
 * That's a real limit, not a detail to discover later: past {@link FILTER_SCAN_CAP}
 * posts, a category listing silently stops being complete. It's the right trade
 * for a starter — a site with more posts than that wants a denormalised
 * `categorySlugs: string[]` field on the post (written by a `beforeValidate`
 * hook) so the filter becomes an indexable top-level comparison.
 *
 * With no category filter the query paginates in the database, as it should.
 */

/** How many posts a category-filtered listing will scan before giving up. */
export const FILTER_SCAN_CAP = 200;

interface Services {
	localAPI: { collections: Record<string, any> };
	assetService: { injectAssetUrls: (orgId: string, doc: unknown) => Promise<unknown> };
	databaseAdapter: any;
}

export interface FindPostsOptions {
	limit: number;
	/** 1-indexed. */
	page?: number;
	/** Slugs of categories to filter by. Empty or absent means all posts. */
	categorySlugs?: string[];
	/** Ids to exclude — used to keep a post out of its own "related" strip. */
	excludeIds?: string[];
}

export interface FindPostsResult {
	cards: CardData[];
	total: number;
	page: number;
	totalPages: number;
	/** True when the result was capped by {@link FILTER_SCAN_CAP}. */
	truncated: boolean;
}

export async function findPosts(
	services: Services,
	orgId: string,
	context: LocalAPIContext,
	options: FindPostsOptions
): Promise<FindPostsResult> {
	const { limit, page = 1, categorySlugs = [], excludeIds = [] } = options;
	const filtering = categorySlugs.length > 0 || excludeIds.length > 0;

	const query = filtering
		? { limit: FILTER_SCAN_CAP, offset: 0 }
		: { limit, offset: (page - 1) * limit };

	const result = await services.localAPI.collections.post.find(context, {
		...query,
		sort: '-publishedAt',
		// Strips organizationId/createdBy/updatedBy/publishedHash from `_meta`
		// before this leaves the call. Required on every public-facing read.
		public: true
	});

	let docs = result.docs as Array<Record<string, unknown>>;
	let total = result.totalDocs as number;
	const truncated = filtering && total > FILTER_SCAN_CAP;

	if (filtering) {
		// References have to be expanded before they can be filtered on — a raw
		// `{ _ref }` carries no slug.
		docs = await resolveReferences(
			services.databaseAdapter,
			orgId,
			docs,
			context.perspective ?? 'published'
		);

		if (excludeIds.length) {
			docs = docs.filter((doc) => !excludeIds.includes(doc.id as string));
		}

		if (categorySlugs.length) {
			const wanted = new Set(categorySlugs);
			docs = docs.filter((doc) =>
				(Array.isArray(doc.categories) ? doc.categories : [])
					.filter(isResolvedRef)
					.some((category) => category.slug && wanted.has(category.slug))
			);
		}

		total = docs.length;
		docs = docs.slice((page - 1) * limit, page * limit);
	} else {
		docs = await resolveReferences(
			services.databaseAdapter,
			orgId,
			docs,
			context.perspective ?? 'published'
		);
	}

	// An image field stores only a reference; without this every card renders a
	// blank space with no error to explain why.
	for (const doc of docs) await services.assetService.injectAssetUrls(orgId, doc);

	return {
		cards: docs.map(postToCard),
		total,
		page,
		totalPages: Math.max(1, Math.ceil(total / limit)),
		truncated
	};
}
