// Walks a document's data and collects every reference's target ID. Both
// singular and array refs share the same on-disk shape now —
// `{ _type: 'reference', _ref }` — so this can be schema-less.
//
// Asset references (image/file) wrap an Asset, not a document, and aren't
// subject to the publish workflow — so they're skipped (we only collect
// ids whose marker is exactly 'reference').

import type { AnnotationDefinition, Field, SchemaType, TypeReference } from '../types/schemas';

/**
 * Collect all referenced document IDs from a doc's data. The `schema` and
 * `registry` params are accepted for API compatibility but no longer used —
 * the unified ref shape makes them unnecessary.
 */
export function collectReferenceIds(
	data: unknown,
	_schema?: SchemaType | null,
	_registry?: SchemaType[]
): string[] {
	const ids = new Set<string>();
	walk(data, ids);
	return Array.from(ids);
}

function walk(value: unknown, ids: Set<string>): void {
	if (value == null) return;
	if (Array.isArray(value)) {
		for (const item of value) walk(item, ids);
		return;
	}
	if (typeof value !== 'object') return;
	const obj = value as Record<string, unknown>;
	if (obj._type === 'reference' && typeof obj._ref === 'string' && obj._ref) {
		ids.add(obj._ref);
		return;
	}
	// Image/file fields store asset refs ({ _type:'image', asset:{_type:'reference', _ref} })
	// that point to the assets table, not documents — skip them.
	if (obj._type === 'image' || obj._type === 'file') return;
	for (const key of Object.keys(obj)) {
		if (key.startsWith('_')) continue;
		walk(obj[key], ids);
	}
}

/** A field, an array's item type or an annotation: whatever describes a value. */
type Shape = {
	type?: string;
	name?: string;
	weak?: boolean;
	fields?: Field[];
	of?: TypeReference[];
	marks?: { annotations?: AnnotationDefinition[] };
};

/**
 * The documents a doc's data must have published before it can be: every
 * reference except a weak one (`weak: true` on the reference field, or on an
 * array's reference item), as Sanity has it. A weak reference may point at a
 * draft, so two pages that link to each other can both be published.
 *
 * Reads the schema to tell them apart, so references saved before a field was
 * made weak count as weak too. Where the schema says nothing about a value (a
 * field it doesn't list, a type it doesn't have), its references count as strong.
 */
export function collectStrongReferenceIds(
	data: unknown,
	schema: SchemaType | null | undefined,
	registry: SchemaType[] = []
): string[] {
	const ids = new Set<string>();
	if (!schema) walk(data, ids);
	else walkFields(data, schema.fields, registry, ids);
	return Array.from(ids);
}

const isReference = (value: unknown): value is { _ref: string } =>
	!!value &&
	typeof value === 'object' &&
	(value as Record<string, unknown>)._type === 'reference' &&
	typeof (value as Record<string, unknown>)._ref === 'string' &&
	!!(value as Record<string, unknown>)._ref;

const typeName = (value: unknown) =>
	value && typeof value === 'object' ? (value as Record<string, unknown>)._type : undefined;

function walkFields(
	value: unknown,
	fields: Field[] | undefined,
	registry: SchemaType[],
	ids: Set<string>
) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return walk(value, ids);
	if (!fields) return walk(value, ids);
	const obj = value as Record<string, unknown>;
	for (const key of Object.keys(obj)) {
		if (key.startsWith('_')) continue;
		const field = fields.find((entry) => entry.name === key) as Shape | undefined;
		if (field) walkShaped(obj[key], field, registry, ids);
		else walk(obj[key], ids);
	}
}

function walkShaped(value: unknown, shape: Shape, registry: SchemaType[], ids: Set<string>) {
	if (value == null) return;
	if (shape.type === 'reference') {
		if (isReference(value)) {
			if (!shape.weak) ids.add(value._ref);
		} else walk(value, ids);
		return;
	}
	if (shape.type === 'image' || shape.type === 'file') return;
	if (Array.isArray(value)) {
		for (const item of value) {
			const member = memberFor(item, shape.of ?? []);
			if (member) walkShaped(item, member, registry, ids);
			else walk(item, ids);
		}
		return;
	}
	if (typeof value !== 'object') return;
	if (shape.type === 'block')
		return walkBlock(value as Record<string, unknown>, shape, registry, ids);
	const fields = shape.fields ?? registry.find((type) => type.name === shape.type)?.fields;
	walkFields(value, fields, registry, ids);
}

/** The array item type a value is: by its `_type`, else the only one there is. */
function memberFor(item: unknown, of: TypeReference[]): Shape | undefined {
	const type = typeName(item);
	if (typeof type === 'string') {
		return (of.find((entry) => (entry.name ?? entry.type) === type) ??
			(type === 'reference' ? of.find((entry) => entry.type === 'reference') : undefined)) as
			| Shape
			| undefined;
	}
	return of.length === 1 ? (of[0] as Shape) : undefined;
}

/** A rich text block: its annotations (a link's page) and inline objects by their own fields. */
function walkBlock(
	block: Record<string, unknown>,
	shape: Shape,
	registry: SchemaType[],
	ids: Set<string>
) {
	const annotations = shape.marks?.annotations ?? [];
	for (const mark of Array.isArray(block.markDefs) ? block.markDefs : []) {
		const annotation = annotations.find((entry) => entry.name === typeName(mark));
		walkFields(mark, annotation?.fields, registry, ids);
	}
	for (const child of Array.isArray(block.children) ? block.children : []) {
		if (typeName(child) === 'span') continue;
		const inline = memberFor(child, shape.of ?? []);
		if (inline) walkShaped(child, inline, registry, ids);
		else walk(child, ids);
	}
}
