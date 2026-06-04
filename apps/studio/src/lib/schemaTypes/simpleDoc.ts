import type { SchemaType } from '@aphexcms/cms-core';
import { File } from '@lucide/svelte';

export const simpleDoc: SchemaType = {
	type: 'document',
	name: 'simple_document',
	title: 'Simple Document',
	description: 'Just a simple document',
	icon: File,
	// group: 'Content',
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Simple Title',
			description: 'The main title of the document',
			validation: (Rule) => Rule.required().max(10)
		},
		{
			name: 'description',
			type: 'string',
			title: 'Simple Description',
			description: 'The main description of the document',
			validation: (Rule) => Rule.required().max(20)
		},
		{
			name: 'content',
			type: 'array',
			title: 'Content',
			description: 'Rich text content',
			of: [
				{
					type: 'block',
					marks: {
						annotations: [
							{
								name: 'internalLink',
								title: 'Internal Link',
								fields: [
									{
										name: 'reference',
										type: 'reference',
										title: 'Document',
										to: [{ type: 'page' }]
									}
								]
							},
							{
								name: 'footnote',
								title: 'Footnote',
								fields: [{ name: 'text', type: 'text', title: 'Footnote text' }]
							}
						]
					},
					of: [
						{
							type: 'inlineNote',
							title: 'Inline Note',
							fields: [{ name: 'text', type: 'text', title: 'Note text' }]
						}
					]
				},
				{ type: 'image', title: 'Image' },
				{
					type: 'callout',
					title: 'Callout',
					fields: [
						{
							name: 'tone',
							type: 'string',
							title: 'Tone',
							description: 'e.g. info, warning, error'
						},
						{ name: 'text', type: 'text', title: 'Text' }
					]
				},
				{
					type: 'codeBlock',
					title: 'Code Block',
					fields: [
						{ name: 'language', type: 'string', title: 'Language' },
						{ name: 'code', type: 'text', title: 'Code' }
					]
				},
				{
					type: 'youtube',
					title: 'YouTube Video',
					fields: [
						{ name: 'url', type: 'url', title: 'YouTube URL' },
						{ name: 'caption', type: 'string', title: 'Caption' }
					]
				}
			],
			validation: (Rule) => Rule.required()
		}
	]
};

export default simpleDoc;
