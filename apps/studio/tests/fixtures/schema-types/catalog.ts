import type { SchemaType } from '@aphexcms/cms-core';
import { ShoppingBag } from '@lucide/svelte';

export const catalog: SchemaType = {
	type: 'document',
	name: 'catalog',
	title: 'Catalog',
	description: 'A product catalog with multiple items',
	icon: ShoppingBag,
	// group: 'Marketing',
	preview: {
		select: {
			title: 'title',
			subtitle: 'description'
		}
	},
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
			// Two shapes on purpose, because the suites exercise both: a reference to
			// a standalone catalogItem document (references.test.ts) and an inline
			// item embedded in the catalog (the comprehensive Local/HTTP suites).
			// Array items are now checked against `of`, so anything a test writes
			// has to be declared here.
			of: [
				{ type: 'reference', to: [{ type: 'catalogItem' }] },
				{
					name: 'catalogItem',
					type: 'object',
					title: 'Inline Catalog Item',
					fields: [
						{ name: 'title', type: 'string', title: 'Item Title' },
						{ name: 'shortDescription', type: 'text', title: 'Short Description' },
						{ name: 'price', type: 'number', title: 'Price' }
					]
				}
			]
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
