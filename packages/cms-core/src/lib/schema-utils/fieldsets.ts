import type { Field, Fieldset } from '../types/schemas';

/** One entry in a form's layout: a field on its own, or a fieldset and its fields. */
export type FieldLayoutItem =
	| { kind: 'field'; field: Field }
	| { kind: 'fieldset'; fieldset: Fieldset; fields: Field[] };

/**
 * Lays fields out for the editor: each fieldset appears where its first field
 * would have been, holding all of its fields in declaration order; fields
 * without one stay where they are. A field naming a fieldset that isn't declared
 * is shown on its own rather than lost (the schema validator reports it at boot).
 */
export function layoutFields(fields: Field[], fieldsets: Fieldset[] = []): FieldLayoutItem[] {
	if (fieldsets.length === 0) return fields.map((field) => ({ kind: 'field', field }));
	const byName = new Map(fieldsets.map((fieldset) => [fieldset.name, fieldset]));
	const items: FieldLayoutItem[] = [];
	const placed = new Map<string, Field[]>();
	for (const field of fields) {
		const fieldset = field.fieldset ? byName.get(field.fieldset) : undefined;
		if (!fieldset) {
			items.push({ kind: 'field', field });
			continue;
		}
		const group = placed.get(fieldset.name);
		if (group) {
			group.push(field);
			continue;
		}
		const fresh = [field];
		placed.set(fieldset.name, fresh);
		items.push({ kind: 'fieldset', fieldset, fields: fresh });
	}
	return items;
}

/** How many of these fields have a value set, for the count on a folded section. */
export function filledCount(
	fields: Field[],
	data: Record<string, unknown> | null | undefined
): number {
	return fields.filter((field) => {
		const value = data?.[field.name];
		return (
			value !== undefined &&
			value !== null &&
			value !== '' &&
			!(Array.isArray(value) && value.length === 0)
		);
	}).length;
}

/** Names of fieldsets the fields refer to that aren't declared. For the schema validator. */
export function unknownFieldsets(fields: Field[], fieldsets: Fieldset[] = []): string[] {
	const declared = new Set(fieldsets.map((fieldset) => fieldset.name));
	return [
		...new Set(
			fields
				.map((field) => field.fieldset)
				.filter((name): name is string => !!name && !declared.has(name))
		)
	];
}
