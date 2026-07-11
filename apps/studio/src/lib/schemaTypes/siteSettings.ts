import type { SchemaType } from '@aphexcms/cms-core';
import { Settings } from '@lucide/svelte';

/**
 * Singleton: site-wide settings (wordmark, nav, footer, socials). One row per
 * organization — the admin jumps straight into the editor, no create/delete.
 */
const siteSettings: SchemaType = {
	type: 'document',
	name: 'siteSettings',
	title: 'Site Settings',
	description: 'Global wordmark, navigation, and footer for the public site',
	icon: Settings,
	group: 'Settings',
	singleton: true,
	groups: [
		{ name: 'general', title: 'General', default: true },
		{ name: 'branding', title: 'Branding' },
		{ name: 'navigation', title: 'Navigation' }
	],
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Site title',
			description: 'The wordmark text, also used in tab titles. Shown when no logo is set.',
			group: 'general'
		},
		{
			name: 'tagline',
			type: 'string',
			title: 'Tagline',
			description: 'Short line shown in the footer',
			group: 'general'
		},
		{
			name: 'logo',
			type: 'image',
			title: 'Logo',
			description: 'Shown in the header instead of the title text. Use a transparent PNG or SVG.',
			group: 'branding'
		},
		{
			name: 'logoHeight',
			type: 'number',
			title: 'Logo height',
			description: 'Height of the header logo. The width scales to keep the aspect ratio.',
			group: 'branding',
			min: 16,
			max: 64,
			step: 1,
			initialValue: 28,
			options: { layout: 'slider', unit: 'px' }
		},
		{
			name: 'favicon',
			type: 'image',
			title: 'Favicon',
			description: 'The little icon shown in the browser tab. A square image works best.',
			group: 'branding'
		},
		{
			// Demonstrates an array whose items render a rich per-item input: each
			// entry uses the color-picker plugin widget, so every row is a full picker.
			name: 'brandColors',
			type: 'array',
			title: 'Brand palette',
			description: 'A list of brand colors — each row is a color picker.',
			group: 'branding',
			of: [{ type: 'string', input: 'color-picker' }]
		},
		{
			name: 'nav',
			type: 'array',
			title: 'Header links',
			description: 'Links shown in the top navigation, in order',
			group: 'navigation',
			of: [
				{
					type: 'object',
					name: 'navLink',
					title: 'Link',
					fields: [
						{ name: 'label', type: 'string', title: 'Label' },
						{
							name: 'url',
							type: 'string',
							title: 'URL',
							description: 'Internal (e.g. /about) or external (https://…)'
						},
						{ name: 'newTab', type: 'boolean', title: 'Open in new tab' }
					]
				}
			]
		},
		{
			name: 'social',
			type: 'array',
			title: 'Social links',
			description: 'Shown in the footer',
			group: 'navigation',
			of: [
				{
					type: 'object',
					name: 'socialLink',
					title: 'Social link',
					fields: [
						{ name: 'label', type: 'string', title: 'Label' },
						{ name: 'url', type: 'url', title: 'URL' }
					]
				}
			]
		}
	],
	previewUrl: () => {
		return `/blog?aphex-preview=1`;
	}
};

export default siteSettings;
