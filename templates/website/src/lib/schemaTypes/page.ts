import type { SchemaType } from '@aphexcms/cms-core';
import { searchableFields } from '@aphexcms/cms-core/schema';
import { FileText } from '@lucide/svelte';
import { heroField } from './fields/hero.js';
import { layoutBlocks } from './objects/blocks.js';

/**
 * Page — a hero plus a stack of layout blocks.
 *
 * This is the page-builder document: an editor picks a hero treatment, then
 * assembles the body out of the blocks in `objects/blocks.ts`. The route
 * `(site)/[slug]` renders whatever comes out, so a new block never needs a new
 * route.
 *
 * The page whose slug is `home` is served at `/` — see `(site)/+page.server.ts`.
 * SEO fields are injected by `seoPlugin({ collections: [...] })` in `plugins.ts`,
 * not declared here.
 */
const fields: SchemaType['fields'] = [
	{
		// Title and slug are listed in *both* tabs (`group` accepts an array).
		// They're the page's identity, and a page builder is a tab-switching
		// activity — having to leave the Hero tab to check what the page is
		// called is exactly the friction tabs were supposed to remove. Only one
		// group renders at a time, so this is one field shown in two places, not
		// two fields.
		name: 'title',
		type: 'string',
		title: 'Title',
		group: ['hero', 'content'],
		validation: (Rule) => Rule.required()
	},
	{
		// A bare string — "about", never Sanity's `{ current }`. It filters directly
		// in a `where` clause, which is exactly what `(site)/[slug]` does.
		name: 'slug',
		type: 'slug',
		title: 'Slug',
		source: 'title',
		description: 'The URL path this page is served at. Use “home” for the front page.',
		group: ['hero', 'content'],
		validation: (Rule) => Rule.required()
	},
	heroField('hero'),
	{
		name: 'layout',
		type: 'array',
		title: 'Layout',
		description: 'The page body, block by block.',
		group: 'content',
		of: layoutBlocks
	}
	// No `publishedAt` field: Aphex stamps one on the document itself when it's
	// first published, readable as `_meta.publishedAt`. Declaring one here would
	// shadow a reserved column and the engine rejects that at startup.
];

export const page: SchemaType = {
	type: 'document',
	name: 'page',
	title: 'Page',
	description: 'A standalone page assembled from layout blocks',
	icon: FileText,
	// Hero first, and the tab the editor lands on: a page is built top-down, and
	// the hero is the top. Group order is tab order; `default` picks the active one.
	groups: [
		{ name: 'hero', title: 'Hero', default: true },
		{ name: 'content', title: 'Content' },
		{ name: 'seo', title: 'SEO' }
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'slug',
			media: 'hero.media'
		}
	},
	previewUrl: (doc) => {
		const slug = doc.slug as string | undefined;
		if (!slug) return null;
		return slug === 'home' ? '/?aphex-preview=1' : `/${slug}?aphex-preview=1`;
	},
	search: searchableFields({ fields }),
	fields
};

export default page;
