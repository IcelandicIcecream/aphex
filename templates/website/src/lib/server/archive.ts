import type { LocalAPIContext } from '@aphexcms/cms-core/server';
import { isResolvedRef } from '$lib/utils/reference';
import { refToCard, type CardData } from '$lib/utils/card';
import { findPosts } from './posts';

/**
 * Populating the archive block.
 *
 * An `archive` block says *what* to show — a query over posts, or a hand-picked
 * list — but not the posts themselves. This runs during the page load and
 * attaches the resolved cards to each block as `_posts`, so the component stays
 * a pure renderer and the page server-renders in one pass with no client-side
 * fetch waterfall.
 *
 * The leading underscore marks `_posts` as derived-at-load rather than authored:
 * it exists nowhere in the schema and is never written back.
 */

interface ArchiveBlock {
	_type?: string;
	populateBy?: string;
	limit?: number;
	categories?: unknown[];
	selectedDocs?: unknown[];
	_posts?: CardData[];
	[key: string]: unknown;
}

interface Services {
	localAPI: { collections: Record<string, any> };
	assetService: { injectAssetUrls: (orgId: string, doc: unknown) => Promise<unknown> };
	databaseAdapter: any;
}

export async function loadArchiveBlocks(
	services: Services,
	orgId: string,
	context: LocalAPIContext,
	blocks: unknown
): Promise<void> {
	if (!Array.isArray(blocks)) return;

	const archives = blocks.filter(
		(block): block is ArchiveBlock =>
			!!block && typeof block === 'object' && (block as ArchiveBlock)._type === 'archive'
	);
	if (archives.length === 0) return;

	// Each block is independent, so they run together rather than in sequence —
	// a page with three archives shouldn't cost three sequential round trips.
	await Promise.all(
		archives.map(async (block) => {
			if (block.populateBy === 'selection') {
				// These references were already expanded by `resolveReferences` in the
				// page load, which dropped any that no longer resolve — hence the
				// guard rather than a cast.
				block._posts = (block.selectedDocs ?? []).filter(isResolvedRef).map(refToCard);
				return;
			}

			const categorySlugs = (block.categories ?? [])
				.filter(isResolvedRef)
				.map((category) => category.slug)
				.filter((slug): slug is string => !!slug);

			const { cards } = await findPosts(services, orgId, context, {
				limit: block.limit ?? 10,
				categorySlugs
			});

			block._posts = cards;
		})
	);
}
