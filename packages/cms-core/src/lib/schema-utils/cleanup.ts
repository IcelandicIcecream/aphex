import { unknownFields } from '../field-validation/new-fields';
import type { SchemaType } from '../types/schemas';

export interface OrphanedField {
	path: string;
	key: string;
	value: any;
	level: 'document' | 'nested';
	/** `path` a step at a time: field names, and list items by index. */
	segments: ReadonlyArray<string | number>;
}

export interface SchemaCleanupResult {
	hasOrphanedFields: boolean;
	orphanedFields: OrphanedField[];
	cleanedData: Record<string, any>;
}

/**
 * Find orphaned fields in document data that no longer exist in the schema, in
 * objects, list items and blocks too. Registered blocks need `schemas` to be checked.
 */
export function findOrphanedFields(
	documentData: Record<string, any>,
	schema: SchemaType,
	schemas: readonly SchemaType[] = []
): SchemaCleanupResult {
	const orphanedFields = unknownFields(schema, documentData, schemas).map(
		({ path, segments, value }): OrphanedField => ({
			path,
			segments,
			value,
			key: String(segments[segments.length - 1]),
			level: segments.length > 1 ? 'nested' : 'document'
		})
	);
	return {
		hasOrphanedFields: orphanedFields.length > 0,
		orphanedFields,
		get cleanedData() {
			return orphanedFields.reduce(withoutField, documentData);
		}
	};
}

/** The data without one orphaned field. Only what holds it is copied. */
export function withoutField(
	data: Record<string, any>,
	field: Pick<OrphanedField, 'segments'>
): Record<string, any> {
	return remove(data, field.segments) as Record<string, any>;
}

function remove(value: unknown, [step, ...rest]: ReadonlyArray<string | number>): unknown {
	if (Array.isArray(value)) {
		return value.map((item, index) => (index === step ? remove(item, rest) : item));
	}
	if (step === undefined || typeof value !== 'object' || value === null) return value;
	return Object.fromEntries(
		Object.entries(value).flatMap(([key, inner]) => {
			if (key !== step) return [[key, inner]];
			return rest.length > 0 ? [[key, remove(inner, rest)]] : [];
		})
	);
}

/**
 * Apply cleanup by removing orphaned fields from document data
 */
export function applySchemaCleanup(
	documentData: Record<string, any>,
	schema: SchemaType,
	schemas: readonly SchemaType[] = []
): Record<string, any> {
	return findOrphanedFields(documentData, schema, schemas).cleanedData;
}
