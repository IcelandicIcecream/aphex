import type { SchemaType } from '@aphexcms/cms-core';

/**
 * Self-referencing document, for exercising reference chains of arbitrary depth
 * (including cycles) without needing a different schema per level.
 *
 * `next` is a single hop, `children` an array of hops, and `nested.link` puts a
 * reference *inside an object* — the three shapes a resolver has to walk, and
 * the ones most likely to be missed by a depth-limited or field-shallow walk.
 */
const chainNode: SchemaType = {
	name: 'chainNode',
	title: 'Chain Node',
	type: 'document',
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'next',
			type: 'reference',
			title: 'Next',
			to: [{ type: 'chainNode' }]
		},
		{
			name: 'children',
			type: 'array',
			title: 'Children',
			of: [{ type: 'reference', to: [{ type: 'chainNode' }] }]
		},
		{
			name: 'nested',
			type: 'object',
			title: 'Nested',
			fields: [
				{
					name: 'link',
					type: 'reference',
					title: 'Link',
					to: [{ type: 'chainNode' }]
				}
			]
		}
	]
};

export default chainNode;
