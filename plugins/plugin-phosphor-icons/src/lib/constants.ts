/** The input key the picker registers (`input: ICON_INPUT`). Svelte-free, so `./schema` can import it. */
export const ICON_INPUT = 'phosphor-icon';

/** The authored field keyword: `{ type: 'icon', name: 'icon' }`. */
export const ICON_TYPE = 'icon';

/** Phosphor's six weights, lightest last. */
export const ICON_WEIGHTS = ['regular', 'bold', 'fill', 'duotone', 'light', 'thin'] as const;
export type IconWeight = (typeof ICON_WEIGHTS)[number];

export const WEIGHT_TITLES: Record<IconWeight, string> = {
	regular: 'Regular',
	bold: 'Bold',
	fill: 'Filled',
	duotone: 'Two-tone',
	light: 'Light',
	thin: 'Thin'
};

export function isIconWeight(value: unknown): value is IconWeight {
	return typeof value === 'string' && (ICON_WEIGHTS as readonly string[]).includes(value);
}
