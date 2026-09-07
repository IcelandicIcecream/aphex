import { FileText } from '@lucide/svelte';
import type { SchemaType } from '@aphexcms/cms-core';

/**
 * The one example schema, kept deliberately small but deliberately *complete*:
 * it exercises field groups, rich text with a custom annotation, an image with
 * per-placement alt, a slug derived from the title, validation, list previews
 * and a live-preview URL. That is the tour — everything the studio can do that
 * a plain title-and-textarea would never reveal.
 *
 * It is still one document type and still disposable. Delete it once your own
 * schemas exist; nothing else in the template depends on it except the two
 * routes that render it.
 */
const page: SchemaType = {
	type: 'document',
	name: 'page',
	title: 'Page',
	description: 'A standalone page served at its own URL',
	// Document types can carry a Lucide icon — it shows in the type list.
	icon: FileText,

	// Groups become tabs at the top of the editor. Without them every field
	// stacks into one long column, which is fine for three fields and miserable
	// for thirty.
	groups: [
		{ name: 'content', title: 'Content', default: true },
		{ name: 'media', title: 'Media' },
		{ name: 'seo', title: 'SEO' }
	],

	// How the document appears in lists: which fields supply the title, the line
	// underneath, and the thumbnail.
	preview: {
		select: {
			title: 'title',
			subtitle: 'excerpt'
			// media: 'coverImage' <-- WIP
		}
	},

	// Gives the editor a "view live" affordance and drives visual editing.
	previewUrl: (doc) => {
		const slug = doc.slug as string | undefined;
		return slug ? `/${slug}?aphex-preview=1` : null;
	},

	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title',
			group: 'content',
			validation: (Rule) => Rule.required()
		},
		{
			// `source` auto-derives the slug from another field as you type, and it
			// stores a bare string — "about", not an object.
			name: 'slug',
			type: 'slug',
			title: 'Slug',
			source: 'title',
			description: 'The URL path this page is served at.',
			group: 'content',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'excerpt',
			type: 'text',
			title: 'Excerpt',
			rows: 2,
			description: 'One or two lines. Shown in listings and used as the SEO fallback.',
			group: 'content'
		},
		{
			// Rich text is an array of blocks, not a field type of its own — the same
			// Portable Text model Sanity uses. `{ type: 'block' }` in `of` is what
			// turns the array into the editor.
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
				// A sibling of `block` is a block-level type: it sits between
				// paragraphs rather than inside them. `image` is built in and opens the
				// asset browser.
				{ type: 'image', title: 'Image' }
			]
		},
		{
			name: 'coverImage',
			type: 'image',
			title: 'Cover image',
			description: 'Opens the asset browser. Alt text can be set per placement.',
			group: 'media'
		},
		{
			name: 'seoTitle',
			type: 'string',
			title: 'SEO title',
			description: 'Falls back to the page title when empty.',
			group: 'seo'
		},
		{
			name: 'seoDescription',
			type: 'text',
			title: 'SEO description',
			rows: 3,
			description: 'Falls back to the excerpt when empty.',
			group: 'seo'
		}
	]
};

export default page;
