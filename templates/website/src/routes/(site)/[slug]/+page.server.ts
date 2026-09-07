import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadPage } from '$lib/server/page';

/**
 * Any page, by slug. This is the route the `slug` field exists to feed and what
 * `previewUrl` opens from the studio.
 *
 * `home` is served at `/`, so requesting `/home` would be a second URL for the
 * same content — bad for crawlers and for anyone sharing a link. It 404s instead.
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	if (params.slug === 'home') throw error(404, 'Not found');
	return { page: await loadPage(locals, params.slug) };
};
