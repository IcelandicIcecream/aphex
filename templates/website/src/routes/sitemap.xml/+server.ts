import type { RequestHandler } from './$types';
import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import { docHref } from '$lib/utils/link';

/**
 * The sitemap, built from the CMS at request time.
 *
 * `perspective: 'published'` is passed explicitly rather than inherited from
 * `siteContext`: in development that context resolves to drafts, and a sitemap
 * listing unpublished URLs is worse than no sitemap. This is the one read on the
 * site that should never follow the preview perspective.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { aphexCMS } = locals;
	const [org] = await aphexCMS.databaseAdapter.findAllOrganizations();
	if (!org) return new Response('', { status: 404 });

	const context = { ...systemContext(org.id), perspective: 'published' as const };

	const [pages, posts] = await Promise.all([
		aphexCMS.localAPI.collections.page.find(context, { limit: 1000, public: true }),
		aphexCMS.localAPI.collections.post.find(context, { limit: 1000, public: true })
	]);

	interface Entry {
		loc: string;
		lastmod?: string;
	}

	const entries: Entry[] = [{ loc: '/' }, { loc: '/posts' }];

	for (const doc of pages.docs as Array<Record<string, any>>) {
		// `home` is already listed as `/`; listing it again as `/home` would
		// advertise a URL that 404s.
		if (doc.slug === 'home') continue;
		if (isNoIndex(doc)) continue;
		const loc = docHref('page', doc.slug);
		if (loc) entries.push({ loc, lastmod: iso(doc._meta?.updatedAt) });
	}

	for (const doc of posts.docs as Array<Record<string, any>>) {
		if (isNoIndex(doc)) continue;
		const loc = docHref('post', doc.slug);
		if (loc) entries.push({ loc, lastmod: iso(doc._meta?.updatedAt) });
	}

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
	.map(
		(entry) =>
			`\t<url><loc>${escapeXml(new URL(entry.loc, url.origin).href)}</loc>${
				entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''
			}</url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(body, {
		headers: {
			'content-type': 'application/xml',
			'cache-control': 'public, max-age=3600'
		}
	});
};

function iso(value: Date | string | null | undefined): string | undefined {
	if (!value) return undefined;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** A slug can legally contain `&`, which would otherwise break the document. */
/**
 * Documents the editor asked crawlers to skip.
 *
 * The page itself already emits `<meta name="robots" content="noindex">`, but a
 * sitemap is an invitation: listing a URL there and then telling the crawler to
 * ignore it once it arrives is a contradiction that wastes crawl budget and
 * shows up as a coverage warning in Search Console. The two have to agree.
 */
function isNoIndex(doc: Record<string, any>): boolean {
	return doc.seo?.noIndex === true;
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}
