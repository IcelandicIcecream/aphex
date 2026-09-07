import { isHttpError } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadPage } from '$lib/server/page';

/**
 * The front page is the `page` document slugged `home` — no special document
 * type, no separate editor. The one difference from `/[slug]` is that a missing
 * home page isn't a 404: on a fresh install nobody has created it yet, and the
 * site should explain how rather than show an error.
 *
 * Only that case is swallowed. `loadPage` also resolves references, injects
 * asset URLs and populates archive blocks, and a failure in any of those is a
 * real fault — a database that's down, a broken adapter, a reference query that
 * throws. Catching everything turned all of them into the same cheerful "set up
 * your site" screen, which is the worst possible response to an outage: the page
 * returns 200, so uptime checks pass and nothing pages anyone, while every
 * visitor is told the site is empty.
 *
 * `isHttpError` narrows to the 404s thrown by `loadPage` (no `home` document)
 * and by `siteContext` (no organization yet) — the two genuine not-yet-set-up
 * states. Anything else propagates and gets the error page it deserves.
 */
export const load: PageServerLoad = async ({ locals }) => {
	try {
		return { page: await loadPage(locals, 'home') };
	} catch (cause) {
		if (isHttpError(cause) && cause.status === 404) return { page: null };
		throw cause;
	}
};
