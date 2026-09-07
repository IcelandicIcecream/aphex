import type { RequestHandler } from './$types';

/**
 * `robots.txt`, served from a route rather than `static/`.
 *
 * The only reason it isn't a static file is the `Sitemap:` line: that directive
 * must be an absolute URL — a relative one is ignored by every major crawler —
 * and a static file can't know the host it will be served from. Rendering it per
 * request means the deployed domain is filled in from the request itself, and a
 * preview deploy or a custom domain gets a correct sitemap reference with
 * nothing to remember to edit.
 *
 * The disallow list covers the studio and the API surface. `/search` is excluded
 * because query-string result pages are thin duplicates of content that is
 * already indexed under its own URLs.
 */
export const GET: RequestHandler = ({ url }) => {
	const body = `# Allow crawling everything except the studio and the API surface.
User-agent: *
Disallow: /admin
Disallow: /god-mode
Disallow: /api/
Disallow: /login
Disallow: /search

# Built from the CMS at request time by src/routes/sitemap.xml/+server.ts.
Sitemap: ${new URL('/sitemap.xml', url.origin).href}
`;

	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
};
