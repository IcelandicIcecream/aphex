import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/**
 * Studio has no public site — it is an admin dev harness — so `/` goes straight
 * to the admin.
 *
 * This lives in the root route rather than in `hooks.server.ts` on purpose:
 * `hooks.server.ts` is synced verbatim into the templates, and both of those DO
 * serve a public homepage at `/`. A redirect in the hook would silently swallow
 * it. Route files under `src/routes/+page.*` are template-owned (see the skip
 * list in scripts/sync-template.sh), so the redirect can't travel.
 */
export const load: PageLoad = () => {
	redirect(302, '/admin');
};
