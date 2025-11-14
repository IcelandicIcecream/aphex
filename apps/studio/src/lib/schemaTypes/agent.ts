import type { SchemaType } from '@aphexcms/cms-core';
import Bot from 'lucide-svelte/icons/bot';

export const agent: SchemaType = {
	type: 'document',
	name: 'agent',
	title: 'AI Agent',
	description: 'Build and configure AI agents with custom personalities and behaviors',
	icon: Bot,
	fields: [
		// Basic Information
		{
			name: 'name',
			type: 'string',
			title: 'Agent Name',
			description: 'Display name',
			validation: (Rule) => Rule.required().max(100)
		},
		{
			name: 'slug',
			type: 'slug',
			title: 'URL Slug',
			description: 'URL-friendly identifier',
			source: 'name',
			maxLength: 50,
			validation: (Rule) => Rule.required()
		},
		{
			name: 'description',
			type: 'text',
			title: 'Description',
			description: 'Brief description of the agent and its purpose',
			rows: 3,
			validation: (Rule) => Rule.max(500)
		},
		{
			name: 'enabled',
			type: 'boolean',
			title: 'Active',
			description: 'Is this agent active and available?',
			initialValue: true
		},

		// Opening Responses
		{
			name: 'openingResponses',
			type: 'array',
			title: 'Opening Responses',
			description: 'Random greetings the agent can say when first starting (one will be randomly selected)',
			of: [{ type: 'text' }],
			validation: (Rule) => Rule.required()
		},

		// Character Instructions
		{
			name: 'traitContext',
			type: 'array',
			title: 'Character Instructions',
			description: 'Define the agent\'s personality, behavior, and rules (each item is a sentence/paragraph)',
			of: [{ type: 'text' }],
			validation: (Rule) => Rule.required()
		},

		// Metadata
		{
			name: 'tags',
			type: 'array',
			title: 'Tags',
			description: 'Tags for organization and categorization',
			of: [{ type: 'image' }]
		},
		{
			name: 'notes',
			type: 'text',
			title: 'Internal Notes',
			description: 'Private notes about this agent (visible only in CMS)',
			rows: 3
		}
	],
	preview: {
		select: {
			title: 'name',
			subtitle: 'description'
		}
	}
};

export default agent;
