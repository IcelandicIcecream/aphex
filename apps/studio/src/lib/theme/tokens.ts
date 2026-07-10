/**
 * Concrete design tokens for the studio blog — the app's own design opinion.
 *
 * cms-core provides the machinery (deriveThemeFields / deriveThemeVars /
 * emitThemeVars); this file provides the actual palette, fonts, scale, and
 * defaults. Grouped into Colors / Typography / Layout the way a real theme
 * editor (Shopify, Ghost) presents them. Add or retune a token here and it flows
 * to the admin form, the generated types, and the runtime CSS automatically.
 */
import type { ColorScheme, FontOption, ThemeToken } from '@aphexcms/cms-core';

/**
 * Default color schemes. The first is the site default; the others are ready for
 * sections to opt into (dark band, accent CTA). Each is seeded with three colors —
 * background, text, accent — and the rest is derived (see cms-core `resolveSchemeVars`).
 */
export const DEFAULT_SCHEMES: ColorScheme[] = [
	{ name: 'Light', surface: '#ffffff', text: '#15171a', primary: '#3eb0ef' },
	{ name: 'Dark', surface: '#0e1114', text: '#f4f6f8', primary: '#3eb0ef' },
	{ name: 'Accent', surface: '#3eb0ef', text: '#ffffff', primary: '#0e1114' }
];

const SANS = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

/** Body/UI font choices. */
export const BODY_FONTS: FontOption[] = [
	{ title: 'Inter', value: 'inter', stack: `'Inter', ${SANS}` },
	{ title: 'Lora', value: 'lora', stack: `'Lora', ${SERIF}` },
	{ title: 'System sans', value: 'system', stack: SANS }
];

/** Display/heading font choices. */
export const DISPLAY_FONTS: FontOption[] = [
	{ title: 'Inter', value: 'inter', stack: `'Inter', ${SANS}` },
	{ title: 'Fraunces', value: 'fraunces', stack: `'Fraunces', ${SERIF}` },
	{ title: 'Playfair Display', value: 'playfair', stack: `'Playfair Display', ${SERIF}` },
	{ title: 'Space Grotesk', value: 'space-grotesk', stack: `'Space Grotesk', ${SANS}` }
];

/**
 * Global (non-color) tokens. Colors live in schemes (see DEFAULT_SCHEMES) — the
 * same split Shopify uses: typography and layout are global, palettes are schemes.
 */
export const THEME_TOKENS: ThemeToken[] = [
	// ── Typography ──────────────────────────────────────────────────────────
	{
		kind: 'font',
		name: 'fontDisplay',
		title: 'Heading font',
		cssVar: '--font-display',
		group: 'typography',
		default: 'inter',
		options: DISPLAY_FONTS
	},
	{
		kind: 'font',
		name: 'fontBody',
		title: 'Body font',
		cssVar: '--font-sans',
		group: 'typography',
		default: 'inter',
		options: BODY_FONTS
	},
	{
		kind: 'range',
		name: 'baseSize',
		title: 'Body size',
		description: 'Base reading size. Everything else scales from this.',
		cssVar: '--base-size',
		group: 'typography',
		default: 18,
		min: 15,
		max: 21,
		step: 1,
		unit: 'px'
	},
	{
		kind: 'select',
		name: 'headingWeight',
		title: 'Heading weight',
		cssVar: '--heading-weight',
		group: 'typography',
		default: '700',
		options: [
			{ title: 'Medium', value: '500' },
			{ title: 'Semibold', value: '600' },
			{ title: 'Bold', value: '700' },
			{ title: 'Extrabold', value: '800' }
		]
	},

	// ── Layout ──────────────────────────────────────────────────────────────
	{
		kind: 'range',
		name: 'contentWidth',
		title: 'Reading width',
		description: 'Maximum width of the article column.',
		cssVar: '--content-width',
		group: 'layout',
		default: 720,
		min: 600,
		max: 820,
		step: 10,
		unit: 'px'
	},
	{
		kind: 'range',
		name: 'radius',
		title: 'Corner radius',
		description: 'Roundness of cards, images, and buttons.',
		cssVar: '--radius-base',
		group: 'layout',
		default: 8,
		min: 0,
		max: 24,
		step: 1,
		unit: 'px'
	}
];

/**
 * Google Fonts stylesheet href covering every curated option, so any selection
 * renders without per-choice `<link>` juggling. The set is small enough that
 * loading all of it is cheaper than the complexity of loading a subset.
 */
export const THEME_FONTS_HREF =
	'https://fonts.googleapis.com/css2' +
	'?family=Inter:wght@400;450;500;600;700;800' +
	'&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400' +
	'&family=Playfair+Display:wght@400;500;600;700;800' +
	'&family=Lora:ital,wght@0,400;0,500;0,600;1,400' +
	'&family=Space+Grotesk:wght@400;500;600;700' +
	'&display=swap';
