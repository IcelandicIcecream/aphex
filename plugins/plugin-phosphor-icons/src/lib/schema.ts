/**
 * Schema surface for the icon field.
 *
 * `{ type: 'icon', name: 'icon' }`, or `icon({ name: 'icon' })`, is an `object`
 * under the hood storing `{ name, weight, path, shade }` (see `IconValue`), so a site
 * draws the icon from the document alone, with no icon set in its bundle.
 *
 * Saving fills the drawing in from the name: the transform gives every document
 * type holding an icon field a `beforeValidate` hook that looks it up. So an AI or
 * an import can write `{ name: 'coffee' }` and get the same value the picker saves.
 */
import type {
	BaseField,
	DocumentHook,
	Field,
	ObjectField,
	SchemaType,
	TypeReference
} from '@aphexcms/cms-core';
import { desugarFieldType } from '@aphexcms/cms-core';
import {
	ICON_INPUT,
	ICON_TYPE,
	ICON_WEIGHTS,
	WEIGHT_TITLES,
	type IconWeight
} from './constants.js';
import { resolveIcon } from './lookup.js';
import { isIconValue } from './value.js';

export type { IconValue } from './value.js';
export type { IconWeight } from './constants.js';

/** The authored shape of a `{ type: 'icon' }` field. */
export interface IconField extends BaseField {
	type: 'icon';
	/** The weight a new pick starts in. Default: `'regular'`. */
	weight?: IconWeight;
	/** Weights the editor may choose from. Default: all six. */
	weights?: readonly IconWeight[];
}

declare module '@aphexcms/cms-core' {
	interface FieldTypeMap {
		icon: IconField;
	}
}

export interface IconFieldConfig extends Partial<
	Omit<BaseField, 'type' | 'name' | 'input' | 'inputOptions'>
> {
	name: string;
	weight?: IconWeight;
	weights?: readonly IconWeight[];
}

/** Build an icon `object` field, edited by the Phosphor picker. */
export function icon(config: IconFieldConfig): ObjectField {
	const { name, title, weight, weights, ...rest } = config;
	return {
		...rest,
		name,
		type: 'object',
		title: title ?? 'Icon',
		input: ICON_INPUT,
		inputOptions: { weight: weight ?? 'regular', ...(weights ? { weights: [...weights] } : {}) },
		// Path data must never carry preview markers, and nothing in it is text to click.
		stega: false,
		fields: [
			{ name: 'name', type: 'string', title: 'Name' },
			{
				name: 'weight',
				type: 'string',
				title: 'Weight',
				list: ICON_WEIGHTS.map((value) => ({ title: WEIGHT_TITLES[value], value }))
			},
			{ name: 'path', type: 'string', title: 'Drawing' },
			{ name: 'shade', type: 'string', title: 'Shade' }
		]
	};
}

function isIconField(field: Field | TypeReference): boolean {
	return field.type === 'object' && field.input === ICON_INPUT;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type Types = Map<string, SchemaType>;

/** The fields an array member holds: its own, or those of the object type it names. */
function memberFields(member: TypeReference, types: Types): Field[] | undefined {
	return member.fields ?? types.get(member.type)?.fields;
}

function holdsIcons(fields: Field[] | undefined, types: Types, seen: Set<string>): boolean {
	if (!fields) return false;
	return fields.some((field) => {
		if (isIconField(field)) return true;
		if (field.type === 'object') return holdsIcons(field.fields, types, seen);
		if (field.type === 'array') {
			return field.of.some((member) => {
				if (isIconField(member)) return true;
				// A named object type can contain itself; look at each one once.
				if (!member.fields) {
					if (seen.has(member.type)) return false;
					seen.add(member.type);
				}
				return holdsIcons(memberFields(member, types), types, seen);
			});
		}
		return false;
	});
}

async function fillValue(value: unknown): Promise<unknown> {
	if (!isIconValue(value)) return value;
	// An unknown name is kept as written: nothing is lost, and the site draws nothing.
	return (await resolveIcon(value)) ?? value;
}

async function fillFields(
	fields: Field[],
	data: Record<string, unknown>,
	types: Types
): Promise<Record<string, unknown>> {
	const out = { ...data };
	for (const field of fields) {
		const value = data[field.name];
		if (value === undefined || value === null) continue;
		if (isIconField(field)) out[field.name] = await fillValue(value);
		else if (field.type === 'object' && isRecord(value))
			out[field.name] = await fillFields(field.fields, value, types);
		else if (field.type === 'array' && Array.isArray(value)) {
			out[field.name] = await Promise.all(
				value.map(async (item: unknown) => {
					if (!isRecord(item)) return item;
					// One member, or the one this item's `_type` names.
					const member =
						field.of.length === 1
							? field.of[0]
							: field.of.find((entry) => (entry.name ?? entry.type) === item._type);
					if (!member) return item;
					if (isIconField(member)) return fillValue(item);
					const nested = memberFields(member, types);
					return nested ? fillFields(nested, item, types) : item;
				})
			);
		}
	}
	return out;
}

const ourHooks = new WeakSet<DocumentHook>();

/** The hook a document type holding icons gets: fills each icon's drawing in from its name. */
export function fillIconsHook(schema: SchemaType, types: Types): DocumentHook {
	const hook: DocumentHook = ({ data }) => fillFields(schema.fields, data, types);
	ourHooks.add(hook);
	return hook;
}

/**
 * Schema-transform: desugar `{ type: 'icon' }` into the icon `object`, then give every
 * document type that holds one, anywhere in its fields, the hook that fills drawings in.
 */
export function expandIconTypes(schemas: SchemaType[]): SchemaType[] {
	const expanded = desugarFieldType(schemas, {
		type: ICON_TYPE,
		sugarKeys: ['weight', 'weights'],
		build: (field) => {
			const authored: Partial<IconField> = field.type === ICON_TYPE ? field : {};
			return icon({ name: field.name, weight: authored.weight, weights: authored.weights });
		}
	});
	const types: Types = new Map(expanded.map((schema) => [schema.name, schema]));
	return expanded.map((schema) => {
		if (schema.type !== 'document' || !holdsIcons(schema.fields, types, new Set())) return schema;
		// Run twice over the same list (a schema reload), a type keeps one hook.
		const others = (schema.hooks?.beforeValidate ?? []).filter((hook) => !ourHooks.has(hook));
		return {
			...schema,
			hooks: { ...schema.hooks, beforeValidate: [...others, fillIconsHook(schema, types)] }
		};
	});
}
