import type { SchemaType, Field } from '../types/schemas';
import { initialValueProblems } from '../utils/item-initial-value';
import { cmsLogger } from '../utils/logger';
import { unknownFieldsets } from './fieldsets';

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

/** Field names that conflict with system properties and can't be used in a schema. */
export const RESERVED_FIELDS: readonly string[] = RESERVED_FIELD_NAMES;

/** Primitive (leaf) field types. The single runtime source of truth. */
export const PRIMITIVE_FIELD_TYPES: string[] = [
	'string',
	'text',
	'number',
	'boolean',
	'slug',
	'url',
	'image',
	'file',
	'date',
	'datetime',
	'reference'
];

/** All valid field types (primitives + containers). */
export const VALID_FIELD_TYPES: string[] = [...PRIMITIVE_FIELD_TYPES, 'array', 'object'];

/**
 * Validate all schema references to ensure they exist
 */
export function validateSchemaReferences(schemas: SchemaType[]): void {
	const schemaNames = new Set(schemas.map((schema) => schema.name));
	const errors: string[] = [];

	// Duplicate schema names are a hard error — no silent overrides. This matters
	// most once plugins merge their schemas into the app's: a collision would
	// otherwise let one type shadow another. Report every duplicate name once.
	const nameCounts = new Map<string, number>();
	for (const schema of schemas) nameCounts.set(schema.name, (nameCounts.get(schema.name) ?? 0) + 1);
	for (const [name, count] of nameCounts) {
		if (count > 1) {
			errors.push(
				`Duplicate schema name "${name}" (defined ${count} times). Schema names must be unique across app and plugin schemas.`
			);
		}
	}

	// Field-type lists live at module scope (shared source of truth).
	const primitiveTypes = PRIMITIVE_FIELD_TYPES;
	const validFieldTypes = VALID_FIELD_TYPES;

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
		if (field.type === 'array') {
			if (!field.of || field.of.length === 0) {
				errors.push(
					`Schema "${parentSchema}" field "${field.name}" is an array with no "of" — declare at least one item type`
				);
			}
			for (const arrayType of field.of ?? []) {
				// Reference items inside an array must declare `to` and target known schemas
				if (arrayType.type === 'reference') {
					const to = (arrayType as any).to;
					if (!Array.isArray(to) || to.length === 0) {
						errors.push(
							`Schema "${parentSchema}" field "${field.name}" has a reference array item missing "to" — declare allowed target document types`
						);
					} else {
						for (const target of to) {
							if (!schemaNames.has(target.type)) {
								errors.push(
									`Schema "${parentSchema}" field "${field.name}" reference array item targets unknown document type "${target.type}"`
								);
							}
						}
					}
					continue;
				}
				// Skip validation for primitive types and inline objects
				if (primitiveTypes.includes(arrayType.type)) {
					continue;
				}
				// Block type is a built-in for Portable Text block content
				if (arrayType.type === 'block') {
					continue;
				}
				// Skip inline object definitions (has fields property)
				if (arrayType.fields) {
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

		// An inherited value is shown in one control and cleared back with one click:
		// containers hold many values, so each of their fields declares its own.
		if (
			(field as { inherits?: unknown }).inherits &&
			(field.type === 'object' || field.type === 'array')
		) {
			errors.push(
				`Schema "${parentSchema}" field "${field.name}" declares \`inherits\` on an ${field.type}. Declare it on the fields inside instead.`
			);
		}

		// Tags are chips of text: anything else in the array can't be typed into one.
		if (field.type === 'array' && field.options?.layout === 'tags') {
			const strings =
				field.of?.length === 1 && field.of[0]?.type === 'string' && !field.of[0].fields;
			if (!strings) {
				errors.push(
					`Schema "${parentSchema}" field "${field.name}" uses layout "tags", which needs \`of: [{ type: 'string' }]\` and nothing else`
				);
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
			const fieldsets = 'fieldsets' in field ? field.fieldsets : undefined;
			for (const name of unknownFieldsets(field.fields, fieldsets)) {
				errors.push(
					`Schema "${parentSchema}" object field "${field.name}" has a field in unknown fieldset "${name}". Declare it in that object's fieldsets.`
				);
			}
			for (const nestedField of field.fields) {
				validateField(nestedField, parentSchema);
			}
		}

		// An array's inline item types can lay their fields out in fieldsets too.
		if (field.type === 'array' && 'of' in field && Array.isArray(field.of)) {
			for (const item of field.of) {
				if (!item.fields) continue;
				for (const problem of initialValueProblems(item)) {
					errors.push(
						`Schema "${parentSchema}" array field "${field.name}" item "${item.name ?? item.type}" has an initialValue that ${problem}`
					);
				}
				for (const name of unknownFieldsets(item.fields, item.fieldsets)) {
					errors.push(
						`Schema "${parentSchema}" array field "${field.name}" item "${item.name ?? item.type}" has a field in unknown fieldset "${name}". Declare it in that item's fieldsets.`
					);
				}
			}
		}
	}

	// Validate each schema
	for (const schema of schemas) {
		for (const problem of initialValueProblems(schema)) {
			errors.push(`Schema "${schema.name}" has an initialValue that ${problem}`);
		}
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

		if (schema.fields) {
			for (const name of unknownFieldsets(schema.fields, schema.fieldsets)) {
				errors.push(
					`Schema "${schema.name}" has a field in unknown fieldset "${name}". Declare it in schema.fieldsets.`
				);
			}
		}

		// Validate field.group references against schema.groups
		if (schema.fields) {
			const groupNames = new Set((schema.groups ?? []).map((g) => g.name));
			for (const field of schema.fields) {
				if (!field.group) continue;
				const refs = Array.isArray(field.group) ? field.group : [field.group];
				for (const ref of refs) {
					if (!groupNames.has(ref)) {
						errors.push(
							`Schema "${schema.name}" field "${field.name}" references unknown group "${ref}". Declare it in schema.groups.`
						);
					}
				}
			}
		}

		// Validate preview config references. Dot-paths are allowed (e.g.
		// `seo.title`) — validate only the first segment exists at the top
		// level; we don't recurse into nested object types here.
		if (schema.preview?.select) {
			const fieldNames = new Set(schema.fields?.map((f) => f.name) || []);
			const rootOf = (path: string) => path.split('.', 1)[0] ?? path;

			for (const [key, path] of Object.entries(schema.preview.select)) {
				if (typeof path !== 'string' || !path) continue;
				if (!fieldNames.has(rootOf(path))) {
					errors.push(
						`Schema "${schema.name}" preview.select.${key} references unknown field "${path}"`
					);
				}
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
		cmsLogger.error('[Schema]', 'Validation errors:');
		errors.forEach((error) => cmsLogger.error('[Schema]', error));

		// Just throw the errors directly
		throw new Error(errors.join('\n'));
	}

	cmsLogger.info('[Schema]', 'Validation passed - all references are valid');
}
