import type { SchemaType } from '@aphexcms/cms-core';
import { FileText, AlignLeft, AlignCenter, AlignRight } from '@lucide/svelte';
import {
	callout,
	codeBlock,
	embed,
	toggle,
	divider,
	button,
	gallery,
	contactForm
} from './objects/blocks.js';
import { hero } from './hero.js';
import { seo } from './seo.js';
import { textBlock } from './textBlock.js';
import { imageBlock } from './imageBlock.js';

export const page: SchemaType = {
	type: 'document',
	name: 'page',
	title: 'Page',
	description: 'A standalone page (About, Contact, …) served at its own URL',
	icon: FileText,
	groups: [
		{ name: 'content', title: 'Content', default: true },
		{ name: 'settings', title: 'Configuration' },
		{ name: 'seo', title: 'SEO' }
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'excerpt',
			media: 'coverImage'
		}
	},
	previewUrl: (doc) => {
		const slug = doc.slug as string | undefined;
		return slug ? `/${slug}?aphex-preview=1` : null;
	},
	fields: [
		// Declared here but not in the app's page schema. The suite writes and
		// asserts on both, and now that undeclared keys are rejected as structural
		// errors, a fixture has to declare everything its tests exercise — which is
		// the point of the fixtures owning their own schemas.
		{
			name: 'published',
			type: 'boolean',
			title: 'Published'
		},
		{
			name: 'hero',
			type: 'object',
			title: 'Hero',
			// Reuses the `hero` object fixture's fields rather than restating them.
			// Restating them is how this drifted in the first place: `ctaUrl` was
			// declared `url` here and `string` there, so a relative CTA link like
			// `/about` — ordinary content — failed the auto absolute-URL rule.
			fields: hero.fields
		},
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
			group: 'settings',
			description: 'Lives at the site root, e.g. /about',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'excerpt',
			type: 'text',
			title: 'Excerpt',
			description: 'Optional summary shown under the title and in social previews',
			group: 'content'
		},
		{
			name: 'coverImage',
			type: 'image',
			title: 'Cover Image',
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
				callout,
				codeBlock,
				embed,
				toggle,
				divider,
				button,
				gallery,
				contactForm,
				// Legacy content blocks the versioning suite writes as page content.
				// Array items are checked against `of`, so a type a test embeds has to
				// be declared — same rule as `published`/`hero` above.
				textBlock,
				imageBlock
			]
			// Deliberately NOT required here, unlike the app's page schema.
			// `page` is the generic document the versioning, singleton, reference and
			// cache suites all use, so requiring a rich-text array would make every
			// unrelated test carry content it doesn't care about. Required-field
			// behaviour is covered on purpose-built fixtures (testProduct, simpleDoc,
			// initialValueTest) and by `title`/`slug` above, which stay required.
		},
		// Reuses the `seo` object fixture's field list rather than restating it, so
		// the two can't drift.
		{
			name: 'seo',
			type: 'object',
			title: 'SEO',
			group: 'seo',
			fields: seo.fields
		},
		{
			name: 'containerPadding',
			type: 'number',
			title: 'Container padding',
			description: 'Inner spacing around the page content container.',
			group: 'settings',
			min: 0,
			max: 200,
			step: 4,
			initialValue: 0,
			options: { layout: 'slider', unit: 'px' }
		},
		{
			name: 'headerAlign',
			type: 'string',
			title: 'Header alignment',
			description: 'Alignment of the title and excerpt.',
			group: 'settings',
			initialValue: 'left',
			list: [
				{ title: 'Left', value: 'left', icon: AlignLeft },
				{ title: 'Center', value: 'center', icon: AlignCenter },
				{ title: 'Right', value: 'right', icon: AlignRight }
			],
			options: { layout: 'tabs' }
		}
		// SEO is auto-injected by seoPlugin({ collections: [...] }) in plugins.ts.
	]
};

export default page;
