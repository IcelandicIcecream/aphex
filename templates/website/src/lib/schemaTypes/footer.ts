import type { SchemaType } from '@aphexcms/cms-core';
import { PanelBottom } from '@lucide/svelte';
import { linkGroupField } from './fields/link.js';

/**
 * Footer — the second singleton. Same shape as the header, plus a line of
 * copy the site can put its copyright or address in.
 */
export const footer: SchemaType = {
	type: 'document',
	name: 'footer',
	title: 'Footer',
	description: 'The site’s footer navigation',
	icon: PanelBottom,
	group: 'Settings',
	singleton: true,
	preview: { title: 'Footer' },
	fields: [
		linkGroupField({
			name: 'navItems',
			title: 'Nav items',
			appearances: false
		}),
		{
			name: 'note',
			type: 'string',
			title: 'Note',
			description: 'A single line under the links — copyright, an address, a disclaimer.'
		}
	]
};

export default footer;
