import type { IconWeight } from './constants.js';

/**
 * What an icon field stores. `path` and `shade` are the drawing itself, saved with
 * the choice so a site draws it with no icon set loaded: the name alone is enough to
 * write one (an AI, an import), and saving fills the drawing in.
 */
export interface IconValue {
	/** Phosphor's name, like `coffee` or `map-pin`. */
	name: string;
	weight?: IconWeight;
	/** The icon's path data (`d`), in a 256 × 256 box. */
	path?: string;
	/** Two-tone only: the 20% layer behind it. */
	shade?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An icon value with something to draw. */
export function isDrawableIcon(value: unknown): value is IconValue & { path: string } {
	return (
		isRecord(value) &&
		typeof value.name === 'string' &&
		typeof value.path === 'string' &&
		value.path !== ''
	);
}

/** Any value naming an icon, drawn or not. */
export function isIconValue(value: unknown): value is IconValue {
	return isRecord(value) && typeof value.name === 'string' && value.name !== '';
}
