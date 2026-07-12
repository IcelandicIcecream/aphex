/**
 * Color plugin — a rich color field widget for AphexCMS.
 *
 * Registers an `aphex/field/component` part for the `color` input. It works over
 * two storage shapes, chosen by the field's `type`:
 *   - `{ type: 'string', input: 'color' }` → stores a plain hex/CSS string (drops
 *     straight into CSS; ideal for theme tokens).
 *   - a rich object storing `{ hex, alpha, rgb, hsl, hsv }` (Sanity's data model) —
 *     use the `color()` helper from `@aphexcms/plugin-color-picker/schema` to declare
 *     it in one line.
 *
 * Color is intentionally NOT a built-in field type in cms-core — like Sanity, the
 * engine ships the primitives and color is a plugin. Register it once:
 *
 * ```ts
 * // src/lib/plugins.ts
 * import { colorPickerPlugin } from '@aphexcms/plugin-color-picker';
 * export const plugins = [colorPickerPlugin()];
 * ```
 */
import { definePlugin } from '@aphexcms/cms-core';
import type { PluginPart } from '@aphexcms/cms-core';
import ColorInput from './ColorInput.svelte';
import { COLOR_INPUT } from './constants.js';

export { COLOR_INPUT } from './constants.js';

export function colorPickerPlugin() {
	const parts: PluginPart[] = [
		// The widget for `input: 'color'` — over a `string` field (plain hex) or the
		// rich `object` field produced by the `color()` schema helper.
		{ implements: 'aphex/field/component', input: COLOR_INPUT, component: ColorInput }
	];
	return definePlugin({ name: '@aphexcms/plugin-color-picker', version: '0.1.0', parts });
}

export { default as ColorPicker } from './ColorPicker.svelte';
