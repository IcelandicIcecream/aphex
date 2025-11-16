import type { SchemaType, DateField, DateTimeField } from '../types/index';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';

dayjs.extend(customParseFormat);
dayjs.extend(utc);

/**
 * Convert a date value to user format for validation
 * Handles both ISO format and user format inputs
 */
export function convertDateToUserFormat(
	value: string,
	userFormat: string
): string {
	// Try parsing as ISO format first (what DateField stores)
	// Use strict mode to reject invalid dates
	const parsedISO = dayjs(value, 'YYYY-MM-DD', true);
	if (parsedISO.isValid()) {
		return parsedISO.format(userFormat);
	}

	// Try parsing as user format (what API might send)
	// Use strict mode to reject invalid dates like Feb 31st
	const parsedUser = dayjs(value, userFormat, true);
	if (parsedUser.isValid()) {
		return value; // Already in user format
	}

	// Invalid date - return as-is for validation to catch
	return value;
}

/**
 * Convert a date value to ISO format for storage
 * Returns ISO if already valid, or original value if invalid
 */
export function convertDateToISO(
	value: string,
	userFormat: string
): string {
	// Try parsing as user format first (for API consumers)
	// Use strict mode to reject invalid dates like Feb 31st
	const parsedUser = dayjs(value, userFormat, true);
	if (parsedUser.isValid()) {
		return parsedUser.format('YYYY-MM-DD');
	}

	// Try parsing as ISO (for DateField component)
	// Use strict mode
	const parsedISO = dayjs(value, 'YYYY-MM-DD', true);
	if (parsedISO.isValid()) {
		return value; // Already ISO
	}

	// Invalid date - return as-is
	return value;
}

/**
 * Convert a datetime value to user format for validation
 * Handles both ISO datetime and user format inputs
 */
export function convertDateTimeToUserFormat(
	value: string,
	dateFormat: string,
	timeFormat: string = 'HH:mm'
): string {
	const userFormat = `${dateFormat} ${timeFormat}`;

	// Try parsing as ISO datetime first (what DateTimeField stores)
	// Use strict mode to reject invalid dates
	const parsedISO = dayjs(value, 'YYYY-MM-DDTHH:mm:ss[Z]', true);
	if (parsedISO.isValid()) {
		return parsedISO.format(userFormat);
	}

	// Try parsing as user format (what API might send)
	// Use strict mode to reject invalid dates like Feb 31st
	const parsedUser = dayjs(value, userFormat, true);
	if (parsedUser.isValid()) {
		return value; // Already in user format
	}

	// Invalid datetime - return as-is for validation to catch
	return value;
}

/**
 * Convert a datetime value to ISO UTC format for storage
 * Returns ISO UTC if already valid, or original value if invalid
 */
export function convertDateTimeToISO(
	value: string,
	dateFormat: string,
	timeFormat: string = 'HH:mm'
): string {
	const userFormat = `${dateFormat} ${timeFormat}`;

	console.log('[convertDateTimeToISO]', { value, userFormat });

	// Try parsing as user format first (for API consumers)
	// Use strict mode to reject invalid dates like Feb 31st
	const parsedUser = dayjs(value, userFormat, true);
	if (parsedUser.isValid()) {
		const result = parsedUser.utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
		console.log('[convertDateTimeToISO] User format parse successful, converting to UTC:', result);
		return result;
	}

	// Try parsing as ISO datetime (for DateTimeField component)
	// Use strict mode with ISO format
	const parsedISO = dayjs(value, 'YYYY-MM-DDTHH:mm:ss[Z]', true);
	if (parsedISO.isValid()) {
		const result = parsedISO.utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
		console.log('[convertDateTimeToISO] ISO parse successful:', result);
		return result;
	}

	// Invalid datetime - return as-is
	console.log('[convertDateTimeToISO] Invalid - returning as-is');
	return value;
}

/**
 * Normalize date fields in data object
 * Converts dates to ISO for storage and creates a parallel object with user-formatted dates for validation
 */
export function normalizeDateFields(
	data: Record<string, any>,
	schema: SchemaType
): {
	normalizedData: Record<string, any>;
	dataForValidation: Record<string, any>;
} {
	const normalizedData: Record<string, any> = { ...data };
	const dataForValidation: Record<string, any> = { ...data };

	console.log('[normalizeDateFields] Starting normalization...');
	console.log('[normalizeDateFields] Input data:', data);

	for (const field of schema.fields) {
		if (field.type === 'date' && normalizedData[field.name]) {
			const dateField = field as DateField;
			const userFormat = dateField.options?.dateFormat || 'YYYY-MM-DD';
			const dateValue = normalizedData[field.name];

			console.log(`[normalizeDateFields] Processing DATE field "${field.name}"`, {
				originalValue: dateValue,
				userFormat
			});

			if (typeof dateValue === 'string') {
				normalizedData[field.name] = convertDateToISO(dateValue, userFormat);
				dataForValidation[field.name] = convertDateToUserFormat(dateValue, userFormat);

				console.log(`[normalizeDateFields] Converted DATE field "${field.name}"`, {
					normalizedValue: normalizedData[field.name],
					validationValue: dataForValidation[field.name]
				});
			}
		} else if (field.type === 'datetime' && normalizedData[field.name]) {
			const dateTimeField = field as DateTimeField;
			const dateFormat = dateTimeField.options?.dateFormat || 'YYYY-MM-DD';
			const timeFormat = dateTimeField.options?.timeFormat || 'HH:mm';
			const dateTimeValue = normalizedData[field.name];

			console.log(`[normalizeDateFields] Processing DATETIME field "${field.name}"`, {
				originalValue: dateTimeValue,
				dateFormat,
				timeFormat,
				combinedFormat: `${dateFormat} ${timeFormat}`
			});

			if (typeof dateTimeValue === 'string') {
				normalizedData[field.name] = convertDateTimeToISO(dateTimeValue, dateFormat, timeFormat);
				dataForValidation[field.name] = convertDateTimeToUserFormat(dateTimeValue, dateFormat, timeFormat);

				console.log(`[normalizeDateFields] Converted DATETIME field "${field.name}"`, {
					normalizedValue: normalizedData[field.name],
					validationValue: dataForValidation[field.name]
				});
			}
		}
	}

	console.log('[normalizeDateFields] Final result:', {
		normalizedData,
		dataForValidation
	});

	return { normalizedData, dataForValidation };
}
