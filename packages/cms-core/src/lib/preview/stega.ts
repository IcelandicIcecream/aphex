import { vercelStegaCombine, vercelStegaClean, vercelStegaDecode } from '@vercel/stega';
import type { Field, SchemaType, TypeReference } from '../types/schemas.js';
import { getSchemaByName } from '../schema-utils/utils.js';

/**
 * Resolve the `fields` for an array member / block. Members are usually named type
 * references (`{ type: 'doctorGridBlock' }`) with no inline `fields`, so without the
 * schema registry the encoder can't reach into them and the item's text is never
 * stega-encoded (invisible to click-to-edit). Prefer an inline `fields`, otherwise
 * look the type up in the registry.
 */
function resolveFields(
	typeRef: TypeReference | undefined,
	itemType: string | undefined,
	schemas: SchemaType[]
): Field[] | undefined {
	if (typeRef?.fields) return typeRef.fields as Field[];
	const name = itemType ?? typeRef?.type;
	if (!name) return undefined;
	const schema = getSchemaByName(schemas, name);
	return schema && 'fields' in schema ? (schema.fields as Field[]) : undefined;
}

/**
 * Remove all stega-encoded data from a string or deep JSON structure.
 * Use in <svelte:head> (title, meta), alt text, aria-labels — anywhere the raw
 * string is needed without invisible characters.
 */
export function stegaClean<T>(value: T): T {
	return vercelStegaClean(value);
}

/** Decode the stega payload from a string. Returns null if not encoded. */
export function stegaDecode(value: string): {
	field: string;
	blockIndex?: number;
	blockKey?: string;
	arrayIndex?: number;
	objectPath?: string;
} | null {
	return (
		vercelStegaDecode<{
			field: string;
			blockIndex?: number;
			blockKey?: string;
			arrayIndex?: number;
			objectPath?: string;
		}>(value) ?? null
	);
}

/**
 * Recursively encode all string-bearing fields in a document with their top-level
 * field name. Handles: string/text/url, string arrays, object subfields, and
 * portable text blocks (including custom block types like callout, codeBlock).
 *
 * Every nested string always encodes the *top-level* field name so that clicking
 * in the preview navigates to the correct editor field.
 */
export function stegaEncodeDocument(
	data: Record<string, unknown>,
	fields: Field[],
	schemas: SchemaType[] = []
): Record<string, unknown> {
	const result: Record<string, unknown> = { ...data };
	for (const field of fields) {
		const val = result[field.name];
		if (val == null) continue;
		// objectPath is undefined at root — each field IS the top-level, no sub-path needed
		result[field.name] = encodeFieldValue(val, field, field.name, undefined, schemas);
	}
	return result;
}

// ---------------------------------------------------------------------------
// Internal helpers — topLevel is always the document root field name so the
// editor knows which field to scroll to; objectPath carries the dotted sub-path
// so the editor can drill into nested inputs.
// ---------------------------------------------------------------------------

function encodeFieldValue(
	val: unknown,
	field: Field,
	topLevel: string,
	objectPath: string | undefined,
	schemas: SchemaType[]
): unknown {
	if (val == null) return val;

	const path = objectPath ? `${objectPath}.${field.name}` : field.name;

	switch (field.type) {
		case 'string':
		case 'text':
		case 'url':
			if (typeof val === 'string' && val) {
				const payload: Record<string, unknown> = { field: topLevel };
				// Only include objectPath for nested fields (not the top-level field itself)
				if (objectPath) payload.objectPath = path;
				return vercelStegaCombine(val, payload);
			}
			return val;

		case 'array':
			if (!Array.isArray(val)) return val;
			// Only forward objectPath when truly nested (inside an object); top-level
			// arrays must NOT get an objectPath or the arrayIndex navigation branch is skipped.
			return encodeArray(val, field.of, topLevel, objectPath ? path : undefined, schemas);

		case 'object': {
			// Inline `fields`, or a named object type resolved from the registry.
			const objFields = field.fields ?? resolveFields(field, field.type, schemas);
			if (typeof val !== 'object' || !objFields) return val;
			return encodeObject(val as Record<string, unknown>, objFields, topLevel, path, schemas);
		}

		// image, file, reference, slug, number, boolean, date, datetime — not text, skip.
		// Image click-to-edit is handled at render time (the frontend stega-encodes the
		// *effective* alt — override or asset default — so every image is clickable, not
		// just ones with a per-placement override).
		default:
			return val;
	}
}

