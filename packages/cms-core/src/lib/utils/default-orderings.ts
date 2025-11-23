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

	// Common field names that are good for sorting (Sanity's heuristic)
	const commonTitleFields = ['title', 'name', 'label', 'heading', 'header', 'caption', 'description'];

	// Find common string fields
	const titleFields = schema.fields.filter(
		(field) => field.type === 'string' && commonTitleFields.includes(field.name)
	);

	if (titleFields.length > 0) {
		// Generate orderings for common title fields
		titleFields.forEach((field) => {
			orderings.push(
				{
					title: `${field.title} (A-Z)`,
					name: `${field.name}Asc`,
					by: [{ field: field.name, direction: 'asc' }]
				},
				{
					title: `${field.title} (Z-A)`,
					name: `${field.name}Desc`,
					by: [{ field: field.name, direction: 'desc' }]
				}
			);
		});
	} else {
		// No common fields found, generate for all primitive fields
		const primitiveFields = schema.fields.filter((field) =>
			['string', 'number', 'boolean', 'date', 'datetime'].includes(field.type)
		);

		primitiveFields.forEach((field) => {
			const isNumeric = field.type === 'number';
			const isDate = field.type === 'date' || field.type === 'datetime';
			const isBoolean = field.type === 'boolean';

			if (isBoolean) {
				// For boolean, just add one ordering
				orderings.push({
					title: field.title,
					name: `${field.name}Desc`,
					by: [{ field: field.name, direction: 'desc' }]
				});
			} else if (isNumeric || isDate) {
				// For numbers and dates, show high-to-low and low-to-high
				orderings.push(
					{
						title: `${field.title} (${isDate ? 'Newest' : 'High to Low'})`,
						name: `${field.name}Desc`,
						by: [{ field: field.name, direction: 'desc' }]
					},
					{
						title: `${field.title} (${isDate ? 'Oldest' : 'Low to High'})`,
						name: `${field.name}Asc`,
						by: [{ field: field.name, direction: 'asc' }]
					}
				);
			} else {
				// For strings, show A-Z and Z-A
				orderings.push(
					{
						title: `${field.title} (A-Z)`,
						name: `${field.name}Asc`,
						by: [{ field: field.name, direction: 'asc' }]
					},
					{
						title: `${field.title} (Z-A)`,
						name: `${field.name}Desc`,
						by: [{ field: field.name, direction: 'desc' }]
					}
				);
			}
		});
	}

	// Always add meta field orderings at the end
	orderings.push(
		{
			title: 'Last Edited',
			name: 'updatedAtDesc',
			by: [{ field: 'updatedAt', direction: 'desc' }]
		},
		{
			title: 'First Edited',
			name: 'updatedAtAsc',
			by: [{ field: 'updatedAt', direction: 'asc' }]
		},
		{
			title: 'Created (Newest)',
			name: 'createdAtDesc',
			by: [{ field: 'createdAt', direction: 'desc' }]
		},
		{
			title: 'Created (Oldest)',
			name: 'createdAtAsc',
			by: [{ field: 'createdAt', direction: 'asc' }]
		}
	);

	return orderings;
}
