import type { SchemaType } from '@aphexcms/cms-core';
import { PanelTop } from '@lucide/svelte';
import { linkGroupField } from './fields/link.js';

/**
 * Header — a singleton, so there is exactly one per organization and the admin
 * opens the editor directly instead of a list with one row in it.
 *
 * Read once in `(site)/+layout.server.ts` and rendered by `$lib/components/Header.svelte`.
 */
export const header: SchemaType = {
	type: 'document',
	name: 'header',
	title: 'Header',
	description: 'The site’s primary navigation',
	icon: PanelTop,
	group: 'Settings',
	singleton: true,
	preview: { title: 'Header' },
	fields: [
		linkGroupField({
			name: 'navItems',
			title: 'Nav items',
			description: 'Six is already too many. Internal links follow their document’s slug.',
			appearances: false
		})
	]
};

export default header;
