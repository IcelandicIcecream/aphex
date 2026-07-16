/**
 * Schema surface for the color field.
 *
 * Two ways to declare one, both storing the same rich `{ hex, alpha, rgb, hsl, hsv }`
 * object:
 *   - `{ type: 'color', name: 'brand' }` — the literal. Registering `colorPickerPlugin()`
 *     augments core's `FieldTypeMap` (see below) so `type: 'color'` is fully type-safe
 *     with no import, and the plugin's schema-transform desugars it into the object.
 *   - `color({ name: 'brand' })` — the helper. Equivalent, for when you'd rather import
 *     a builder than rely on the ambient type.
 *
 * Either way it's an `object` under the hood (portable, type-generated, validated) —
 * not a bespoke storage primitive.
 */
import type { ObjectField, BaseField, SchemaType } from '@aphexcms/cms-core';
import { desugarFieldType } from '@aphexcms/cms-core';
import { COLOR_INPUT } from './constants.js';

export type { ColorValue, RgbaColor, HslaColor, HsvaColor } from './color.js';

/** The `type` keyword this plugin desugars (authored as `{ type: 'color' }`). */
export const COLOR_TYPE = 'color';

/**
 * The authored shape of a `{ type: 'color' }` field. The plugin's schema-transform
 * expands it into the rich color `object` before the engine/codegen see it.
 */
export interface ColorField extends BaseField {
	type: 'color';
	/** Allow an alpha channel (stored on the object + 8-digit hex). Default: false. */
	alpha?: boolean;
}

// Register `color` into core's field-type registry so `{ type: 'color' }` is a
// first-class, type-safe field wherever this plugin is installed. This is picked up
// globally once the app imports the plugin (e.g. in `plugins.ts`).
declare module '@aphexcms/cms-core' {
	interface FieldTypeMap {
		color: ColorField;
	}
}

/**
 * Config for the `color()` builder.
 *
 * Extends `BaseField` (minus the keys the builder owns) so the helper can express
 * everything the `{ type: 'color' }` literal can — `access`, `validation`, multiple
 * groups. Otherwise the two ways of declaring a color wouldn't actually be
 * equivalent: the literal preserves them, and the builder couldn't accept them.
 */
export interface ColorFieldConfig extends Partial<
	Omit<BaseField, 'type' | 'name' | 'input' | 'inputOptions'>
> {
	name: string;
	/** Allow an alpha channel (stored on the object + 8-digit hex). Default: false. */
	alpha?: boolean;
}

const numberSub = (name: string) => ({ name, type: 'number' as const, title: name });

/** Build a rich-color `object` field: stores `{ hex, alpha, rgb, hsl, hsv }`, edited by the picker. */
export function color(config: ColorFieldConfig): ObjectField {
	const { name, title, alpha, ...rest } = config;
	return {
		// `rest` carries whatever else the caller declared (access, validation, group,
		// description, …) so the builder stays equivalent to the `type: 'color'` literal.
		...rest,
		name,
		type: 'object',
		title: title ?? name,
		input: COLOR_INPUT,
		inputOptions: { alpha: alpha === true },
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

/**
 * Schema-transform: desugar every `{ type: 'color' }` field into the rich color
 * `object`, everywhere in the schema list. Registered as the plugin's
 * `aphex/schema/transform` part so it runs in the engine, admin, and type generator
 * alike — the engine never sees a `color` primitive.
 *
 * `desugarFieldType` owns the walk (nested objects, array members) and preserves
 * whatever the author declared — `access`, `validation`, multiple groups — so this
 * only has to describe the shape. `alpha` is sugar: it becomes `inputOptions.alpha`
 * and must not survive onto the expanded object.
 */
export function expandColorTypes(schemas: SchemaType[]): SchemaType[] {
	return desugarFieldType(schemas, {
		type: COLOR_TYPE,
		sugarKeys: ['alpha'],
		build: (f) =>
			color({
				name: f.name,
				title: f.title,
				alpha: (f as ColorField).alpha === true
			})
	});
}
