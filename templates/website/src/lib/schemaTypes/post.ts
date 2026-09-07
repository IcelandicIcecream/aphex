import type { SchemaType } from '@aphexcms/cms-core';
import { searchableFields } from '@aphexcms/cms-core/schema';
import { Newspaper } from '@lucide/svelte';
import { richTextBlocks } from './objects/blocks.js';

/**
 * Post — a dated article with a body, categories and related reading.
 *
 * Where `page` is assembled from layout blocks, a post is one long rich-text
 * field. The blocks it can contain (banner, code, media) are declared as siblings
 * of `{ type: 'block' }` in `content.of`, which is what makes them appear between
 * paragraphs rather than inside them.
 *
 * Served at `/posts/<slug>`; listed at `/posts`.
 */
const fields: SchemaType['fields'] = [
	{
		name: 'title',
		type: 'string',
		title: 'Title',
		group: 'content',
		validation: (Rule) => Rule.required()
	},
	{
		name: 'slug',
		type: 'slug',
		title: 'Slug',
		source: 'title',
		group: 'content',
		validation: (Rule) => Rule.required()
	},
	{
		name: 'excerpt',
		type: 'text',
		title: 'Excerpt',
		rows: 2,
		description: 'One or two lines. Shown on cards and used as the SEO fallback.',
		group: 'content'
	},
	{
		name: 'heroImage',
		type: 'image',
		title: 'Hero image',
		group: 'content'
	},
	{
		name: 'content',
		type: 'array',
		title: 'Content',
		group: 'content',
		of: [
			{
				type: 'block',
				marks: {
					annotations: [
						{
							name: 'link',
							title: 'Link',
							fields: [
								{ name: 'href', type: 'url', title: 'URL' },
								{ name: 'blank', type: 'boolean', title: 'Open in new tab' }
							]
						}
					]
				}
			},
			{ type: 'image', title: 'Image' },
			...richTextBlocks
		],
		validation: (Rule) => Rule.required()
	},
	{
		name: 'categories',
		type: 'array',
		title: 'Categories',
		group: 'meta',
		of: [{ type: 'reference', to: [{ type: 'category' }] }]
	},
	{
		// Hand-picked further reading, rendered under the article. A post can't
		// reference itself in practice because the picker lists other documents,
		// but the renderer filters the current id out anyway — a copied document
		// can carry one.
		name: 'relatedPosts',
		type: 'array',
		title: 'Related posts',
		group: 'meta',
		of: [{ type: 'reference', to: [{ type: 'post' }] }]
	}
	// No `publishedAt` field: Aphex stamps one on the document when it's first
	// published (`_meta.publishedAt`), and `publishedAt` is a reserved column
	// name — a schema that declares one is rejected at startup. The archive sorts
	// on that column directly with `sort: '-publishedAt'`.
];

export const post: SchemaType = {
	type: 'document',
	name: 'post',
	title: 'Post',
	description: 'A dated article',
	icon: Newspaper,
	groups: [
		{ name: 'content', title: 'Content', default: true },
		{ name: 'meta', title: 'Meta' },
		{ name: 'seo', title: 'SEO' }
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'excerpt',
			media: 'heroImage'
		}
	},
	previewUrl: (doc) => {
		const slug = doc.slug as string | undefined;
		return slug ? `/posts/${slug}?aphex-preview=1` : null;
	},
	// No `orderings` on `publishedAt`: `orderings` may only name fields the
	// schema itself declares, and `publishedAt` is a document column rather than
	// a field. The public archive still sorts by it — `sort` in a query accepts
	// document columns, `orderings` (an admin-list affordance) does not.
	search: searchableFields({ fields }),
	fields
};

export default post;
