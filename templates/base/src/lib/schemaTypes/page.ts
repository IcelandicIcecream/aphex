import type { SchemaType } from '@aphexcms/cms-core';
import FileText from '@lucide/svelte/icons/file-text';

export const page: SchemaType = {
	type: 'document',
	name: 'page',
	title: 'Page',
	description: 'Basic page content',
	icon: FileText,
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title',
			description: 'Page title',
			validation: (Rule) => Rule.required().max(200)
		},
		{
			name: 'slug',
			type: 'slug',
			title: 'Slug',
			description: 'URL-friendly identifier',
			options: {
				source: 'title',
				maxLength: 96
			},
			validation: (Rule) => Rule.required()
		},
		{
			name: 'description',
			type: 'text',
			title: 'Description',
			description: 'Page description',
			rows: 3,
			validation: (Rule) => Rule.max(500)
		},
		{
			name: 'content',
			type: 'array',
			title: 'Content',
			description: 'Page content blocks',
			of: [{ type: 'textBlock' }, { type: 'imageBlock' }]
		},
		{
			name: 'featuredImage',
			type: 'image',
			title: 'Featured Image',
			description: 'Main page image'
		},
		{
			name: 'seo',
			type: 'object',
			title: 'SEO',
			description: 'Search engine optimization settings',
			fields: [
				{
					name: 'metaTitle',
					type: 'string',
					title: 'Meta Title',
					validation: (Rule) => Rule.max(60)
				},
				{
					name: 'metaDescription',
					type: 'string',
					title: 'Meta Description',
					validation: (Rule) => Rule.max(160)
				}
			]
		}
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'description',
			media: 'featuredImage'
		}
	}
};

export default page;
