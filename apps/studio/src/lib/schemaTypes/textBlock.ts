import type { SchemaType } from '@aphex/cms-core';

export const textBlock: SchemaType = {
	type: 'object',
	name: 'textBlock',
	title: 'Text Block',
	description: 'A block of text content with optional heading',
	fields: [
		{
			name: 'heading',
			type: 'string',
			title: 'Section Heading',
			description: 'Optional heading for this text section'
		},
		{
			name: 'content',
			type: 'text',
			title: 'Text Content',
			description: 'The main text content',
			rows: 6,
			validation: (Rule) => Rule.required()
		}
	]
};

export default textBlock;
