/**
 * Phosphor icons for AphexCMS: an `icon` field with a searchable picker of
 * Phosphor's 1,512 icons in six weights, and a component that draws the stored value.
 *
 * ```ts
 * // aphex.config.ts
 * import { phosphorIconsPlugin } from '@aphexcms/plugin-phosphor-icons';
 * plugins: [phosphorIconsPlugin()]
 *
 * // a schema
 * { name: 'icon', type: 'icon', title: 'Icon' }
 *
 * // the site
 * import Icon from '@aphexcms/plugin-phosphor-icons/icon';
 * <Icon value={item.icon} class="size-6" />
 * ```
 *
 * The drawing is saved with the choice, so the site loads no icon set. The admin
 * loads one weight's drawings when the picker opens. Saving fills a drawing in from
 * the name, so the site's AI writes `{ name: 'coffee' }` and `search_icons` finds names.
 */
import { definePlugin } from '@aphexcms/cms-core';
import type { PluginPart } from '@aphexcms/cms-core';
import { z } from 'zod';
import IconInput from './IconInput.svelte';
import { ICON_INPUT, ICON_WEIGHTS } from './constants.js';
import { searchIcons } from './lookup.js';
import { expandIconTypes } from './schema.js';

export { ICON_INPUT, ICON_TYPE, ICON_WEIGHTS } from './constants.js';
export type { IconWeight } from './constants.js';
// Re-exported so importing the plugin turns on `{ type: 'icon' }` in schemas.
export type { IconField, IconValue } from './schema.js';
export { default as Icon } from './Icon.svelte';

const searchInput = z.object({
	query: z.string().min(1).describe('What the icon should show, like "phone" or "gluten free".'),
	limit: z.number().int().min(1).max(60).optional()
});

export function phosphorIconsPlugin() {
	const parts: PluginPart[] = [
		{ implements: 'aphex/field/component', input: ICON_INPUT, component: IconInput },
		{ implements: 'aphex/schema/transform', transform: expandIconTypes },
		{
			implements: 'aphex/agent/instructions',
			id: 'phosphor-icons',
			title: 'Icons',
			text: [
				'An icon field holds a Phosphor icon by name. Write only its name and, if you like, a weight: { "name": "coffee", "weight": "regular" }. Saving fills in the drawing.',
				`Weights: ${ICON_WEIGHTS.join(', ')}. Keep one weight across a page.`,
				'Find names with search_icons (by meaning: "haircut", "delivery", "open hours"). Never guess a name; one Phosphor lacks is kept but draws nothing.'
			].join('\n')
		},
		{
			implements: 'aphex/agent/tool',
			definition: {
				name: 'search_icons',
				description:
					'Find Phosphor icon names for an icon field, by name or meaning ("cafe" finds coffee). Best matches first.',
				mutates: false,
				requiredCapabilities: ['document.read'],
				execution: 'server',
				inputSchema: searchInput
			},
			execute: async (input) => {
				const { query, limit } = searchInput.parse(input);
				return { success: true, data: await searchIcons(query, limit ?? 20) };
			}
		}
	];
	return definePlugin({ name: '@aphexcms/plugin-phosphor-icons', version: '0.1.0', parts });
}
