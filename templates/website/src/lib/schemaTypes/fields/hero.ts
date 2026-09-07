import type { Field } from '@aphexcms/cms-core';
import { AlignCenter, AlignLeft } from '@lucide/svelte';
import { linkGroupField } from './link.js';

/**
 * The hero — the block at the top of every page, and the one field where the
 * *same* content is rendered four different ways.
 *
 * `variant` picks the treatment, and `$lib/heros/RenderHero.svelte` dispatches on it:
 *
 *   none         — no hero at all; the page starts with its first layout block
 *   highImpact   — full-bleed image with the text laid over it
 *   mediumImpact — text, then the image beneath it
 *   lowImpact    — text only, narrow measure; the default
 *
 * Fields that only apply to some variants use `hidden` conditions, so choosing
 * "Low impact" doesn't leave an editor looking at a Media picker that will never
 * be read. `siblingData` is the hero object itself, which is where `variant`
 * lives.
 */
export function heroField(group?: string): Field {
	return {
		name: 'hero',
		type: 'object',
		title: 'Hero',
		...(group ? { group } : {}),
		fields: [
			{
				// `variant`, not `type`: `type` is a reserved document column in
				// Aphex (it stores the schema name), and the engine rejects a
				// schema that shadows one.
				name: 'variant',
				type: 'string',
				title: 'Type',
				initialValue: 'lowImpact',
				list: [
					{ title: 'None', value: 'none' },
					{ title: 'High impact', value: 'highImpact' },
					{ title: 'Medium impact', value: 'mediumImpact' },
					{ title: 'Low impact', value: 'lowImpact' }
				],
				options: { layout: 'dropdown' }
			},
			{
				name: 'richText',
				type: 'array',
				title: 'Content',
				description: 'The headline and standfirst.',
				of: [{ type: 'block' }],
				hidden: ({ siblingData }) => siblingData.variant === 'none'
			},
			{
				/*
				 * Alignment lives here rather than as a control in the rich text
				 * toolbar. A heading and its standfirst are aligned together as a
				 * composition, not paragraph by paragraph, and putting it on the block
				 * keeps Portable Text free of presentation — a per-paragraph `align`
				 * would have to be honoured by every renderer that ever reads this
				 * content, or silently dropped.
				 *
				 * Low impact only. `highImpact` is always centred — it is a full-bleed
				 * image with the copy laid over it, and left-aligning a narrow measure
				 * on a photograph is the arrangement that variant exists to avoid.
				 * `mediumImpact` leads into an image below the text, so a centred
				 * heading over a left-aligned photograph reads as a mistake.
				 *
				 * Note that hiding a field *keeps its value*, so the renderer must not
				 * read one the editor can't see: `MediumImpact` deliberately ignores
				 * `align`, or a hero switched from low to medium would stay centred
				 * with no control on screen to explain why.
				 */
				name: 'align',
				type: 'string',
				title: 'Alignment',
				initialValue: 'left',
				// `layout: 'tabs'` renders a segmented control, and a list entry may carry
				// an `icon` — which is the right control for alignment: the glyph *is*
				// the label, and two words of prose are slower to read than two icons.
				list: [
					{ title: 'Left', value: 'left', icon: AlignLeft },
					{ title: 'Centred', value: 'center', icon: AlignCenter }
				],
				options: { layout: 'tabs' },
				hidden: ({ siblingData }) => siblingData.variant !== 'lowImpact'
			},
			linkGroupField({
				description: 'Up to two buttons. More than that and none of them is a call to action.'
			}),
			{
				name: 'media',
				type: 'image',
				title: 'Media',
				hidden: ({ siblingData }) =>
					siblingData.variant !== 'highImpact' && siblingData.variant !== 'mediumImpact'
			}
		]
	};
}
