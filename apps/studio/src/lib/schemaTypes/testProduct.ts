import type { DocumentType } from '@aphexcms/cms-core';
import { Package } from '@lucide/svelte';

export const testProduct: DocumentType = {
	type: 'document',
	name: 'testProduct',
	title: 'Sort Test',
	description: 'A test document type to demonstrate sorting with various field types',
	icon: Package,
	fields: [
		{
			name: 'name',
			type: 'string',
			title: 'Product Name',
			description: 'The name of the product',
			validation: (Rule) => Rule.required().max(100)
		},
		{
			name: 'sku',
			type: 'string',
			title: 'SKU',
			description: 'Stock keeping unit',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'price',
			type: 'number',
			title: 'Price',
			description: 'Product price in USD',
			validation: (Rule) => Rule.required().min(0)
		},
		{
			name: 'stockQuantity',
			type: 'number',
			title: 'Stock Quantity',
			description: 'Number of items in stock',
			validation: (Rule) => Rule.min(0)
		},
		{
			name: 'inStock',
			type: 'boolean',
			title: 'In Stock',
			description: 'Is this product currently in stock?'
		},
		{
			name: 'releaseDate',
			type: 'date',
			title: 'Release Date',
			description: 'When the product was released'
		},
		{
			name: 'lastRestocked',
			type: 'datetime',
			title: 'Last Restocked',
			description: 'Date and time of last restock'
		},
		{
			name: 'description',
			type: 'text',
			title: 'Description',
			description: 'Product description',
			rows: 4
		},
		{
			name: 'category',
			type: 'string',
			title: 'Category',
			list: ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books']
		},
		{
			name: 'image',
			type: 'image',
			title: 'Product Image'
		}
	],
	preview: {
		select: {
			title: 'name',
			subtitle: 'sku',
			media: 'image'
		}
	},
	orderings: [
		{
			title: 'Product Name',
			name: 'nameDesc',
			by: [{ field: 'name', direction: 'desc' }]
		},
		{
			title: 'Price',
			name: 'priceDesc',
			by: [{ field: 'price', direction: 'desc' }]
		},
		{
			title: 'Stock Quantity',
			name: 'stockDesc',
			by: [{ field: 'stockQuantity', direction: 'desc' }]
		},
		{
			title: 'Release Date',
			name: 'releaseDateDesc',
			by: [{ field: 'releaseDate', direction: 'desc' }]
		},
		{
			title: 'Last Restocked',
			name: 'lastRestockedDesc',
			by: [{ field: 'lastRestocked', direction: 'desc' }]
		}
	]
};

export default testProduct;
