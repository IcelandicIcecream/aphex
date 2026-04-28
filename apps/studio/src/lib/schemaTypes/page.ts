import type { SchemaType } from '@aphexcms/cms-core';
import { FileText } from '@lucide/svelte';
import hero from './hero.js';
import seo from './seo.js';

export const page: SchemaType = {
	type: 'document',
	name: 'page',
	title: 'Page',
	description: 'Website pages with Hero, Content blocks, and SEO',
	icon: FileText,
	// group: 'Content',
	groups: [
		{ name: 'content', title: 'Content', default: true },
		{ name: 'seo', title: 'SEO' },
		{ name: 'settings', title: 'Settings' }
	],
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Page Title',
			description: 'The main title of the page',
			validation: (Rule) => Rule.required().max(100),
			group: 'content'
		},
		{
			name: 'slug',
			type: 'slug',
			title: 'URL Slug',
			description: 'The URL path for this page',
			source: 'title',
			validation: (Rule) => Rule.required(),
			group: 'settings'
		},
		{
			name: 'hero',
			type: 'object',
			title: 'Hero Section',
			fields: hero.fields,
			group: 'content'
		},
		{
			name: 'content',
			type: 'array',
			title: 'Content Blocks',
			description: 'Flexible content sections',
			of: [
				{ type: 'textBlock' },
				{ type: 'imageBlock' },
				{ type: 'callToAction' },
				{ type: 'catalogBlock' },
				{ type: 'richContentBlock' }
			],
			group: 'content'
		},
		{
			name: 'seo',
			type: 'object',
			title: 'SEO Settings',
			fields: seo.fields,
			group: 'seo'
		},
		{
			name: 'published',
			type: 'boolean',
			title: 'Published',
			description: 'Whether this page is publicly visible',
			initialValue: false,
			group: 'settings'
		}
	]
};

export default page;
