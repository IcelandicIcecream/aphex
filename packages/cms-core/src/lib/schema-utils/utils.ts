import type { SchemaType, SearchFieldConfig } from '../types/schemas';
import { readPath } from '../utils/preview';

/** Field types treated as free text for the purposes of `searchableFields`. */
const SEARCHABLE_FIELD_TYPES = new Set(['string', 'text', 'slug', 'url']);

/**
 * Conventional fallback field names for search when a schema doesn't declare
 * an explicit `search` config. Mirrors the title-resolution fallback in
 * `resolvePreviewTitle` (`title`/`heading`/`name`/`label`), plus `slug`.
 */
const DEFAULT_SEARCH_FIELDS = ['title', 'heading', 'name', 'label', 'slug'];

/**
 * Schema utility functions that work with a schema registry
 * These functions accept schemas as parameters to avoid package-level dependencies
 */

/**
 * Get a schema type by name from a collection of schemas
 */
export function getSchemaByName(schemas: SchemaType[], name: string): SchemaType | null {
	return schemas.find((schema) => schema.name === name) || null;
}

/**
 * Get all available object types (for array field dropdowns)
 */
export function getObjectTypes(schemas: SchemaType[]): SchemaType[] {
	return schemas.filter((schema) => schema.type === 'object');
}

/**
 * Get all available document types
 */
export function getDocumentTypes(schemas: SchemaType[]): SchemaType[] {
	return schemas.filter((schema) => schema.type === 'document');
}

/**
 * Check if a schema type exists
 */
export function schemaExists(schemas: SchemaType[], name: string): boolean {
	return schemas.some((schema) => schema.name === name);
}

/**
 * Build a `search` config from every top-level string-ish field on a schema
 * (`string`, `text`, `slug`, `url`) — the fields worth full-text matching.
 * Doesn't recurse into `object`/`array` fields.
 *
 * Use this to opt a document type into field-wide search instead of hand-listing
 * paths:
 * ```ts
 * const fields = [ ...define fields here... ];
 * export default defineType({
 *   name: 'post',
 *   fields,
 *   search: searchableFields({ fields })
 * })
 * ```
 */
export function searchableFields(schema: Pick<SchemaType, 'fields'>): SearchFieldConfig[] {
	return schema.fields
		.filter((field) => SEARCHABLE_FIELD_TYPES.has(field.type))
		.map((field) => ({ path: field.name }));
}

/**
 * Resolve which dot-paths a document's search index is built from: the
 * schema's explicit `search` config if set, else the conventional title-ish
 * fields (`title`/`heading`/`name`/`label`/`slug`) plus whatever
 * `preview.select.title` points to — the same fields `resolvePreviewTitle`
 * already uses to pick a display title.
 */
export function resolveSearchPaths(schema: Pick<SchemaType, 'search' | 'preview'>): string[] {
	if (schema.search?.length) {
		return schema.search.map((field) => field.path);
	}
	const fallback = new Set(DEFAULT_SEARCH_FIELDS);
	const titlePath = schema.preview?.select?.title;
	if (titlePath) fallback.add(titlePath);
	return Array.from(fallback);
}

/**
 * Flatten the given dot-paths off a document's data into a single normalized
 * string — the value stored in `search_text` and indexed for full-text search.
 */
export function buildSearchText(
	paths: string[],
	data: Record<string, unknown> | null | undefined
): string {
	if (!data) return '';
	const parts: string[] = [];
	for (const path of paths) {
		const value = readPath(data, path);
		if (typeof value === 'string') {
			const trimmed = value.trim();
			if (trimmed) parts.push(trimmed);
		} else if (typeof value === 'number' || typeof value === 'boolean') {
			parts.push(String(value));
		}
	}
	return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Get the available types for an array field
 * Supports both schema references and inline object definitions
 */
export function getArrayTypes(
	schemas: SchemaType[],
	arrayField: { of?: Array<{ type: string; name?: string; title?: string; fields?: any[] }> }
): SchemaType[] {
	if (!arrayField.of) return [];

	const availableTypes: SchemaType[] = [];

	arrayField.of.forEach((item) => {
		// Check if this is an inline object definition
		if (item.fields) {
			// Create a temporary SchemaType from inline definition
			const schemaName = item.name || item.type;
			availableTypes.push({
				type: 'object',
				name: schemaName,
				title: item.title || item.name || item.type,
				fields: item.fields
			});
		} else {
			// Look it up in the schema registry
			const schema = schemas.find((s) => s.name === item.type);
			if (schema) {
				availableTypes.push(schema);
			}
		}
	});

	return availableTypes;
}
