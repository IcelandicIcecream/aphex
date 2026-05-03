// Walk a document's data alongside its schema and collect every
// document-reference ID. Schema-aware so it handles both shapes:
//
//   - Singular reference field: stored as a bare string ('doc-id') —
//     the walker recognises it because the schema field's type is 'reference'.
//   - Array-of-references item: stored as { _type: 'reference', _ref: 'doc-id' }
//     per Sanity convention — the walker recognises it from the embedded _type.
//
// Asset references (image/file) are skipped — those wrap an Asset, not a
// document, and aren't subject to the publish workflow.

import type { Field, SchemaType } from '../types/schemas';

export function collectReferenceIds(
	data: unknown,
	schema?: SchemaType | null,
	registry?: SchemaType[]
): string[] {
	const ids = new Set<string>();
	if (schema?.fields) {
		walkObject(data, schema.fields, registry ?? [], ids);
	} else {
		// Fallback: schema-less walk catches array-style refs only. Used by
		// older callers that don't have schema context handy.
		walkSchemaless(data, ids);
	}
	return Array.from(ids);
}

function walkObject(
	data: unknown,
	fields: Field[],
	registry: SchemaType[],
	ids: Set<string>
): void {
	if (!data || typeof data !== 'object' || Array.isArray(data)) return;
	const obj = data as Record<string, unknown>;
	for (const field of fields) {
		walkField(obj[field.name], field, registry, ids);
	}
}

function walkField(
	value: unknown,
	field: Field,
	registry: SchemaType[],
	ids: Set<string>
): void {
	if (value == null) return;

	if (field.type === 'reference') {
		if (typeof value === 'string' && value) ids.add(value);
		return;
	}

	if (field.type === 'object') {
		const nested = (field as any).fields as Field[] | undefined;
		if (nested) walkObject(value, nested, registry, ids);
		return;
	}

	if (field.type === 'array') {
		if (!Array.isArray(value)) return;
		const ofEntries = ((field as any).of ?? []) as Array<{
			type: string;
			fields?: Field[];
			to?: Array<{ type: string }>;
		}>;
		for (const item of value) {
			if (item == null) continue;
			if (typeof item !== 'object') continue;
			const itemObj = item as Record<string, unknown>;
			const itemType = itemObj._type as string | undefined;

			// Reference array item: { _type: 'reference', _ref: 'id' }
			if (itemType === 'reference') {
				const ref = itemObj._ref;
				if (typeof ref === 'string' && ref) ids.add(ref);
				continue;
			}

			// Schema-defined item — find the matching of[] entry to know its shape
			const ofEntry =
				ofEntries.find((o) => o.type === itemType) ?? ofEntries[0];
			if (!ofEntry) continue;

			if (ofEntry.fields) {
				// Inline object definition
				walkObject(item, ofEntry.fields, registry, ids);
			} else {
				// Registered schema — resolve from the registry to get its fields
				const target = registry.find((s) => s.name === ofEntry.type);
				if (target?.fields) walkObject(item, target.fields, registry, ids);
			}
		}
	}
}

// Schema-less fallback. Walks the data and grabs anything that LOOKS like
// a Sanity-style reference object. Misses singular refs (which are bare
// strings without a _type marker) — that's why the schema-aware path exists.
function walkSchemaless(value: unknown, ids: Set<string>): void {
	if (value == null) return;
	if (Array.isArray(value)) {
		for (const item of value) walkSchemaless(item, ids);
		return;
	}
	if (typeof value !== 'object') return;
	const obj = value as Record<string, unknown>;
	if (obj._type === 'reference' && typeof obj._ref === 'string' && obj._ref) {
		ids.add(obj._ref);
		return;
	}
	for (const key of Object.keys(obj)) {
		if (key.startsWith('_')) continue;
		walkSchemaless(obj[key], ids);
	}
}
