import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadArchivePage } from '$lib/server/archive-page';

export const load: PageServerLoad = async ({ locals, url, params }) => {
	const pageNumber = Number(params.page);
	if (!Number.isInteger(pageNumber) || pageNumber < 1) throw error(404, 'Not found');

	// `/posts/page/1` and `/posts` would be the same list at two URLs. Redirect
	// rather than render, so there's one canonical address for page one.
	if (pageNumber === 1) throw redirect(308, `/posts${url.search}`);

	return loadArchivePage(locals, url, pageNumber);
};
