/**
 * Server-safe schema helper for the rich (object) color field.
 *
 * `color()` returns a ready-made `object` field wired to the color widget — one
 * token instead of hand-writing the `{ hex, alpha, rgb, hsl, hsv }` sub-field tree.
 * It's the Aphex equivalent of Sanity's `type: 'color'`, expressed as an object
 * (portable, type-generated, validated) rather than a bespoke storage primitive.
 * Import from `@aphexcms/plugin-color-picker/schema` (no Svelte).
 *
 * @example
 * import { color } from '@aphexcms/plugin-color-picker/schema';
 * // in a schema's fields:
 * color({ name: 'brandColor', title: 'Brand color', group: 'design' })
 */
import type { ObjectField } from '@aphexcms/cms-core';
import { COLOR_INPUT } from './constants.js';

export type { ColorValue, RgbaColor, HslaColor, HsvaColor } from './color.js';

export interface ColorFieldConfig {
	name: string;
	title?: string;
	description?: string;
	group?: string;
	/** Allow an alpha channel (stored on the object + 8-digit hex). Default: false. */
	alpha?: boolean;
}

const numberSub = (name: string) => ({ name, type: 'number' as const, title: name });

/** Build a rich-color `object` field: stores `{ hex, alpha, rgb, hsl, hsv }`, edited by the picker. */
export function color(config: ColorFieldConfig): ObjectField {
	return {
		name: config.name,
		type: 'object',
		title: config.title ?? config.name,
		description: config.description,
		group: config.group,
		input: COLOR_INPUT,
		inputOptions: { alpha: config.alpha === true },
		fields: [
			{ name: 'hex', type: 'string', title: 'Hex' },
			{ name: 'alpha', type: 'number', title: 'Alpha' },
			{
				name: 'rgb',
				type: 'object',
				title: 'RGB',
				fields: ['r', 'g', 'b', 'a'].map(numberSub)
			},
			{
				name: 'hsl',
				type: 'object',
				title: 'HSL',
				fields: ['h', 's', 'l', 'a'].map(numberSub)
			},
			{
				name: 'hsv',
				type: 'object',
				title: 'HSV',
				fields: ['h', 's', 'v', 'a'].map(numberSub)
			}
		]
	};
}
