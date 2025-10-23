import type { SchemaType } from '@aphex/cms-core';

export const hero: SchemaType = {
	type: 'object',
	name: 'hero',
	title: 'Hero Section',
	description: 'Main hero area at the top of the page',
	fields: [
		{
			name: 'heading',
			type: 'string',
			title: 'Hero Heading',
			description: 'Main headline text',
			validation: (Rule) => Rule.required().max(120)
		},
		{
			name: 'subheading',
			type: 'text',
			title: 'Hero Subheading',
			description: 'Supporting text below the main heading',
			rows: 2
		},
		{
			name: 'backgroundImage',
			type: 'image',
			title: 'Background Image',
			description: 'Hero background image',
			private: true
		},
		{
			name: 'ctaText',
			type: 'string',
			title: 'CTA Button Text',
			description: 'Call-to-action button text',
			maxLength: 50
		},
		{
			name: 'ctaUrl',
			type: 'string',
			title: 'CTA Button URL',
			description: 'Where the CTA button should link to'
		}
	]
};

export default hero;
