import type { SchemaType } from '@aphexcms/cms-core';
import { BookOpen } from '@lucide/svelte';
import { callout, codeBlock, embed, toggle, divider, button, gallery } from './objects/blocks.js';

const blogPost: SchemaType = {
	type: 'document',
	name: 'blog_post',
	title: 'Blog Post',
	description: 'A blog post with rich text content',
	icon: BookOpen,
	groups: [
		{ name: 'content', title: 'Content', default: true },
		{ name: 'settings', title: 'Settings' },
		{ name: 'seo', title: 'SEO' }
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'excerpt',
			media: 'coverImage'
		}
	},
	// Relative path — resolved against the studio's own origin for the preview
	// iframe. Return an absolute URL here to point the preview at a separate
	// public site (e.g. `${import.meta.env.VITE_SITE_URL}/blog/${slug}`).
	previewUrl: (doc) => {
		const slug = doc.slug as string | undefined;
		return slug ? `/blog/${slug}?aphex-preview=1` : null;
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
			validation: (Rule) => Rule.required()
		},
		{
			name: 'author',
			type: 'reference',
			title: 'Author',
			to: [{ type: 'author' }],
			group: 'settings'
		},
		{
			name: 'postDate',
			type: 'date',
			title: 'Published Date',
			group: 'settings'
		},
		{
			name: 'excerpt',
			type: 'text',
			title: 'Excerpt',
			description: 'A short summary shown on the blog listing page',
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
									{
										name: 'blank',
										type: 'boolean',
										title: 'Open in new tab'
									}
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
				gallery
			],
			validation: (Rule) => Rule.required()
		},
		{
			name: 'tags',
			type: 'array',
			title: 'Tags',
			group: 'settings',
			description: 'Topics this post belongs to',
			of: [{ type: 'reference', to: [{ type: 'tag' }] }]
		}
		// SEO is auto-injected by seoPlugin({ collections: [...] }) in plugins.ts.
	]
};

export default blogPost;
