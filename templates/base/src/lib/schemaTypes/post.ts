import type { SchemaType } from '@aphexcms/cms-core';

const post: SchemaType = {
	type: 'document',
	name: 'post',
	title: 'Post',
	description: 'Blog posts',
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'slug',
			type: 'slug',
			title: 'Slug',
			source: 'title',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'excerpt',
			type: 'text',
			title: 'Excerpt',
			description: 'A short summary of the post'
		},
		{
			name: 'content',
			type: 'text',
			title: 'Content'
		},
		{
			name: 'coverImage',
			type: 'image',
			title: 'Cover Image'
		},
		{
			name: 'published',
			type: 'boolean',
			title: 'Published',
			initialValue: false
		}
	]
};

export default post;
