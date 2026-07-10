import type { SchemaType } from '@aphexcms/cms-core';
import { deriveThemeFields, deriveSchemesField } from '@aphexcms/cms-core';
import { Palette } from '@lucide/svelte';
import { THEME_TOKENS, DEFAULT_SCHEMES } from '../theme/tokens.js';

/**
 * Singleton: the site's design system. Colors are a list of reusable schemes
 * (first = site default); typography and layout are global tokens. Fields are
 * derived so the admin form, generated types, and runtime CSS never drift. The
 * public layout reads these and emits scoped CSS vars / scheme classes on
 * `.blog-shell`.
 */
const theme: SchemaType = {
	type: 'document',
	name: 'theme',
	title: 'Theme',
	description: 'Color schemes, typography, and layout for the public site',
	icon: Palette,
	group: 'Settings',
	singleton: true,
	groups: [
		{ name: 'colors', title: 'Color schemes', default: true },
		{ name: 'typography', title: 'Typography' },
		{ name: 'layout', title: 'Layout' }
	],
	fields: [deriveSchemesField(DEFAULT_SCHEMES, 'colors'), ...deriveThemeFields(THEME_TOKENS)]
};

export default theme;
