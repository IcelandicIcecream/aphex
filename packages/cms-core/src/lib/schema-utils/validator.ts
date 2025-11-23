import type { SchemaType, Field } from '../types/schemas';

// Reserved field names that conflict with system properties
const RESERVED_FIELD_NAMES = [
	'id',
	'type',
	'status',
	'organizationId',
	'createdBy',
	'updatedBy',
	'createdAt',
	'updatedAt',
	'publishedAt',
	'draftData',
	'publishedData',
	'publishedHash'
];

/**
 * Check if a field name is reserved
 */
export function isReservedFieldName(fieldName: string): boolean {
	return RESERVED_FIELD_NAMES.includes(fieldName);
}

/**
 * Validate all schema references to ensure they exist
 */
export function validateSchemaReferences(schemas: SchemaType[]): void {
	const schemaNames = new Set(schemas.map((schema) => schema.name));
	const errors: string[] = [];

	// Primitive field types that don't need schema validation
	const primitiveTypes = [
		'string',
		'text',
		'number',
		'boolean',
		'slug',
		'url',
		'image',
		'date',
		'datetime',
		'reference'
	];
	const validFieldTypes = [...primitiveTypes, 'array', 'object'];

	function validateField(field: Field, parentSchema: string): void {
		// Check that field has a valid type (cast to any to access name property)
		if (!(field as any).type) {
			errors.push(
				`Schema "${parentSchema}" field "${(field as any).name || 'unknown'}" is missing required "type" property`
			);
			return; // Skip further validation if type is missing
		}

		if (!validFieldTypes.includes(field.type)) {
			errors.push(
				`Schema "${parentSchema}" field "${field.name}" has invalid type "${field.type}". Valid types: ${validFieldTypes.join(', ')}`
			);
		}

		// Check for reserved field names
		if (isReservedFieldName(field.name)) {
			errors.push(
				`Schema "${parentSchema}" uses reserved field name "${field.name}". Reserved names: ${RESERVED_FIELD_NAMES.join(', ')}`
			);
		}

		// Check array field references
		if (field.type === 'array' && field.of) {
			for (const arrayType of field.of) {
				// Skip validation for primitive types and inline objects
				if (primitiveTypes.includes(arrayType.type)) {
					continue;
				}
				// Skip inline object definitions (has fields property)
				if (arrayType.type === 'object' && arrayType.fields) {
					continue;
				}
				// Only validate if it's a reference to another schema
				if (!schemaNames.has(arrayType.type)) {
					errors.push(
						`Schema "${parentSchema}" field "${field.name}" references unknown type "${arrayType.type}"`
					);
				}
			}
		}

		// Check object field references (if they reference external types)
		if (field.type === 'object' && typeof field.fields === 'string') {
			if (!schemaNames.has(field.fields)) {
				errors.push(
					`Schema "${parentSchema}" field "${field.name}" references unknown object type "${field.fields}"`
				);
			}
		}

		// Check reference field targets
		if (field.type === 'reference' && 'to' in field && field.to) {
			for (const target of field.to) {
				if (!schemaNames.has(target.type)) {
					errors.push(
						`Schema "${parentSchema}" field "${field.name}" references unknown document type "${target.type}"`
					);
				}
			}
		}

		// Recursively check nested fields -- cast type later or something. cba
		if ('fields' in field && Array.isArray(field.fields)) {
			for (const nestedField of field.fields) {
				validateField(nestedField, parentSchema);
			}
		}
	}

	// Validate each schema
	for (const schema of schemas) {
		// Validate schema type
		if (schema.type !== 'document' && schema.type !== 'object') {
			errors.push(
				`Schema "${schema.name}" has invalid type "${schema.type}". Must be "document" or "object"`
			);
		}

		if (schema.fields) {
			for (const field of schema.fields) {
				validateField(field, schema.name);
			}
		}

		// Validate preview config references
		if (schema.preview?.select) {
			const fieldNames = new Set(schema.fields?.map((f) => f.name) || []);

			// Validate title field reference
			if (schema.preview.select.title && !fieldNames.has(schema.preview.select.title)) {
				errors.push(
					`Schema "${schema.name}" preview.select.title references unknown field "${schema.preview.select.title}"`
				);
			}

			// Validate subtitle field reference
			if (schema.preview.select.subtitle && !fieldNames.has(schema.preview.select.subtitle)) {
				errors.push(
					`Schema "${schema.name}" preview.select.subtitle references unknown field "${schema.preview.select.subtitle}"`
				);
			}

			// Validate media field reference
			if (schema.preview.select.media && !fieldNames.has(schema.preview.select.media)) {
				errors.push(
					`Schema "${schema.name}" preview.select.media references unknown field "${schema.preview.select.media}"`
				);
			}
		}

		// Validate orderings
		if (schema.orderings && schema.orderings.length > 0) {
			const fieldNames = new Set(schema.fields?.map((f) => f.name) || []);
			// Add meta fields that are always available
			fieldNames.add('createdAt');
			fieldNames.add('updatedAt');

			for (const ordering of schema.orderings) {
				// Validate ordering has required properties
				if (!ordering.name) {
					errors.push(`Schema "${schema.name}" has an ordering without a "name" property`);
					continue;
				}

				if (!ordering.title) {
					errors.push(
						`Schema "${schema.name}" ordering "${ordering.name}" is missing required "title" property`
					);
				}

				if (!ordering.by || ordering.by.length === 0) {
					errors.push(
						`Schema "${schema.name}" ordering "${ordering.name}" is missing required "by" array`
					);
					continue;
				}

				// Validate each field in the ordering
				for (const orderItem of ordering.by) {
					if (!orderItem.field) {
						errors.push(
							`Schema "${schema.name}" ordering "${ordering.name}" has an item without a "field" property`
						);
						continue;
					}

					if (!fieldNames.has(orderItem.field)) {
						errors.push(
							`Schema "${schema.name}" ordering "${ordering.name}" references unknown field "${orderItem.field}"`
						);
					}

					if (
						orderItem.direction &&
						orderItem.direction !== 'asc' &&
						orderItem.direction !== 'desc'
					) {
						errors.push(
							`Schema "${schema.name}" ordering "${ordering.name}" field "${orderItem.field}" has invalid direction "${orderItem.direction}". Must be "asc" or "desc"`
						);
					}
				}
			}
		}
	}

	// Throw error if any validation issues found
	if (errors.length > 0) {
		console.error('\nSchema Validation Errors:');
		errors.forEach((error) => console.error(error));

		// Just throw the errors directly
		throw new Error(errors.join('\n'));
	}

	console.log('✅ Schema validation passed - all references are valid');
}
