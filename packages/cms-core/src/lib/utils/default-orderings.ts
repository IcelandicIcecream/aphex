import type { Ordering, SchemaType } from '../types/schemas';

/**
 * Generate default orderings for a schema following Sanity's heuristics:
 * 1. If the schema has custom orderings defined, use those
 * 2. Otherwise, look for common title-like fields (title, name, label, etc.)
 * 3. If no common fields, generate orderings for all primitive fields
 * 4. Always include createdAt and updatedAt meta fields
 */
export function getOrderingsForSchema(schema: SchemaType): Ordering[] {
	// If custom orderings are defined, use those
	if (schema.orderings && schema.orderings.length > 0) {
		return schema.orderings;
	}

	// Generate default orderings
	const orderings: Ordering[] = [];

	// Priority 1: Use preview.select.title if defined
	let titleField = schema.fields.find(
		(field) => schema.preview?.select?.title && field.name === schema.preview.select.title && field.type === 'string'
	);

	// Priority 2: Common field names in priority order (Sanity's heuristic)
	if (!titleField) {
		const commonTitleFields = ['title', 'name', 'label', 'heading', 'header', 'caption', 'description'];
		titleField = schema.fields.find(
			(field) => field.type === 'string' && commonTitleFields.includes(field.name)
		);
	}

	if (titleField) {
		// Generate ordering for the single most relevant title field (desc only, UI handles toggle)
		orderings.push({
			title: titleField.title,
			name: `${titleField.name}Desc`,
			by: [{ field: titleField.name, direction: 'desc' }]
		});
	} else {
		// No common fields found, generate for all primitive fields
		const primitiveFields = schema.fields.filter((field) =>
			['string', 'number', 'boolean', 'date', 'datetime'].includes(field.type)
		);

		primitiveFields.forEach((field) => {
			// Only generate desc version, UI handles toggle to asc
			orderings.push({
				title: field.title,
				name: `${field.name}Desc`,
				by: [{ field: field.name, direction: 'desc' }]
			});
		});
	}

	// Always add meta field orderings at the end (desc only, UI handles toggle)
	orderings.push(
		{
			title: 'Last Edited',
			name: 'updatedAtDesc',
			by: [{ field: 'updatedAt', direction: 'desc' }]
		},
		{
			title: 'Created',
			name: 'createdAtDesc',
			by: [{ field: 'createdAt', direction: 'desc' }]
		}
	);

	return orderings;
}
