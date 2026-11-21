import type { Field } from '../types/schemas';

/**
 * Inherited values: a field that, left empty, takes its value from somewhere else
 * (a theme's style, a site-wide default, a parent setting). The admin shows that
 * value in the empty control, marks the field once it's set by hand, and offers to
 * clear it back. See `BaseField.inherits`.
 *
 * Display only. The stored value stays empty, and whatever reads the document
 * decides what empty means, so `inherits.value` should call the same function the
 * renderer does, or the form shows one thing and the page another.
 */

/** Empty: nothing stored, so the inherited value applies. */
export function isEmptyValue(value: unknown): boolean {
	return (
		value === undefined ||
		value === null ||
		value === '' ||
		(Array.isArray(value) && value.length === 0)
	);
}

/**
 * The value this field takes while it's empty, or undefined when it declares none
 * or the inherited value is itself empty. A throwing `inherits.value` counts as
 * none: a broken lookup must not take the form down with it.
 */
export function inheritedValue(
	field: Field,
	siblingData: Record<string, unknown> | undefined,
	documentData: Record<string, unknown> | undefined
): unknown {
	const inherits = field.inherits;
	if (!inherits) return undefined;
	const sibling = siblingData ?? documentData ?? {};
	try {
		const value = inherits.value({ siblingData: sibling, documentData: documentData ?? sibling });
		return isEmptyValue(value) ? undefined : value;
	} catch {
		return undefined;
	}
}

/** A value as the editor reads it: an option's title for a choice, else the value itself. */
export function describeValue(field: Field, value: unknown): string {
	if (isEmptyValue(value)) return '';
	if (field.type === 'string' && Array.isArray(field.list)) {
		const option = field.list.find((item) =>
			typeof item === 'string' ? item === value : item.value === value
		);
		if (option) return typeof option === 'string' ? option : option.title;
	}
	if (typeof value === 'boolean') return value ? 'On' : 'Off';
	return String(value);
}

/** The direct fields of an object that are set by hand over a value they'd inherit. */
export function overriddenFields(
	fields: Field[],
	value: Record<string, unknown> | undefined
): Field[] {
	return fields.filter((field) => field.inherits && !isEmptyValue(value?.[field.name]));
}
