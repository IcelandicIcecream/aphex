import type { SchemaType } from '@aphexcms/cms-core';
import { Mail } from '@lucide/svelte';

const edm: SchemaType = {
	type: 'document',
	name: 'edm',
	title: 'EDM',
	description: 'Email direct marketing campaigns',
	icon: Mail,
	group: 'Marketing',
	access: {
      read:      ['admin', 'owner'],          // only admin/owner can list or fetch
      create:    ['admin', 'owner'],
      update:    ['admin', 'owner'],
      delete:    ['admin', 'owner'],                   // only owner deletes
      publish:   ['admin', 'owner'],
      unpublish: ['admin', 'owner'],
    },
	groups: [
		{ name: 'content', title: 'Content', default: true },
		{ name: 'audience', title: 'Audience' },
		{ name: 'schedule', title: 'Schedule' }
	],
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
			validation: (Rule) => Rule.required().max(150),
			group: 'content'
		},
		{
			name: 'preheader',
			type: 'string',
			title: 'Preheader Text',
			description: 'Preview text shown in email clients',
			group: 'content'
		},
		{
			name: 'body',
			type: 'text',
			title: 'Body',
			description: 'Email content',
			group: 'content'
		},
		{
			name: 'recipientList',
			type: 'file',
			title: 'Recipient List',
			accept: ['text/csv', '.csv'],
			description: 'CSV file with recipient emails',
			group: 'audience'
		},
		{
			name: 'coverImage',
			type: 'image',
			title: 'Header Image',
			group: 'content'
		},
		{
			name: 'scheduledAt',
			type: 'datetime',
			title: 'Scheduled Send Date',
			group: 'schedule'
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
			initialValue: 'draft',
			group: 'schedule'
		}
	]
};

export default edm;