function encodeArray(
	items: unknown[],
	of: TypeReference[],
	topLevel: string,
	objectPath: string | undefined,
	schemas: SchemaType[]
): unknown[] {
	const hasBlock = of.some((t) => t.type === 'block');
	const firstType = of[0]?.type;

	if (hasBlock) {
		// Portable text — encode spans within blocks and string fields in custom block types
		return encodePortableText(items, of, topLevel, schemas);
	}

	if (firstType === 'string' || firstType === 'text') {
		// Primitive string array (e.g. tags) — include the item's array index
		return items.map((item, arrayIndex) => {
			if (typeof item !== 'string' || !item) return item;
			const payload: Record<string, unknown> = { field: topLevel, arrayIndex };
			if (objectPath) payload.objectPath = objectPath;
			return vercelStegaCombine(item, payload);
		});
	}

	// Array of objects — either inline `fields` or named object-type references
	// (`{ type: 'doctorGridBlock' }`) resolved from the schema registry. The latter is
	// the common page-builder case, so resolving is what makes those blocks clickable.
	return items.map((item, arrayIndex) => {
		if (!item || typeof item !== 'object') return item;
		const obj = item as Record<string, unknown>;
		const itemType = typeof obj._type === 'string' ? obj._type : undefined;
		const typeRef = of.find((t) => t.name === obj._type || t.type === obj._type) ?? of[0];
		const fields = resolveFields(typeRef, itemType, schemas);
		if (!fields) return item;
		const itemPath = objectPath ? `${objectPath}[${arrayIndex}]` : `[${arrayIndex}]`;
		return encodeObject(obj, fields, topLevel, itemPath, schemas);
	});
}

function encodeObject(
	obj: Record<string, unknown>,
	fields: Field[],
	topLevel: string,
	objectPath: string | undefined,
	schemas: SchemaType[]
): Record<string, unknown> {
	const result = { ...obj };
	for (const field of fields) {
		const val = result[field.name];
		if (val == null) continue;
		result[field.name] = encodeFieldValue(val, field, topLevel, objectPath, schemas);
	}
	return result;
}

/** Encode portable text: spans in standard blocks + string fields in custom block types. */
function encodePortableText(
	blocks: unknown[],
	of: TypeReference[],
	topLevel: string,
	schemas: SchemaType[]
): unknown[] {
	return blocks.map((block, blockIndex) => {
		if (!block || typeof block !== 'object') return block;
		const b = block as Record<string, unknown>;

		if (b._type === 'block' && Array.isArray(b.children)) {
			// Standard text block — encode each span's text with its block index so the
			// editor can position the cursor at the exact block when clicked.
			return {
				...b,
				children: b.children.map((child: unknown) => {
					if (!child || typeof child !== 'object') return child;
					const span = child as Record<string, unknown>;
					if (span._type === 'span' && typeof span.text === 'string' && span.text) {
						return {
							...span,
							text: vercelStegaCombine(span.text, { field: topLevel, blockIndex })
						};
					}
					return child;
				})
			};
		}

		// Built-in image block — click-to-edit is stamped at render time (the frontend
		// stega-encodes the effective alt with this block's _key), so no encoding here.
		if (b._type === 'image') return block;

		// Custom block type (callout, codeBlock, etc.) — encode string fields, carrying
		// blockIndex so clicking them opens the block's edit modal in the editor. Fields
		// come from an inline definition or a named object type in the registry.
		const typeRef = of.find((t) => t.name === b._type || t.type === b._type);
		const fields = resolveFields(
			typeRef,
			typeof b._type === 'string' ? b._type : undefined,
			schemas
		);
		if (fields) {
			return encodeCustomBlock(b, fields, topLevel, blockIndex);
		}

		return block;
	});
}

/** Encode string fields of a custom block with { field, blockIndex, blockKey } so the editor can open the modal. */
function encodeCustomBlock(
	obj: Record<string, unknown>,
	fields: Field[],
	topLevel: string,
	blockIndex: number
): Record<string, unknown> {
	const result = { ...obj };
	const blockKey = typeof obj._key === 'string' ? obj._key : undefined;
	for (const field of fields) {
		const val = result[field.name];
		if (!val) continue;
		if (
			(field.type === 'string' || field.type === 'text' || field.type === 'url') &&
			typeof val === 'string'
		) {
			result[field.name] = vercelStegaCombine(val, { field: topLevel, blockIndex, blockKey });
		}
	}
	return result;
}
