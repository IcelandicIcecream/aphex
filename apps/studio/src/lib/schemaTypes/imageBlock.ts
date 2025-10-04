import type { SchemaType } from '@aphex/cms-core';

export const imageBlock: SchemaType = {
	type: 'object',
	name: 'imageBlock',
	title: 'Image Block',
	description: 'An image with caption and alt text',
	fields: [
		{
			name: 'image',
			type: 'image',
			title: 'Image',
			description: 'The main image',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'caption',
			type: 'string',
			title: 'Image Caption',
			description: 'Optional caption displayed below the image'
		},
		{
			name: 'alt',
			type: 'string',
			title: 'Alt Text',
			description: 'Alternative text for accessibility and SEO',
			validation: (Rule) => Rule.required().max(200)
		}
	]
};

export default imageBlock;
