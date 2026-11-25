import type { SchemaType } from '@aphexcms/cms-core';

/**
 * Purpose-built fixture for validation behaviour — required fields, nested
 * objects, arrays of objects, and (crucially) what happens to keys that aren't
 * in the schema at all.
 *
 * Kept deliberately small and stable. Unlike the app's schemas this one exists
 * only to be asserted against, so nothing here should change to suit a feature.
 */
/** A block registered on its own, so its fields live outside `strictDoc`. */
export const strictBlock: SchemaType = {
	name: 'strictBlock',
	title: 'Strict Block',
	type: 'object',
	fields: [
		{ name: 'symbol', type: 'string', title: 'Symbol' },
		{ name: 'emoji', type: 'string', title: 'Emoji', deprecated: { reason: 'Use "symbol".' } }
	]
};

const strictDoc: SchemaType = {
	name: 'strictDoc',
	title: 'Strict Doc',
	type: 'document',
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'count',
			type: 'number',
			title: 'Count',
			validation: (Rule) => Rule.min(0).max(10)
		},
		{
			name: 'meta',
			type: 'object',
			title: 'Meta',
			fields: [
				{
					name: 'label',
					type: 'string',
					title: 'Label',
					validation: (Rule) => Rule.required()
				},
				{ name: 'note', type: 'string', title: 'Note' }
			]
		},
		{ name: 'blocks', type: 'array', title: 'Blocks', of: [{ type: 'strictBlock' }] },
		{
			name: 'tags',
			type: 'array',
			title: 'Tags',
			of: [
				{
					type: 'object',
					name: 'tagEntry',
					fields: [
						{
							name: 'value',
							type: 'string',
							title: 'Value',
							validation: (Rule) => Rule.required()
						}
					]
				}
			]
		}
	]
};

export default strictDoc;
