import type { SchemaType } from '@aphexcms/cms-core';
import { Tags } from '@lucide/svelte';

/**
 * Category — the one taxonomy in this template.
 *
 * Deliberately two fields. It exists so posts can be grouped and the archive
 * block can be narrowed; anything richer belongs on the post itself.
 */
export const category: SchemaType = {
	type: 'document',
	name: 'category',
	title: 'Category',
	description: 'Groups posts',
	icon: Tags,
	preview: { select: { title: 'title', subtitle: 'slug' } },
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
		}
	]
};

export default category;
