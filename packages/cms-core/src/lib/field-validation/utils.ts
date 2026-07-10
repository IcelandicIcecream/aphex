import type { ColorField, Field, SchemaType } from '../types/index';
import { Rule } from './rule';
import { normalizeDateFields } from './date-utils';
import { cmsLogger } from '../utils/logger';

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

function describeValue(value: unknown): string {
	if (Array.isArray(value)) return 'an array';
	if (value === null) return 'null';
	if (typeof value === 'object') return 'an object';
	return `a ${typeof value}`;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Structural (shape) validation for a field's stored value — the depth=0 write
 * shape. This catches a caller (notably an AI agent over MCP) sending the wrong
 * JSON shape that presence/required checks would miss: a slug as `{ current }`
 * (Sanity's convention — AphexCMS stores slugs as plain strings), or a
 * reference/image missing its `_ref`. Runs before the user's Rule validation
 * and only when a value is meaningfully present (absent/empty is a required-ness
 * concern, handled separately), so optional and half-filled fields are left
 * alone. Returns an error message, or null when the shape is acceptable.
 *
 * Intentionally conservative: only unambiguous mismatches error, and empty
 * placeholders (`''`, an image with no `asset`) are treated as absent so the
 * admin's in-progress edit states don't trip it.
 */
export function validateValueShape(field: Field, value: unknown): string | null {
	// Absent (or an empty-string placeholder for a non-string field) → shape is
	// irrelevant here; presence is enforced by Rule().required().
	if (value === null || value === undefined) return null;

	switch (field.type) {
		case 'string':
		case 'text':
		case 'slug':
		case 'url':
		case 'color':
			return typeof value === 'string' ? null : `expected a string, got ${describeValue(value)}`;
		case 'reference':
			if (value === '') return null;
			return isPlainObject(value) && typeof value._ref === 'string'
				? null
				: `expected a reference object { _type: 'reference', _ref: '<documentId>' }, got ${describeValue(value)}`;
		case 'image':
		case 'file': {
			if (value === '') return null;
			if (!isPlainObject(value))
				return `expected an ${field.type} object { _type: '${field.type}', asset: { _type: 'reference', _ref: '<assetId>' } }, got ${describeValue(value)}`;
			// An object with no asset yet is a valid empty/in-progress state.
			if (value.asset === undefined || value.asset === null) return null;
			return isPlainObject(value.asset) && typeof value.asset._ref === 'string'
				? null
				: `${field.type} asset must be { _type: 'reference', _ref: '<assetId>' }`;
		}
		case 'array':
			return Array.isArray(value) ? null : `expected an array, got ${describeValue(value)}`;
		case 'object':
			return isPlainObject(value) ? null : `expected an object, got ${describeValue(value)}`;
		default:
			// number/boolean/date/datetime — left to existing auto-rules / user rules.
			return null;
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
	cmsLogger.debug('[validateField]', `Validating field "${field.name}"`, {
		type: field.type,
		value,
		hasValidation: !!field.validation
	});

	const allErrors: ValidationError[] = [];

	// Structural shape check first: if the value is the wrong JSON shape (e.g. a
	// slug sent as `{ current }`, or a reference without `_ref`), report that and
	// stop — the type-assuming auto-rules and user rules below expect the correct
	// primitive/shape and would otherwise throw or emit confusing errors.
	const shapeError = validateValueShape(field, value);
	if (shapeError) {
		return {
			isValid: false,
			errors: [{ level: 'error', message: `Field "${field.name}" ${shapeError}` }]
		};
	}

	// Add automatic validation for date/datetime/url fields based on type
	if (field.type === 'date') {
		const dateField = field as any;
		const dateFormat = dateField.options?.dateFormat || 'YYYY-MM-DD';
		cmsLogger.debug('[validateField]', `Adding automatic DATE validation for "${field.name}"`, {
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
		cmsLogger.debug('[validateField]', `Adding automatic DATETIME validation for "${field.name}"`, {
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
			cmsLogger.debug('[validateField]', `Adding automatic URL validation for "${field.name}"`);

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
			cmsLogger.debug(
				'[validateField]',
				`Skipping automatic URL validation for "${field.name}" (has custom validation)`
			);
		}
	} else if (field.type === 'color') {
		// Only add automatic hex-color validation when there's no custom validation.
		if (!field.validation && value && value !== '') {
			const allowAlpha = (field as ColorField).options?.alpha === true;
			// 3/6-digit hex, plus 4/8-digit when alpha is enabled.
			const pattern = allowAlpha
				? /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
				: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
			const autoRule = new Rule().regex(pattern, 'hex color');
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
	}

	// Run user-defined validation rules if present
	if (!field.validation) {
		cmsLogger.debug('[validateField]', `No custom validation rules for "${field.name}"`);
	} else {
		try {
			const validationFunctions = Array.isArray(field.validation)
				? field.validation
				: [field.validation];

			cmsLogger.debug(
				'[validateField]',
				`Field "${field.name}" has ${validationFunctions.length} custom validation function(s)`
			);

			for (const validationFn of validationFunctions) {
				const rule = validationFn(new Rule());

				if (!(rule instanceof Rule)) {
					cmsLogger.error(
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
			cmsLogger.error('[validateField]', `Validation error for "${field.name}":`, error);
			allErrors.push({ level: 'error', message: 'Validation failed' });
		}
	}

	const isValid = allErrors.filter((e) => e.level === 'error').length === 0;

	cmsLogger.debug('[validateField]', `Field "${field.name}" validation complete`, {
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
	cmsLogger.debug('[validateDocumentData]', 'Starting validation', {
		schemaName: schema.name,
		data
	});

	const validationErrors: Array<{ field: string; errors: string[] }> = [];

	// Normalize date fields: convert to ISO for storage, user format for validation
	const { normalizedData, dataForValidation } = normalizeDateFields(data, schema);

	cmsLogger.debug('[validateDocumentData]', 'After normalization', {
		normalizedData,
		dataForValidation
	});

	// Validate each field using the user-formatted data
	for (const field of schema.fields) {
		const value = dataForValidation[field.name];
		cmsLogger.debug('[validateDocumentData]', `Validating field "${field.name}"`, {
			type: field.type,
			value
		});

		const result = await validateField(field, value, { ...context, ...dataForValidation });

		cmsLogger.debug('[validateDocumentData]', `Field "${field.name}" validation result`, {
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

	cmsLogger.debug('[validateDocumentData]', 'Final result', {
		isValid: validationErrors.length === 0,
		errors: validationErrors
	});

	return {
		isValid: validationErrors.length === 0,
		errors: validationErrors,
		normalizedData
	};
}
