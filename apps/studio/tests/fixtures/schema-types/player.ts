import { User } from '@lucide/svelte';
import type { SchemaType } from '@aphexcms/cms-core';

const player: SchemaType = {
	type: 'document',
	name: 'player',
	title: 'Player',
	icon: User,
	preview: {
		select: { title: 'name', subtitle: 'position' }
	},
	fields: [
		{
			name: 'name',
			type: 'string',
			title: 'Name',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'position',
			type: 'string',
			title: 'Position'
		},
		{
			name: 'number',
			type: 'number',
			title: 'Jersey Number'
		}
	]
};

export default player;
