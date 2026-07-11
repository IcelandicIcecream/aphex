import type { SchemaType } from '@aphexcms/cms-core';
import { Tag } from '@lucide/svelte';
import { seoField } from '@aphexcms/plugin-seo/schema';

const tag: SchemaType = {
	type: 'document',
	name: 'tag',
	title: 'Tag',
	description: 'A topic that groups related posts together',
	icon: Tag,
	preview: {
		select: {
			title: 'title',
			subtitle: 'description'
		}
	},
	previewUrl: (doc) => {
		const slug = doc.slug as string | undefined;
		return slug ? `/tag/${slug}?aphex-preview=1` : null;
	},
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title',
			validation: (Rule) => Rule.required().max(60)
		},
		{
			name: 'slug',
			type: 'slug',
			title: 'Slug',
			source: 'title',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'description',
			type: 'text',
			title: 'Description',
			description: 'Shown on the tag archive page'
		},
		seoField()
	]
};

export default tag;
