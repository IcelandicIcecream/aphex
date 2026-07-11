/**
 * Color-picker plugin — a rich color field widget for AphexCMS.
 *
 * Registers an `aphex/field/component` part for the `color-picker` input, so any
 * string field opts in with `{ type: 'string', input: 'color-picker' }` and gets
 * a swatch + popover picker (hex, optional 8-digit alpha via
 * `inputOptions: { alpha: true }`). Works on standalone fields and array items
 * alike, since FieldInput resolves custom inputs uniformly.
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

/** The input key this plugin registers. Use it in schemas: `input: COLOR_PICKER_INPUT`. */
export const COLOR_PICKER_INPUT = 'color-picker';

export function colorPickerPlugin() {
	const parts: PluginPart[] = [
		{ implements: 'aphex/field/component', input: COLOR_PICKER_INPUT, component: ColorInput }
	];
	return definePlugin({ name: '@aphexcms/plugin-color-picker', version: '0.1.0', parts });
}

export { default as ColorPicker } from './ColorPicker.svelte';
