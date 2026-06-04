import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://docs.getaphex.com';

export default function robots(): MetadataRoute.Robots {
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
