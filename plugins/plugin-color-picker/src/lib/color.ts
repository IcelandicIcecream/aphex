/**
 * Color value model + conversions for the rich (object) color field.
 *
 * The picker can store a color two ways:
 *   - `type: 'string'` → a plain hex/CSS string (simple, drops straight into CSS).
 *   - `type: 'object'` → this `ColorValue` — hex + alpha + rgb/hsl/hsv, mirroring
 *     Sanity's `@sanity/color-input` data model so a color is usable in any format
 *     without re-converting at the call site.
 *
 * Plain TS (no DOM), safe to import anywhere.
 */

// Shape mirrors @sanity/color-input's *formats* (hex + alpha + rgb/hsl/hsv) so a color
// is usable in any format without re-converting. Sanity's per-object `_type` markers
// (`rgbaColor`, etc.) are omitted: Aphex objects are schema-typed, so a runtime
// discriminator is redundant and would just force `_type` sub-fields into the schema.
export interface RgbaColor {
	r: number;
	g: number;
	b: number;
	a: number;
}
export interface HslaColor {
	h: number;
	s: number;
	l: number;
	a: number;
}
export interface HsvaColor {
	h: number;
	s: number;
	v: number;
	a: number;
}

/** The stored shape of a rich color field. */
export interface ColorValue {
	hex: string;
	alpha: number;
	rgb: RgbaColor;
	hsl: HslaColor;
	hsv: HsvaColor;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round = (n: number, dp = 0) => {
	const f = 10 ** dp;
	return Math.round(n * f) / f;
};

function hexToRgb(hex: string): RgbaColor | null {
	let h = hex.replace('#', '').trim();
	// Expand shorthand (#rgb / #rgba) by doubling each nibble.
	if (h.length === 3 || h.length === 4)
		h = h
			.split('')
			.map((c) => c + c)
			.join('');
	if (h.length === 6) h += 'ff';
	if (h.length !== 8 || /[^0-9a-f]/i.test(h)) return null;
	return {
		r: parseInt(h.slice(0, 2), 16),
		g: parseInt(h.slice(2, 4), 16),
		b: parseInt(h.slice(4, 6), 16),
		a: round(parseInt(h.slice(6, 8), 16) / 255, 2)
	};
}

function rgbToHsv({ r, g, b, a }: RgbaColor): HsvaColor {
	const rn = r / 255,
		gn = g / 255,
		bn = b / 255;
	const max = Math.max(rn, gn, bn),
		min = Math.min(rn, gn, bn);
	const d = max - min;
	let h = 0;
	if (d !== 0) {
		if (max === rn) h = ((gn - bn) / d) % 6;
		else if (max === gn) h = (bn - rn) / d + 2;
		else h = (rn - gn) / d + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	const s = max === 0 ? 0 : d / max;
	return { h: round(h, 1), s: round(s * 100, 1), v: round(max * 100, 1), a };
}

function rgbToHsl({ r, g, b, a }: RgbaColor): HslaColor {
	const rn = r / 255,
		gn = g / 255,
		bn = b / 255;
	const max = Math.max(rn, gn, bn),
		min = Math.min(rn, gn, bn);
	const d = max - min;
	const l = (max + min) / 2;
	let h = 0;
	let s = 0;
	if (d !== 0) {
		s = d / (1 - Math.abs(2 * l - 1));
		if (max === rn) h = ((gn - bn) / d) % 6;
		else if (max === gn) h = (bn - rn) / d + 2;
		else h = (rn - gn) / d + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	return { h: round(h, 1), s: round(s * 100, 1), l: round(l * 100, 1), a };
}

const toHex2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');

/** RGBA → `#RRGGBB` (or `#RRGGBBAA` when alpha < 1). */
export function rgbToHex({ r, g, b, a }: RgbaColor): string {
	const base = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
	return a < 1 ? `${base}${toHex2(a * 255)}` : base.toUpperCase();
}

/** Parse a CSS color string the picker emits (hex / rgb(a) / hsl(a)) into `RgbaColor`. */
function parseCssToRgb(css: string): RgbaColor | null {
	const s = css.trim().toLowerCase();
	if (s.startsWith('#')) return hexToRgb(s);
	if (s.startsWith('rgb')) {
		const n = s.match(/[\d.]+/g)?.map(Number);
		if (n && n.length >= 3) {
			const [r = 0, g = 0, b = 0, a = 1] = n;
			return { r, g, b, a };
		}
	}
	if (s.startsWith('hsl')) {
		const n = s.match(/[\d.]+/g)?.map(Number);
		if (n && n.length >= 3) {
			const [hh = 0, ss = 0, ll = 0, a = 1] = n;
			const h = hh / 360,
				sl = ss / 100,
				l = ll / 100;
			const q = l < 0.5 ? l * (1 + sl) : l + sl - l * sl;
			const p = 2 * l - q;
			const hue = (t: number) => {
				let tt = t;
				if (tt < 0) tt += 1;
				if (tt > 1) tt -= 1;
				if (tt < 1 / 6) return p + (q - p) * 6 * tt;
				if (tt < 1 / 2) return q;
				if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
				return p;
			};
			return {
				r: round(hue(h + 1 / 3) * 255),
				g: round(hue(h) * 255),
				b: round(hue(h - 1 / 3) * 255),
				a
			};
		}
	}
	return null;
}

/** Build the full `ColorValue` from any CSS color string the picker emits. `null` if unparseable. */
export function parseColorToValue(css: string): ColorValue | null {
	const rgb = parseCssToRgb(css);
	if (!rgb) return null;
	return {
		hex: rgbToHex(rgb),
		alpha: rgb.a,
		rgb,
		hsl: rgbToHsl(rgb),
		hsv: rgbToHsv(rgb)
	};
}

/** The CSS string a picker should bind to for a stored `ColorValue` (hex, 8-digit if alpha < 1). */
export function colorValueToCss(value: unknown): string {
	if (!value || typeof value !== 'object') return '';
	const v = value as Partial<ColorValue>;
	if (typeof v.hex === 'string' && v.hex) return v.hex;
	if (v.rgb) return rgbToHex(v.rgb);
	return '';
}
