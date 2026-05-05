import { Trophy } from '@lucide/svelte';
import type { SchemaType } from '@aphexcms/cms-core';

const league: SchemaType = {
	type: 'document',
	name: 'league',
	title: 'League',
	icon: Trophy,
	preview: {
		select: { title: 'name', subtitle: 'sport' }
	},
	fields: [
		{
			name: 'name',
			type: 'string',
			title: 'League Name',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'sport',
			type: 'string',
			title: 'Sport'
		},
		{
			name: 'teams',
			type: 'array',
			title: 'Teams',
			description: 'Teams in this league',
			of: [{ type: 'reference', to: [{ type: 'team' }] }]
		},
		{
			name: 'mvp',
			type: 'reference',
			title: 'MVP',
			description: 'Most valuable player',
			to: [{ type: 'player' }]
		}
	]
};

export default league;
