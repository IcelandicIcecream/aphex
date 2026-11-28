import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://docs.getaphex.com';

export default function robots(): MetadataRoute.Robots {
	// The experimental build's docs stay out of search, so only the stable docs are listed.
	if (process.env.NEXT_PUBLIC_DOCS_CHANNEL === 'next') {
		return { rules: [{ userAgent: '*', disallow: '/' }] };
	}
	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: ['/api/', '/og/']
			}
		],
		sitemap: `${SITE_URL}/sitemap.xml`
	};
}
