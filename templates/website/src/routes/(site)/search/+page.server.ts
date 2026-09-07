import type { PageServerLoad } from './$types';
import { siteContext } from '$lib/server/site';
import { postToCard, type CardData } from '$lib/utils/card';
import { docHref } from '$lib/utils/link';

/**
 * Search across posts and pages.
 *
 * Aphex has a real search index behind `search:` — a Postgres `tsvector` + GIN,
 * or SQLite FTS5 — populated from each schema's `search` config (here,
 * `searchableFields()` on `page` and `post`). It is not a `LIKE` scan, so this
 * stays fast as content grows, and results come back relevance-ranked.
 *
 * Both types are queried and merged rather than searched as one index, because
 * they're separate collections; posts are listed first since they're what people
 * usually mean.
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	const query = (url.searchParams.get('q') ?? '').trim();
	if (!query) return { query, posts: [] as CardData[], pages: [] as CardData[] };

	const { orgId, context } = await siteContext(locals);
	const { aphexCMS } = locals;

	const [postResult, pageResult] = await Promise.all([
		aphexCMS.localAPI.collections.post.find(context, { search: query, limit: 20, public: true }),
		aphexCMS.localAPI.collections.page.find(context, { search: query, limit: 20, public: true })
	]);

	for (const doc of postResult.docs) await aphexCMS.assetService.injectAssetUrls(orgId, doc);

	return {
		query,
		posts: postResult.docs.map(postToCard),
		// Pages have no excerpt or card image in this template, so they're listed
		// as plain links rather than dressed up as cards with nothing in them.
		pages: pageResult.docs
			.filter((doc) => doc.slug !== 'home')
			.map(
				(doc): CardData => ({
					id: doc.id,
					href: docHref('page', doc.slug),
					title: doc.title ?? 'Untitled',
					excerpt: null,
					image: null,
					tags: []
				})
			)
	};
};
