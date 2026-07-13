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
import type { ObjectField, BaseField, Field, SchemaType, TypeReference } from '@aphexcms/cms-core';
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

export interface ColorFieldConfig {
	name: string;
	title?: string;
	description?: string;
	group?: string;
	/** Allow an alpha channel (stored on the object + 8-digit hex). Default: false. */
	alpha?: boolean;
}

const numberSub = (name: string) => ({ name, type: 'number' as const, title: name });

/** Build a rich-color `object` field: stores `{ hex, alpha, rgb, hsl, hsv }`, edited by the picker. */
export function color(config: ColorFieldConfig): ObjectField {
	return {
		name: config.name,
		type: 'object',
		title: config.title ?? config.name,
		description: config.description,
		group: config.group,
		input: COLOR_INPUT,
		inputOptions: { alpha: config.alpha === true },
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

const groupOf = (g: string | string[] | undefined): string | undefined =>
	typeof g === 'string' ? g : Array.isArray(g) ? g[0] : undefined;

/** Expand `{ type: 'color' }` fields into the rich `color()` object, recursing into
 *  nested objects and array items. */
function expandFields(fields: Field[]): Field[] {
	return fields.map((f): Field => {
		if (f.type === COLOR_TYPE) {
			return color({
				name: f.name,
				title: f.title,
				description: f.description,
				group: groupOf(f.group),
				alpha: f.alpha === true
			});
		}
		if (f.type === 'object' && Array.isArray(f.fields)) {
			return { ...f, fields: expandFields(f.fields) };
		}
		if (f.type === 'array' && Array.isArray(f.of)) {
			return { ...f, of: f.of.map(expandMember) };
		}
		return f;
	});
}

/** Array `of` members are `TypeReference`s (not `Field`s); expand a color member the same way. */
function expandMember(m: TypeReference): TypeReference {
	if (m.type === COLOR_TYPE) {
		const c = color({ name: m.name ?? 'color', title: m.title });
		return { type: c.type, name: c.name, title: c.title, input: c.input, fields: c.fields };
	}
	if (Array.isArray(m.fields)) return { ...m, fields: expandFields(m.fields) };
	return m;
}

/**
 * Schema-transform: desugar every `{ type: 'color' }` field into the rich color
 * `object`, everywhere in the schema list. Registered as the plugin's
 * `aphex/schema/transform` part so it runs in the engine, admin, and type generator
 * alike — the engine never sees a `color` primitive.
 */
export function expandColorTypes(schemas: SchemaType[]): SchemaType[] {
	return schemas.map((s) =>
		'fields' in s && Array.isArray(s.fields) ? { ...s, fields: expandFields(s.fields) } : s
	);
}
