import type { FieldErrors } from './utils';
import { resolveArrayItemTypeRef } from './utils';
import type { Field, SchemaType } from '../types/schemas';

/**
 * Values a write adds to fields that can't take them: a name the schema doesn't
 * declare, or a field it marks `deprecated`.
 *
 * Ordinary validation lets both through inside a registered block, because stored
 * pages carry leftovers from fields their schema has since dropped and an owner
 * couldn't clear them. An agent guessing a field name looks the same as a leftover,
 * except that it wasn't there before. So this compares with what is stored: a value
 * already in `previous` passes, wherever its block has moved to, and only a new one
 * is reported, with the names it could have used.
 */
export function newUnusableFields(
	schema: SchemaType,
	data: unknown,
	previous: readonly unknown[] = [],
	schemas: readonly SchemaType[] = []
): FieldErrors[] {
	const registry = new Map(schemas.map((s) => [s.name, s]));
	const stored = new Set<string>();
	for (const version of previous) {
		walk(schema.fields, schema.title, version, '', '', registry, (found) =>
			stored.add(identity(found))
		);
	}
	const errors: FieldErrors[] = [];
	walk(schema.fields, schema.title, data, '', '', registry, (found) => {
		if (stored.has(identity(found))) return;
		errors.push({ field: found.path, errors: [found.reason], kind: 'structural' });
	});
	return errors;
}

interface Found {
	/** Where it is in this version, for the message. */
	path: string;
	/** Where it is by its nearest keyed item, which survives a move. */
	place: string;
	value: unknown;
	reason: string;
}

const identity = ({ place, value }: Found) => `${place}\u0000${JSON.stringify(value)}`;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isEmpty = (value: unknown) => value === undefined || value === null || value === '';

function walk(
	fields: readonly Field[],
	title: string,
	data: unknown,
	path: string,
	place: string,
	registry: ReadonlyMap<string, SchemaType>,
	report: (found: Found) => void
): void {
	if (!isRecord(data)) return;
	const byName = new Map(fields.map((field) => [field.name, field]));

	for (const [key, value] of Object.entries(data)) {
		// `_type`, `_key` and the like are structure, and clearing a field is always allowed.
		if (key.startsWith('_') || isEmpty(value)) continue;
		const at = { path: path ? `${path}.${key}` : key, place: `${place}.${key}`, value };
		const field = byName.get(key);

		if (!field) {
			const names = fields.filter((f) => !f.deprecated).map((f) => f.name);
			report({ ...at, reason: `isn't a field of ${title}. Its fields: ${names.join(', ')}` });
			continue;
		}
		if (field.deprecated) {
			report({ ...at, reason: `is no longer used. ${field.deprecated.reason}` });
			continue;
		}
		if (field.type === 'object') {
			walk(field.fields, field.title, value, at.path, at.place, registry, report);
		} else if (field.type === 'array' && Array.isArray(value)) {
			value.forEach((item, index) => {
				if (!isRecord(item)) return;
				const ref = resolveArrayItemTypeRef(field.of, item);
				if (!ref || ref.type === 'block' || ref.type === 'reference') return;
				const registered = ref.fields ? undefined : registry.get(ref.type);
				const itemFields = ref.fields ?? registered?.fields;
				if (!itemFields) return;
				const keyed = typeof item._key === 'string' && item._key;
				walk(
					itemFields,
					ref.title ?? registered?.title ?? ref.name ?? ref.type,
					item,
					`${at.path}[${index}]`,
					keyed ? `${String(item._type)}:${keyed}` : `${at.place}[${index}]`,
					registry,
					report
				);
			});
		}
	}
}
