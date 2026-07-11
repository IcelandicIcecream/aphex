/**
 * Color schemes — the reusable palette unit.
 *
 * A scheme is seeded with THREE colors (surface, text, primary). Everything else —
 * the on-primary contrast color, muted/faint text, hairline borders, raised
 * surfaces, the hover-ink of the accent — is DERIVED, so every scheme is
 * internally consistent and the editor tunes three dials instead of eight.
 *
 * Each scheme is emitted as a scoped class (`.scheme-<name>`) that remaps the same
 * CSS custom properties the site components already consume (`--paper`, `--ink`,
 * `--accent`, …). The site shell wears the default scheme; any section can wear a
 * different one by adding its class — that's the page-builder primitive.
 *
 * Typography and layout are deliberately NOT part of a scheme: they're global,
 * the same way Shopify keeps type/layout out of its color schemes.
 */
import type { ArrayField } from '../types/schemas';
import { sanitizeTokenValue } from './css';

/** The three seed colors an editor sets per scheme. */
export interface ColorScheme {
	/** Human label; also slugified into the scheme's CSS class. */
	name: string;
	/** Background. */
	surface: string;
	/** Foreground text. */
	text: string;
	/** Accent — links, buttons, highlights. */
	primary: string;
}

const FALLBACK: Omit<ColorScheme, 'name'> = {
	surface: '#ffffff',
	text: '#15171a',
	primary: '#3eb0ef'
};

/** Slugify a scheme name into a stable, safe CSS class fragment. */
export function schemeSlug(name: string): string {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug || 'scheme';
}

/** The CSS class that carries a scheme's tokens, e.g. `scheme-dark`. */
export function schemeClass(name: string): string {
	return `scheme-${schemeSlug(name)}`;
}

/** Parse a 3/6-digit hex to [r,g,b] in 0–255, or null if not a plain hex. */
function parseHex(hex: string): [number, number, number] | null {
	const m = hex.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
	const group = m?.[1];
	if (!group) return null;
	const h =
		group.length === 3
			? group
					.split('')
					.map((c) => c + c)
					.join('')
			: group;
	return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** WCAG relative luminance (0 black → 1 white) of an sRGB triple. */
function luminance([r, g, b]: [number, number, number]): number {
	const lin = (c: number) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Pick a readable on-color (near-black or white) for text/icons that sit on top
 * of `background`. Falls back to white when the color can't be parsed.
 */
export function contrastColor(background: string): string {
	const rgb = parseHex(background);
	if (!rgb) return '#ffffff';
	// Compare contrast against white vs near-black; whichever is higher wins.
	const L = luminance(rgb);
	const contrastWhite = 1.05 / (L + 0.05);
	const contrastBlack = (L + 0.05) / 0.05;
	return contrastWhite >= contrastBlack ? '#ffffff' : '#0b0b0c';
}

/**
 * Resolve a scheme's three seeds into the full CSS-var role map. Seeds are
 * sanitized; anything invalid falls back to a sensible default so a scheme always
 * emits a complete, coherent palette. The derived roles are `color-mix`
 * expressions over `var(--ink)`/`var(--paper)`, so they recompute correctly for
 * whichever scheme is in scope — no per-shade user input, no drift.
 */
export function resolveSchemeVars(scheme: ColorScheme): Record<string, string> {
	const surface = sanitizeTokenValue(scheme.surface) ?? FALLBACK.surface;
	const text = sanitizeTokenValue(scheme.text) ?? FALLBACK.text;
	const primary = sanitizeTokenValue(scheme.primary) ?? FALLBACK.primary;

	return {
		'--paper': surface,
		'--ink': text,
		'--accent': primary,
		'--accent-contrast': contrastColor(primary),
		// Derived — relative to this scheme's ink/paper.
		'--paper-raised': 'color-mix(in srgb, var(--ink) 2%, var(--paper))',
		'--ink-soft': 'color-mix(in srgb, var(--ink) 58%, var(--paper))',
		'--ink-faint': 'color-mix(in srgb, var(--ink) 38%, var(--paper))',
		'--rule': 'color-mix(in srgb, var(--ink) 12%, transparent)',
		'--rule-soft': 'color-mix(in srgb, var(--ink) 7%, transparent)',
		'--accent-ink': 'color-mix(in srgb, var(--accent) 82%, var(--ink))'
	};
}

/**
 * Emit one scoped rule per scheme, prefixed so it only styles the site subtree
 * (never `:root`/admin chrome). Returns `''` when there are no schemes.
 *
 * @param scopeSelector Ancestor selector the scheme classes live under, e.g. `.blog-shell`.
 */
export function emitSchemeStyles(schemes: ColorScheme[], scopeSelector: string): string {
	const rules: string[] = [];
	for (const scheme of schemes) {
		const vars = resolveSchemeVars(scheme);
		const decls = Object.entries(vars)
			.map(([k, v]) => `${k}: ${v};`)
			.join(' ');
		const cls = schemeClass(scheme.name);
		// Match the shell itself when it wears the scheme, and any descendant that does.
		rules.push(`${scopeSelector}.${cls}, ${scopeSelector} .${cls} { ${decls} }`);
	}
	return rules.join('\n');
}

/** Read a theme document's `schemes` array, falling back to `defaults` when absent. */
export function readSchemes(values: unknown, defaults: ColorScheme[]): ColorScheme[] {
	const doc: Record<string, unknown> = {};
	if (values && typeof values === 'object') Object.assign(doc, values);
	const raw = doc.schemes;
	if (!Array.isArray(raw) || raw.length === 0) return defaults;

	const parsed: ColorScheme[] = [];
	for (const item of raw) {
		if (!item || typeof item !== 'object') continue;
		const rec = item as Record<string, unknown>;
		const name = typeof rec.name === 'string' && rec.name.trim() !== '' ? rec.name : 'Scheme';
		parsed.push({
			name,
			surface: typeof rec.surface === 'string' ? rec.surface : FALLBACK.surface,
			text: typeof rec.text === 'string' ? rec.text : FALLBACK.text,
			primary: typeof rec.primary === 'string' ? rec.primary : FALLBACK.primary
		});
	}
	return parsed.length > 0 ? parsed : defaults;
}

/**
 * Build the `schemes` array field for the theme singleton — a repeatable object
 * of { name, surface, text, primary }. The first scheme is the site default.
 */
export function deriveSchemesField(defaults: ColorScheme[], group: string): ArrayField {
	return {
		name: 'schemes',
		type: 'array',
		title: 'Color schemes',
		description:
			'Reusable palettes. The first is the site default; sections can opt into any other. Set the background, text, and accent — the rest is derived.',
		group,
		initialValue: defaults,
		of: [
			{
				type: 'object',
				name: 'colorScheme',
				title: 'Scheme',
				preview: { select: { title: 'name', subtitle: 'primary' } },
				fields: [
					{ name: 'name', type: 'string', title: 'Name' },
					{ name: 'surface', type: 'string', input: 'color-picker', title: 'Background' },
					{ name: 'text', type: 'string', input: 'color-picker', title: 'Text' },
					{ name: 'primary', type: 'string', input: 'color-picker', title: 'Accent' }
				]
			}
		]
	};
}
