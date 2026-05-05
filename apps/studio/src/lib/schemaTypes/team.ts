import { Shield } from '@lucide/svelte';
import type { SchemaType } from '@aphexcms/cms-core';

const team: SchemaType = {
	type: 'document',
	name: 'team',
	title: 'Team',
	icon: Shield,
	preview: {
		select: { title: 'name', subtitle: 'city' }
	},
	fields: [
		{
			name: 'name',
			type: 'string',
			title: 'Team Name',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'city',
			type: 'string',
			title: 'City'
		},
		{
			name: 'roster',
			type: 'array',
			title: 'Roster',
			description: 'Players on this team',
			of: [{ type: 'reference', to: [{ type: 'player' }] }]
		},
		{
			name: 'captain',
			type: 'reference',
			title: 'Captain',
			description: 'Team captain',
			to: [{ type: 'player' }]
		}
	]
};

export default team;
