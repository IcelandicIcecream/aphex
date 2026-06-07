import type { RequestHandler } from './$types';
import { siteContext } from '$lib/server/site';

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : undefined);

type Entry = { loc: string; lastmod?: string };

export const GET: RequestHandler = async ({ locals, url }) => {
	const origin = url.origin;
	const entries: Entry[] = [{ loc: '/blog' }];

	try {
		const { context } = await siteContext(locals);
		const api = locals.aphexCMS.localAPI;
		const opts = { perspective: 'published' as const, limit: 1000 };

		const [posts, pages, tags, authors] = await Promise.all([
			api.collections.blog_post.find(context, opts),
			api.collections.page.find(context, opts),
			api.collections.tag.find(context, opts),
			api.collections.author.find(context, opts)
		]);

		for (const p of posts.docs) {
			if (p.seo?.noIndex) continue;
			entries.push({ loc: `/blog/${p.slug}`, lastmod: iso(p._meta?.updatedAt) });
		}
		for (const p of pages.docs) {
			if (p.seo?.noIndex) continue;
			entries.push({ loc: `/${p.slug}`, lastmod: iso(p._meta?.updatedAt) });
		}
		for (const t of tags.docs) {
			if (t.seo?.noIndex) continue;
			entries.push({ loc: `/tag/${t.slug}` });
		}
		for (const a of authors.docs) {
			if (a.seo?.noIndex) continue;
			entries.push({ loc: `/author/${a.slug}` });
		}
	} catch {
		// No org/content yet — still serve a valid (minimal) sitemap.
	}

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
	.map(
		(e) =>
			`	<url><loc>${origin}${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
