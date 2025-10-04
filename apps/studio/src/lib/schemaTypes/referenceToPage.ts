import type { SchemaType } from '@aphex/cms-core';

export const referenceToPage: SchemaType = {
	type: 'document',
	name: 'referenceToPage',
	title: 'Page Reference',
	description: 'A reference to a page',
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Page Title',
			description: 'The main title of the page',
			validation: (Rule) => Rule.required().max(100)
		},
		{
			name: 'pageReference',
			type: 'reference',
			title: 'Select Page',
			description: 'Choose Page',
			to: [{ type: 'page' }],
			validation: (Rule) => Rule.required()
		}
	]
};

export default referenceToPage;
