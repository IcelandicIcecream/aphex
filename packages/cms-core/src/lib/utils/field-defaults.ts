import type { FieldType } from '../types/schemas';

/**
 * Get the default value for a field type
 * @param fieldType - The field type
 * @returns The default value for the field type
 */
export function getDefaultValueForFieldType(fieldType: FieldType): any {
	switch (fieldType) {
		case 'boolean':
			return false;
		case 'array':
			return [];
		case 'object':
			return {};
		case 'number':
			return null;
		default:
			// string, text, slug, url, image, date, datetime, reference
			return '';
	}
}
