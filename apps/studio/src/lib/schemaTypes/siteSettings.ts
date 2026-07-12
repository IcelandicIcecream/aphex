import type { SchemaType } from '@aphexcms/cms-core';
import { Settings } from '@lucide/svelte';
import { color } from '@aphexcms/plugin-color-picker/schema';

/**
 * Singleton: everything that shapes the public site — wordmark, navigation,
 * footer, the home hero, and the compiled template. One row per organization;
 * the admin jumps straight into the editor, no create/delete.
 */
const siteSettings: SchemaType = {
	type: 'document',
	name: 'siteSettings',
	title: 'Site Settings',
	description: 'Wordmark, navigation, footer, home hero, and template for the public site',
	icon: Settings,
	group: 'Settings',
	singleton: true,
	groups: [
		{ name: 'general', title: 'General', default: true },
		{ name: 'home', title: 'Home' },
		{ name: 'navigation', title: 'Navigation' },
		{ name: 'design', title: 'Design' }
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
			group: 'general'
		},
		{
			name: 'logoHeight',
			type: 'number',
			title: 'Logo height',
			description: 'Height of the header logo. The width scales to keep the aspect ratio.',
			group: 'general',
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
			group: 'general'
		},
		// ---- Home hero: drives the masthead on the /blog index ----
		{
			name: 'heroEyebrow',
			type: 'string',
			title: 'Hero eyebrow',
			description: 'Small label above the headline (e.g. "The Journal").',
			group: 'home'
		},
		{
			name: 'heroTitle',
			type: 'text',
			title: 'Hero headline',
			description: 'The large headline on the home page. Line breaks are preserved.',
			rows: 2,
			group: 'home'
		},
		{
			name: 'heroSubtitle',
			type: 'text',
			title: 'Hero subtitle',
			description: 'Supporting line shown below the headline.',
			rows: 2,
			group: 'home'
		},
		{
			name: 'heroImage',
			type: 'image',
			title: 'Hero image',
			description: 'Optional image for the home hero. Placement follows the layout below.',
			group: 'home'
		},
		{
			name: 'heroLayout',
			type: 'string',
			title: 'Hero layout',
			description: 'How the headline and image are arranged on the home page.',
			group: 'home',
			initialValue: 'split',
			list: [
				{ title: 'Split — headline beside the image', value: 'split' },
				{ title: 'Banner — image below the headline', value: 'banner' },
				{ title: 'Overlay — headline over the image', value: 'overlay' }
			],
			options: { layout: 'radio' }
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
		},
		// ---- Design: which compiled public-site template to render ----
		{
			name: 'template',
			type: 'string',
			title: 'Template',
			description: 'Changes the public-site structure without changing your content.',
			group: 'design',
			initialValue: 'editorial-journal',
			validation: (Rule) => Rule.required(),
			list: [
				{ title: 'Editorial Journal', value: 'editorial-journal' },
				{ title: 'Minimal Index', value: 'minimal-index' },
				{ title: 'Brutalist Ledger', value: 'brutalist-ledger' }
			],
			options: { layout: 'radio' }
		},
		// The `color()` helper (from @aphexcms/plugin-color-picker) builds a rich color
		// `object` field storing { hex, alpha, rgb, hsl, hsv }. Read `.hex` for a CSS value.
		color({
			name: 'color',
			title: 'Brand color',
			description:
				'Used for links, buttons, highlights, and focus states. Leave empty to use the template default.',
			group: 'design'
		})
	],
	previewUrl: () => {
		return `/blog?aphex-preview=1`;
	}
};

export default siteSettings;
