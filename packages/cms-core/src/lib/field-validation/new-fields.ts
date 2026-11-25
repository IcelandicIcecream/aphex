import type { FieldErrors } from './utils';
import { resolveArrayItemTypeRef } from './utils';
import type { Field, SchemaType } from '../types/schemas';

/** Values in fields that can't take new ones, by why. */
export interface UnusableFields {
	/** Names the schema doesn't declare. */
	unknown: FieldErrors[];
	/** Fields the schema marks `deprecated`. */
	deprecated: FieldErrors[];
}

/**
 * Values a write adds to fields that can't take them: a name the schema doesn't
 * declare, or a field it marks `deprecated`.
 *
 * Stored documents carry leftovers from fields their schema has since dropped, which
 * do no harm and which an owner has no control to clear. Someone guessing a field
 * name looks the same as a leftover, except that it wasn't there before. So this
 * compares with what is stored: a value already in `previous` passes, wherever its
 * block has moved to, and only a new one is reported, with the names it could have
 * used.
 */
export function newUnusableFields(
	schema: SchemaType,
	data: unknown,
	previous: readonly unknown[] = [],
	schemas: readonly SchemaType[] = []
): UnusableFields {
	const stored = storedPlaces(schema, previous, schemas);
	const result: UnusableFields = { unknown: [], deprecated: [] };
	walk(schema.fields, schema.title, data, ROOT, registryOf(schemas), (found) => {
		if (stored.has(identity(found))) return;
		result[found.why].push({ field: found.path, errors: [found.reason], kind: 'structural' });
	});
	return result;
}

/** Paths in `data` of undeclared fields that were already stored, which no check should stop. */
export function leftoverPaths(
	schema: SchemaType,
	data: unknown,
	previous: readonly unknown[],
	schemas: readonly SchemaType[] = []
): Set<string> {
	const stored = storedPlaces(schema, previous, schemas);
	const paths = new Set<string>();
	walk(schema.fields, schema.title, data, ROOT, registryOf(schemas), (found) => {
		if (found.why === 'unknown' && stored.has(identity(found))) paths.add(found.path);
	});
	return paths;
}

/** One stored value whose field the schema no longer has. */
export type UnknownField = Pick<Found, 'path' | 'keyPath' | 'segments' | 'value'>;

/** Every value in a document that the schema has no field for, blocks and list items included. */
export function unknownFields(
	schema: SchemaType,
	data: unknown,
	schemas: readonly SchemaType[] = []
): UnknownField[] {
	const found: UnknownField[] = [];
	walk(schema.fields, schema.title, data, ROOT, registryOf(schemas), (field) => {
		if (field.why === 'unknown') found.push(field);
	});
	return found;
}

const registryOf = (schemas: readonly SchemaType[]) => new Map(schemas.map((s) => [s.name, s]));

function storedPlaces(
	schema: SchemaType,
	previous: readonly unknown[],
	schemas: readonly SchemaType[]
): Set<string> {
	const stored = new Set<string>();
	for (const version of previous) {
		walk(schema.fields, schema.title, version, ROOT, registryOf(schemas), (found) =>
			stored.add(identity(found))
		);
	}
	return stored;
}

interface Found {
	/** Where it is in this version, for the message. */
	path: string;
	/** The same, addressing list items by `_key` as patch paths do. */
	keyPath: string;
	/** The same, a step at a time. */
	segments: ReadonlyArray<string | number>;
	/** Where it is by its nearest keyed item, which survives a move. */
	place: string;
	value: unknown;
	why: keyof UnusableFields;
	reason: string;
}

const identity = ({ place, value }: Found) => `${place}\u0000${stable(value)}`;

/** JSON with sorted keys: a database may hand an object back in another order. */
function stable(value: unknown): string {
	return JSON.stringify(value, (_key, inner: unknown) =>
		isRecord(inner)
			? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => (a < b ? -1 : 1)))
			: inner
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isEmpty = (value: unknown) => value === undefined || value === null || value === '';

type Cursor = Pick<Found, 'path' | 'keyPath' | 'place' | 'segments'>;
const ROOT: Cursor = { path: '', keyPath: '', place: '', segments: [] };

function walk(
	fields: readonly Field[],
	title: string,
	data: unknown,
	cursor: Cursor,
	registry: ReadonlyMap<string, SchemaType>,
	report: (found: Found) => void
): void {
	if (!isRecord(data)) return;
	const byName = new Map(fields.map((field) => [field.name, field]));

	for (const [key, value] of Object.entries(data)) {
		// `_type`, `_key` and the like are structure, and clearing a field is always allowed.
		if (key.startsWith('_') || isEmpty(value)) continue;
		const at = {
			path: cursor.path ? `${cursor.path}.${key}` : key,
			keyPath: cursor.keyPath ? `${cursor.keyPath}.${key}` : key,
			segments: [...cursor.segments, key],
			place: `${cursor.place}.${key}`,
			value
		};
		const field = byName.get(key);

		if (!field) {
			const names = fields.filter((f) => !f.deprecated).map((f) => f.name);
			report({
				...at,
				why: 'unknown',
				reason: `isn't a field of ${title}. Its fields: ${names.join(', ')}`
			});
			continue;
		}
		if (field.deprecated) {
			report({ ...at, why: 'deprecated', reason: `is no longer used. ${field.deprecated.reason}` });
			continue;
		}
		if (field.type === 'object') {
			walk(field.fields, field.title, value, at, registry, report);
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
					{
						path: `${at.path}[${index}]`,
						keyPath: keyed ? `${at.keyPath}[_key=="${keyed}"]` : `${at.keyPath}[${index}]`,
						segments: [...at.segments, index],
						place: keyed ? `${String(item._type)}:${keyed}` : `${at.place}[${index}]`
					},
					registry,
					report
				);
			});
		}
	}
}
