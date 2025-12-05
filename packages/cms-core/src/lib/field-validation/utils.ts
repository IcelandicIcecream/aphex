import type { Field, SchemaType } from '../types/index';
import { Rule } from './rule';
import { normalizeDateFields } from './date-utils';
import { cmsLogger } from '../utils/debug';

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
	cmsLogger('[validateField]', `Validating field "${field.name}"`, {
		type: field.type,
		value,
		hasValidation: !!field.validation
	});

	const allErrors: ValidationError[] = [];

	// Add automatic validation for date/datetime/url fields based on type
	if (field.type === 'date') {
		const dateField = field as any;
		const dateFormat = dateField.options?.dateFormat || 'YYYY-MM-DD';
		cmsLogger('[validateField]', `Adding automatic DATE validation for "${field.name}"`, {
			dateFormat
		});

		const autoRule = new Rule().date(dateFormat);
		const markers = await autoRule.validate(value, {
			path: [field.name],
			...context
		});

		allErrors.push(
			...markers.map((marker) => ({
				level: marker.level,
				message: marker.message
			}))
		);
	} else if (field.type === 'datetime') {
		const dateTimeField = field as any;
		const dateFormat = dateTimeField.options?.dateFormat || 'YYYY-MM-DD';
		const timeFormat = dateTimeField.options?.timeFormat || 'HH:mm';
		cmsLogger('[validateField]', `Adding automatic DATETIME validation for "${field.name}"`, {
			dateFormat,
			timeFormat
		});

		const autoRule = new Rule().datetime(dateFormat, timeFormat);
		const markers = await autoRule.validate(value, {
			path: [field.name],
			...context
		});

		allErrors.push(
			...markers.map((marker) => ({
				level: marker.level,
				message: marker.message
			}))
		);
	} else if (field.type === 'url') {
		// Only add automatic URL validation if there's no custom validation
		// This allows custom validation to specify different options (scheme, allowRelative, relativeOnly)
		if (!field.validation) {
			cmsLogger('[validateField]', `Adding automatic URL validation for "${field.name}"`);

			// Automatic URL validation - only validate if there's a value
			if (value && value !== '') {
				const autoRule = new Rule().uri();
				const markers = await autoRule.validate(value, {
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
		} else {
			cmsLogger('[validateField]', `Skipping automatic URL validation for "${field.name}" (has custom validation)`);
		}
	}

	// Run user-defined validation rules if present
	if (!field.validation) {
		cmsLogger('[validateField]', `No custom validation rules for "${field.name}"`);
	} else {
		try {
			const validationFunctions = Array.isArray(field.validation)
				? field.validation
				: [field.validation];

			cmsLogger('[validateField]', `Field "${field.name}" has ${validationFunctions.length} custom validation function(s)`);

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
		} catch (error) {
			console.error('[validateField]', `Validation error for "${field.name}":`, error);
			allErrors.push({ level: 'error', message: 'Validation failed' });
		}
	}

	const isValid = allErrors.filter((e) => e.level === 'error').length === 0;

	cmsLogger('[validateField]', `Field "${field.name}" validation complete`, {
		isValid,
		errors: allErrors
	});

	return { isValid, errors: allErrors };
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
	cmsLogger('[validateDocumentData]', 'Starting validation', {
		schemaName: schema.name,
		data
	});

	const validationErrors: Array<{ field: string; errors: string[] }> = [];

	// Normalize date fields: convert to ISO for storage, user format for validation
	const { normalizedData, dataForValidation } = normalizeDateFields(data, schema);

	cmsLogger('[validateDocumentData]', 'After normalization', {
		normalizedData,
		dataForValidation
	});

	// Validate each field using the user-formatted data
	for (const field of schema.fields) {
		const value = dataForValidation[field.name];
		cmsLogger("[validateDocumentData]", `Validating field "${field.name}"`, {
			type: field.type,
			value
		});

		const result = await validateField(field, value, { ...context, ...dataForValidation });

		cmsLogger("[validateDocumentData]", `Field "${field.name}" validation result`, {
			isValid: result.isValid,
			errors: result.errors
		});

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

	cmsLogger("[validateDocumentData]", "Final result", {
		isValid: validationErrors.length === 0,
		errors: validationErrors
	});

	return {
		isValid: validationErrors.length === 0,
		errors: validationErrors,
		normalizedData
	};
}
