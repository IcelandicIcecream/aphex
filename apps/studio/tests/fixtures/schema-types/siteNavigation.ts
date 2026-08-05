import type { SchemaType } from '@aphexcms/cms-core';
import { Menu } from '@lucide/svelte';

/**
 * Singleton: site-wide primary navigation. Only one row exists per
 * organization; the admin UI jumps straight into the editor and hides
 * Create/Delete affordances.
 */
export const siteNavigation: SchemaType = {
	type: 'document',
	name: 'siteNavigation',
	title: 'Site Navigation',
	description: 'Primary navigation links shown in the global header',
	icon: Menu,
	singleton: true,
	fields: [
		{
			name: 'brand',
			type: 'string',
			title: 'Brand Label',
			description: 'Optional text shown next to the logo'
		},
		{
			name: 'links',
			type: 'array',
			title: 'Links',
			of: [
				{
					type: 'object',
					name: 'navLink',
					title: 'Nav Link',
					fields: [
						{
							name: 'label',
							type: 'string',
							title: 'Label',
							validation: (Rule) => Rule.required()
						},
						{
							name: 'url',
							type: 'string',
							title: 'URL',
							validation: (Rule) => Rule.required()
						},
						{ name: 'openInNewTab', type: 'boolean', title: 'Open in New Tab' }
					]
				}
			]
		}
	],
	preview: {
		select: {
			title: 'brand'
		}
	}
};

export default siteNavigation;
