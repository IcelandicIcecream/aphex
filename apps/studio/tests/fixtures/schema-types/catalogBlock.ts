import type { SchemaType } from '@aphexcms/cms-core';

export const catalogBlock: SchemaType = {
	type: 'object',
	name: 'catalogBlock',
	title: 'Catalog Block',
	description: 'A content block that displays a curated list of catalog items',
	preview: {
		select: {
			title: 'title',
			subtitle: 'displayOptions.layout'
		}
	},
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Block Title',
			description: 'Optional title for this catalog section'
		},
		{
			name: 'items',
			type: 'array',
			title: 'Featured Items',
			description: 'Pick the catalog items to feature in this block',
			of: [{ type: 'reference', to: [{ type: 'catalogItem' }] }],
			validation: (Rule) => Rule.required().min(1)
		},
		{
			name: 'displayOptions',
			type: 'object',
			title: 'Display Options',
			fields: [
				{
					name: 'showPrices',
					type: 'boolean',
					title: 'Show Prices',
					description: 'Whether to display item prices',
					initialValue: true
				},
				{
					name: 'layout',
					type: 'string',
					title: 'Layout Style',
					description: 'How to display the catalog items',
					validation: (Rule) =>
						Rule.custom((value: unknown) => {
							const allowed = ['grid', 'list', 'cards'];
							if (typeof value === 'string' && !allowed.includes(value)) {
								return `Must be one of: ${allowed.join(', ')}`;
							}
							return true;
						})
				}
			]
		}
	]
};

export default catalogBlock;
