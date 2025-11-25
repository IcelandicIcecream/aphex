import type { SchemaType } from '@aphexcms/cms-core';
import { ShoppingBag } from '@lucide/svelte';

export const catalog: SchemaType = {
	type: 'document',
	name: 'catalog',
	title: 'Catalog',
	description: 'A product catalog with multiple items',
	icon: ShoppingBag,
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Catalog Title',
			description: 'The main title of the catalog',
			validation: (Rule) => Rule.required().max(100)
		},
		{
			name: 'description',
			type: 'text',
			title: 'Catalog Description',
			description: 'Description of what this catalog contains',
			rows: 4,
			validation: (Rule) => Rule.required()
		},
		{
			name: 'items',
			type: 'array',
			title: 'Catalog Items',
			description: 'List of items in this catalog',
			of: [{ type: 'catalogItem' }]
		},
		{
			name: 'published',
			type: 'boolean',
			title: 'Published',
			description: 'Whether this catalog is publicly visible',
			initialValue: false
		}
	]
};

export default catalog;
