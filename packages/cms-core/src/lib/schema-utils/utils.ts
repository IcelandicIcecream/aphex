import type { SchemaType } from '../types/schemas';

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
