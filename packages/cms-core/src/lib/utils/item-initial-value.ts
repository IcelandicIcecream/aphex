import type { Field, ObjectInitialValue } from '../types/schemas';
import { getDefaultValueForFieldType } from './field-defaults';

type WithInitialValue = { fields?: Field[]; initialValue?: ObjectInitialValue };

async function resolve<T>(value: T | (() => T | Promise<T>)): Promise<T> {
	return typeof value === 'function' ? await (value as () => T | Promise<T>)() : value;
}

/**
 * Gives every object inside the value's arrays a fresh `_key`, so two items
 * made from the same starting value never share keys. Copies; never mutates.
 */
export function withFreshKeys<T>(value: T, newKey: () => string): T {
	if (Array.isArray(value)) {
		return value.map((item) =>
			item && typeof item === 'object' && !Array.isArray(item)
				? { ...withFreshKeys(item, newKey), _key: newKey() }
				: withFreshKeys(item, newKey)
		) as T;
	}
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, inner]) => [key, withFreshKeys(inner, newKey)])
		) as T;
	}
	return value;
}

/**
 * A new array item of `typeName`: each field's `initialValue` (a function's
 * awaited result) or its type's empty default, then the type's own
 * `initialValue` on top, with fresh keys throughout.
 */
export async function newArrayItem(
	typeName: string,
	type: WithInitialValue,
	newKey: () => string
): Promise<Record<string, unknown>> {
	const item: Record<string, unknown> = {};
	for (const field of type.fields ?? []) {
		const given = 'initialValue' in field ? field.initialValue : undefined;
		item[field.name] =
			given === undefined ? getDefaultValueForFieldType(field.type) : await resolve(given);
	}
	const own = type.initialValue === undefined ? {} : ((await resolve(type.initialValue)) ?? {});
	const { _type: _ignoredType, _key: _ignoredKey, ...rest } = own;
	return { ...withFreshKeys({ ...item, ...rest }, newKey), _type: typeName, _key: newKey() };
}

/**
 * What's wrong with a fixed starting value, checked when the schema loads: a key
 * that isn't one of the type's fields, or a value a field's `list` doesn't offer.
 * A function's result can't be known until it runs, so it isn't checked.
 */
export function initialValueProblems(type: WithInitialValue): string[] {
	const value = type.initialValue;
	if (!value || typeof value !== 'object') return [];
	const fields = new Map((type.fields ?? []).map((field) => [field.name, field]));
	return Object.entries(value).flatMap(([key, given]) => {
		if (key === '_type' || key === '_key') return [];
		const field = fields.get(key);
		if (!field) return [`sets "${key}", which isn't one of its fields`];
		const list = 'list' in field && Array.isArray(field.list) ? field.list : undefined;
		if (!list || typeof given !== 'string') return [];
		const offered = list.map((option) => (typeof option === 'string' ? option : option.value));
		return offered.includes(given)
			? []
			: [`sets "${key}" to "${given}", which isn't one of its choices (${offered.join(', ')})`];
	});
}
