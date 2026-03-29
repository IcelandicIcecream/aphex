import type { SchemaType } from '@aphexcms/cms-core';
import { Mail } from '@lucide/svelte';

const edm: SchemaType = {
	type: 'document',
	name: 'edm',
	title: 'EDM',
	description: 'Email direct marketing campaigns',
	icon: Mail,
	preview: {
		select: {
			title: 'subject',
			subtitle: 'campaignStatus'
		}
	},
	fields: [
		{
			name: 'subject',
			type: 'string',
			title: 'Subject Line',
			validation: (Rule) => Rule.required().max(150)
		},
		{
			name: 'preheader',
			type: 'string',
			title: 'Preheader Text',
			description: 'Preview text shown in email clients'
		},
		{
			name: 'body',
			type: 'text',
			title: 'Body',
			description: 'Email content'
		},
		{
			name: 'recipientList',
			type: 'file',
			title: 'Recipient List',
			accept: ['text/csv', '.csv'],
			description: 'CSV file with recipient emails'
		},
		{
			name: 'coverImage',
			type: 'image',
			title: 'Header Image'
		},
		{
			name: 'scheduledAt',
			type: 'datetime',
			title: 'Scheduled Send Date'
		},
		{
			name: 'campaignStatus',
			type: 'string',
			title: 'Campaign Status',
			list: [
				{ title: 'Draft', value: 'draft' },
				{ title: 'Scheduled', value: 'scheduled' },
				{ title: 'Sent', value: 'sent' }
			],
			initialValue: 'draft'
		}
	]
};

export default edm;
