/**
 * Theme token *types* — the shape of a design-system token.
 *
 * cms-core owns the machinery (turn a token list into a schema + scoped CSS); the
 * consuming app owns the concrete token list, its default colors, and font choices
 * (that's design opinion, not engine concern). See ./derive.ts and ./css.ts for
 * the functions that operate on these, and the app's own `theme/tokens.ts` for a
 * concrete set.
 */

/** A curated font choice — the stored `value` resolves to a full CSS `stack`. */
export interface FontOption {
	title: string;
	value: string;
	stack: string;
}

interface BaseToken {
	/** Field name in the theme schema and the token's identity. */
	name: string;
	title: string;
	description?: string;
	/** The CSS custom property this token drives, e.g. `--accent`. */
	cssVar: string;
	/** Field group in the admin form. */
	group: string;
}

export interface ColorToken extends BaseToken {
	kind: 'color';
	default: string;
}

export interface FontToken extends BaseToken {
	kind: 'font';
	/** The stored `value` of the default option. */
	default: string;
	options: FontOption[];
}

/** A numeric slider — widths, radii, sizes. Emitted as `${value}${unit}`. */
export interface RangeToken extends BaseToken {
	kind: 'range';
	default: number;
	min: number;
	max: number;
	step?: number;
	/** CSS unit appended to the value, e.g. `'px'`, `'rem'`. Defaults to `''`. */
	unit?: string;
}

/** A fixed-choice dropdown — weights, styles. The stored value is emitted verbatim. */
export interface SelectToken extends BaseToken {
	kind: 'select';
	default: string;
	options: Array<{ title: string; value: string }>;
}

export type ThemeToken = ColorToken | FontToken | RangeToken | SelectToken;
