import type { SchemaType } from '@aphexcms/cms-core';
import { Utensils } from '@lucide/svelte';

export const menuItem: SchemaType = {
	type: 'document',
	name: 'menuItem',
	title: 'Menu Item',
	description: 'A single dish on a menu',
	icon: Utensils,
	preview: {
		select: {
			title: 'name',
			subtitle: 'shortDescription'
		}
	},
	fields: [
		{
			name: 'name',
			type: 'string',
			title: 'Name',
			validation: (Rule) => Rule.required().max(100)
		},
		{
			name: 'shortDescription',
			type: 'text',
			title: 'Short Description',
			rows: 2,
			validation: (Rule) => Rule.max(200)
		},
		{
			name: 'price',
			type: 'number',
			title: 'Price',
			validation: (Rule) => Rule.required().min(0)
		}
	]
};

export default menuItem;
