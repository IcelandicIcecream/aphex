import type { SchemaType } from '@aphexcms/cms-core';

// A minimal example so a fresh install shows something in the admin.
// Add your own document/object schemas alongside this and register them in index.ts.
const page: SchemaType = {
	type: 'document',
	name: 'page',
	title: 'Page',
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'slug',
			type: 'slug',
			title: 'Slug',
			source: 'title',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'body',
			type: 'text',
			title: 'Body',
			rows: 8
		}
	]
};

export default page;
