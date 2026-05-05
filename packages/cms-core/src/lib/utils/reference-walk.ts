// Walks a document's data and collects every reference's target ID. Both
// singular and array refs share the same on-disk shape now —
// `{ _type: 'reference', _ref }` — so this can be schema-less.
//
// Asset references (image/file) wrap an Asset, not a document, and aren't
// subject to the publish workflow — so they're skipped (we only collect
// ids whose marker is exactly 'reference').

import type { SchemaType } from '../types/schemas';

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
