import type { SchemaType } from '@aphexcms/cms-core';

export const seo: SchemaType = {
	type: 'object',
	name: 'seo',
	title: 'SEO Settings',
	description: 'Search engine optimization and social media settings',
	fields: [
		{
			name: 'metaTitle',
			type: 'string',
			title: 'Meta Title',
			description: 'Title shown in search results and browser tabs',
			maxLength: 60,
			validation: (Rule) => Rule.max(60)
		},
		{
			name: 'metaDescription',
			type: 'text',
			title: 'Meta Description',
			description: 'Description shown in search results',
			rows: 3,
			maxLength: 160,
			validation: (Rule) => Rule.max(160)
		},
		{
			name: 'metaImage',
			type: 'image',
			title: 'Meta Image',
			description: 'Image for social media sharing (Open Graph)'
		}
	]
};

export default seo;
