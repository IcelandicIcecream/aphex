import type { Field, SchemaType } from '../types/index';
import { Rule } from './rule';
import { normalizeDateFields } from './date-utils';

export interface ValidationError {
	level: 'error' | 'warning' | 'info';
	message: string;
}

export interface DocumentValidationResult {
	isValid: boolean;
	errors: Array<{ field: string; errors: string[] }>;
	normalizedData: Record<string, any>; // Data with dates normalized to ISO
}

/**
 * Check if a field is required based on its validation rules
 */
export function isFieldRequired(field: Field): boolean {
	if (!field.validation) return false;
	try {
		const validationFn = Array.isArray(field.validation) ? field.validation[0] : field.validation;
		if (!validationFn) return false;
		const rule = validationFn(new Rule());
		return rule.isRequired();
	} catch {
		return false;
	}
}

/**
 * Validate a field value against its validation rules
 */
export async function validateField(
	field: Field,
	value: any,
	context: any = {}
): Promise<{
	isValid: boolean;
	errors: ValidationError[];
}> {
	if (!field.validation) {
		return { isValid: true, errors: [] };
	}

	try {
		const validationFunctions = Array.isArray(field.validation)
			? field.validation
			: [field.validation];

		const allErrors: ValidationError[] = [];

		for (const validationFn of validationFunctions) {
			const rule = validationFn(new Rule());

			if (!(rule instanceof Rule)) {
				console.error(
					`Validation function for field "${field.name}" did not return a Rule object. Make sure you are chaining validation methods and returning the result.`
				);
				continue;
			}

			const markers = await rule.validate(value, {
				path: [field.name],
				...context
			});

			allErrors.push(
				...markers.map((marker) => ({
					level: marker.level,
					message: marker.message
				}))
			);
		}

		const isValid = allErrors.filter((e) => e.level === 'error').length === 0;

		return { isValid, errors: allErrors };
	} catch (error) {
		console.error('Validation error:', error);
		return {
			isValid: false,
			errors: [{ level: 'error', message: 'Validation failed' }]
		};
	}
}

/**
 * Get validation CSS classes for input styling
 */
export function getValidationClasses(hasErrors: boolean): string {
	if (hasErrors) {
		return 'border-destructive border-2';
	}

	// No green styling for success - only show red for errors
	return '';
}

/**
 * Validate an entire document's data against a schema
 * This function:
 * 1. Normalizes date fields (converts user format to ISO for storage)
 * 2. Converts ISO dates to user format for validation
 * 3. Validates all fields and returns errors
 * 4. Returns normalized data (with ISO dates) for storage
 *
 * @param schema - The schema type containing field definitions
 * @param data - The document data to validate
 * @param context - Optional context to pass to field validators
 * @returns Validation result with isValid flag, errors, and normalized data
 */
export async function validateDocumentData(
	schema: SchemaType,
	data: Record<string, any>,
	context: any = {}
): Promise<DocumentValidationResult> {
	const validationErrors: Array<{ field: string; errors: string[] }> = [];

	// Normalize date fields: convert to ISO for storage, user format for validation
	const { normalizedData, dataForValidation } = normalizeDateFields(data, schema);

	// Validate each field using the user-formatted data
	for (const field of schema.fields) {
		const value = dataForValidation[field.name];
		const result = await validateField(field, value, { ...context, ...dataForValidation });

		if (!result.isValid) {
			const errorMessages = result.errors.filter((e) => e.level === 'error').map((e) => e.message);

			if (errorMessages.length > 0) {
				validationErrors.push({
					field: field.name,
					errors: errorMessages
				});
			}
		}
	}

	return {
		isValid: validationErrors.length === 0,
		errors: validationErrors,
		normalizedData
	};
}
