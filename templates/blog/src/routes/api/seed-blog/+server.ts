import { dev } from '$app/environment';
import { json, error } from '@sveltejs/kit';
import { seedBlogContent } from '$lib/server/seed';
import { siteContext } from '$lib/server/site';
import type { RequestHandler } from './$types';

/**
 * Dev-only reset button: wipe the blog's seeded-type documents and recreate the
 * demo content set. First-run population is automatic (see `$lib/server/seed`) —
 * this exists for getting back to a known state after experimenting.
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!dev) throw error(404);

	const auth = locals.auth;
	if (!auth || auth.type !== 'session') throw error(401, 'Not authenticated');

	const { orgId, context } = await siteContext(locals);
	const created = await seedBlogContent(locals.aphexCMS, orgId, context, { wipe: true });

	return json({
		success: true,
		message: 'Seeded blog content',
		tags: created.tags,
		posts: created.posts,
		pages: created.pages
	});
};
