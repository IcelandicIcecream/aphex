import type { SchemaType } from '@aphexcms/cms-core';
import { BookOpen } from '@lucide/svelte';

export const menu: SchemaType = {
	type: 'document',
	name: 'menu',
	title: 'Menu',
	description: 'A menu composed of references to menu items',
	icon: BookOpen,
	preview: {
		select: {
			title: 'title',
			subtitle: 'subtitle'
		}
	},
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title',
			validation: (Rule) => Rule.required().max(100)
		},
		{
			name: 'subtitle',
			type: 'string',
			title: 'Subtitle',
			description: 'Optional tagline shown under the title'
		},
		{
			name: 'items',
			type: 'array',
			title: 'Items',
			description: 'Pick the menu items to include — they must be published before this menu can be published',
			of: [{ type: 'reference', to: [{ type: 'menuItem' }] }],
			validation: (Rule) => Rule.required().min(1)
		}
	]
};

export default menu;
