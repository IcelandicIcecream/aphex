import type { SchemaType } from '@aphexcms/cms-core';
import { FileText, AlignLeft, AlignCenter, AlignRight } from '@lucide/svelte';
import { callout, codeBlock } from './objects/blocks.js';

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
				codeBlock
			],
			validation: (Rule) => Rule.required()
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
