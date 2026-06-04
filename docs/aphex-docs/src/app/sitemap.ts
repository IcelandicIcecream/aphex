import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://docs.getaphex.com';

export default function sitemap(): MetadataRoute.Sitemap {
	const pages = source.getPages();

	return pages.map((page) => ({
		url: `${SITE_URL}${page.url}`,
		lastModified: page.data.lastModified ? new Date(page.data.lastModified) : new Date(),
		changeFrequency: page.url === '/' ? 'weekly' : 'monthly',
		priority: page.url === '/' ? 1.0 : 0.7
	}));
}
