import { Settings } from '@lucide/svelte';
import type { SchemaType } from '@aphexcms/cms-core';

/**
 * A singleton: exactly one of these exists per organization, so the admin skips
 * the list and opens the editor directly — no create, no delete. `singleton: true`
 * is the whole difference; everything else is an ordinary document type.
 *
 * Use it for the things a site has one of. Here that's the name in the tab
 * title, the default share description, and a logo.
 */
const siteSettings: SchemaType = {
	type: 'document',
	name: 'siteSettings',
	title: 'Site Settings',
	description: 'Site name, description and logo',
	icon: Settings,
	// Files this under a "Settings" heading in the admin's type list rather than
	// mixing it in with content types.
	group: 'Settings',
	singleton: true,
	groups: [
		{ name: 'general', title: 'General', default: true },
		{ name: 'branding', title: 'Branding' }
	],
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Site name',
			description: 'Shown in the browser tab, and as a fallback when no logo is set.',
			group: 'general'
		},
		{
			name: 'description',
			type: 'text',
			title: 'Description',
			rows: 3,
			description: "The default meta description, used on pages that don't set their own.",
			group: 'general'
		},
		{
			name: 'logo',
			type: 'image',
			title: 'Logo',
			description:
				'Replaces the site name in the header. Use a single-colour SVG (or transparent PNG) with dark marks: the header sits over the hero image on some pages and flips the logo to white there, which only works on a monochrome logo with a transparent background.',
			group: 'branding'
		},
		{
			name: 'favicon',
			type: 'image',
			title: 'Favicon',
			description:
				'The browser tab icon, for the public site and the admin. A square PNG or SVG, 32px or larger.',
			group: 'branding'
		},
		{
			// `layout: 'slider'` swaps the number input for a drag slider — the right
			// control when the useful range is small and the feedback is visual.
			name: 'logoHeight',
			type: 'number',
			title: 'Logo height',
			description: 'Height of the header logo in pixels. Width follows the aspect ratio.',
			group: 'branding',
			min: 16,
			max: 80,
			step: 2,
			initialValue: 40,
			options: { layout: 'slider' }
		}
	]
};

export default siteSettings;
