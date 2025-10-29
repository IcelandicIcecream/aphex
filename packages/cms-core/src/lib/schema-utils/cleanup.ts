import type { SchemaType, Field, ArrayField } from '../types/schemas.js';

export interface OrphanedField {
	path: string;
	key: string;
	value: any;
	level: 'document' | 'nested';
}

export interface SchemaCleanupResult {
	hasOrphanedFields: boolean;
	orphanedFields: OrphanedField[];
	cleanedData: Record<string, any>;
}

/**
 * Find orphaned fields in document data that no longer exist in the schema
 */
export function findOrphanedFields(
	documentData: Record<string, any>,
	schema: SchemaType
): SchemaCleanupResult {
	const orphanedFields: OrphanedField[] = [];

	function checkObject(
		obj: Record<string, any>,
		fields: Field[],
		pathPrefix = ''
	): Record<string, any> {
		const cleaned: Record<string, any> = {};
		const fieldMap = new Map(fields.map((field) => [field.name, field]));

		for (const [key, value] of Object.entries(obj)) {
			const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
			const field = fieldMap.get(key);

			if (!field) {
				// Orphaned field found
				orphanedFields.push({
					path: currentPath,
					key,
					value,
					level: pathPrefix ? 'nested' : 'document'
				});
				continue; // Skip this field in cleaned data
			}

			// Recursively check nested objects and arrays
			if (field.type === 'object' && field.fields && value && typeof value === 'object') {
				cleaned[key] = checkObject(value, field.fields, currentPath);
			} else if (field.type === 'array' && Array.isArray(value)) {
				cleaned[key] = checkArray(value, field, currentPath);
			} else {
				cleaned[key] = value;
			}
		}

		return cleaned;
	}

	function checkArray(array: any[], arrayField: Field, pathPrefix: string): any[] {
		if (arrayField.type !== 'array' || !arrayField.of) {
			return array;
		}

		return array.map((item, index) => {
			const itemPath = `${pathPrefix}[${index}]`;

			if (item && typeof item === 'object' && item._type) {
				// Find the schema for this array item type
				const itemTypeSchema = getSchemaForArrayItem(item._type, arrayField);
				if (itemTypeSchema && itemTypeSchema.fields) {
					return checkObject(item, itemTypeSchema.fields, itemPath);
				}
			}

			return item;
		});
	}

	const cleanedData = checkObject(documentData, schema.fields);

	return {
		hasOrphanedFields: orphanedFields.length > 0,
		orphanedFields,
		cleanedData
	};
}

/**
 * Get the schema for an array item type (helper function)
 * This would need to be integrated with your schema registry
 */
function getSchemaForArrayItem(typeName: string, arrayField: ArrayField): SchemaType | null {
	// This is a placeholder - you'd need to integrate with your actual schema registry
	// For now, we'll assume inline object schemas
	if (arrayField.of) {
		const typeRef = arrayField.of.find((ref) => ref.type === typeName);
		if (typeRef && typeof typeRef !== 'string') {
			// Handle inline schema definitions if needed
			return null;
		}
	}
	return null;
}

/**
 * Apply cleanup by removing orphaned fields from document data
 */
export function applySchemaCleanup(
	documentData: Record<string, any>,
	schema: SchemaType
): Record<string, any> {
	const result = findOrphanedFields(documentData, schema);
	return result.cleanedData;
}
