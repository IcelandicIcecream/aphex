import { error } from '@sveltejs/kit';
import { siteContext } from './site';
import { findPosts } from './posts';

/** Posts per page across the archive and its numbered pages. */
export const POSTS_PER_PAGE = 12;

/**
 * The load shared by `/posts` and `/posts/page/[page]`.
 *
 * They're the same listing at different offsets, so they share everything except
 * where the page number comes from — page 1 lives at `/posts` so the first page
 * has one canonical URL rather than two.
 */
export async function loadArchivePage(locals: App.Locals, url: URL, pageNumber: number) {
	if (!Number.isInteger(pageNumber) || pageNumber < 1) throw error(404, 'Not found');

	const { orgId, context } = await siteContext(locals);

	// `?category=` narrows the list. It's a query parameter rather than a route
	// segment because it's a filter on one listing, not a separate resource — and
	// it keeps the pagination URLs from multiplying.
	const category = url.searchParams.get('category');

	const result = await findPosts(locals.aphexCMS, orgId, context, {
		limit: POSTS_PER_PAGE,
		page: pageNumber,
		categorySlugs: category ? [category] : []
	});

	// Past the last page is a 404, not an empty list: an empty page 9 of 3 is a
	// soft 404 that crawlers will happily index.
	if (pageNumber > 1 && pageNumber > result.totalPages) throw error(404, 'Not found');

	return {
		...result,
		category,
		limit: POSTS_PER_PAGE
	};
}
