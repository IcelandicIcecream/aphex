import type { SchemaType } from '@aphexcms/cms-core';

const dataImport: SchemaType = {
	type: 'document',
	name: 'dataImport',
	title: 'Data Import',
	description: 'CSV file uploads for data imports',
	// group: 'Testing',
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'file',
			type: 'file',
			title: 'Text File',
			accept: ['text/plain', '.txt'],
			description: 'Upload a CSV file'
		}
	]
};

export default dataImport;
