import { describe, expect, it } from 'vitest';
import { resolveSeo } from '../src/lib/head';

const asset = (url: string, width = 1200, height = 630) => ({
	_ref: 'a1',
	url,
	width,
	height,
	alt: 'A loaf'
});

describe('resolveSeo', () => {
	it('uses the SEO fields, with the site’s name in the title', () => {
		const meta = resolveSeo(
			{
				title: 'Classes',
				seo: {
					metaTitle: 'Sourdough classes',
					metaDescription: 'Learn to bake.',
					ogImage: { asset: asset('/media/a1/loaf.jpg') }
				}
			},
			{ url: 'https://lilys.example/classes?utm_source=x#top', siteName: 'Lily’s Bakery' }
		);
		expect(meta).toEqual({
			title: 'Sourdough classes — Lily’s Bakery',
			headline: 'Sourdough classes',
			description: 'Learn to bake.',
			canonical: 'https://lilys.example/classes',
			robots: null,
			type: 'website',
			siteName: 'Lily’s Bakery',
			image: {
				url: 'https://lilys.example/media/a1/loaf.jpg',
				width: 1200,
				height: 630,
				alt: 'A loaf'
			}
		});
	});

	it('falls back to the document’s own title, description and picture', () => {
		const meta = resolveSeo(
			{
				title: 'Classes',
				excerpt: 'Bread, by hand.',
				coverImage: { asset: asset('https://cdn.example/c.jpg') }
			},
			{ url: 'https://lilys.example/classes', siteName: 'Lily’s Bakery', type: 'article' }
		);
		expect(meta).toMatchObject({
			headline: 'Classes',
			description: 'Bread, by hand.',
			type: 'article'
		});
		expect(meta.image?.url).toBe('https://cdn.example/c.jpg');
	});

	it('then to a fallback image, and to the site’s name for a page with no title', () => {
		const meta = resolveSeo(
			{},
			{
				url: 'https://lilys.example/',
				siteName: 'Lily’s Bakery',
				fallbackImage: { asset: asset('/logo.png') }
			}
		);
		expect(meta.title).toBe('Lily’s Bakery');
		expect(meta.image?.url).toBe('https://lilys.example/logo.png');
	});

	it('asks search engines to skip a hidden page', () => {
		expect(
			resolveSeo({ seo: { noIndex: true } }, { url: 'https://lilys.example/thanks' }).robots
		).toBe('noindex');
	});

	it('takes a canonical override, relative to the page', () => {
		expect(
			resolveSeo({}, { url: 'https://lilys.example/blog?page=2', canonical: '/blog' }).canonical
		).toBe('https://lilys.example/blog');
	});
});
