import type { ArrayField, Field, SchemaType, TypeReference } from '../types/index';
import { Rule } from './rule';
import { normalizeDateFields } from './date-utils';
import { cmsLogger } from '../utils/logger';

export interface ValidationError {
	level: 'error' | 'warning' | 'info';
	message: string;
	/**
	 * Which of the two questions this error answers.
	 *
	 * `structural` — the data cannot be interpreted as the schema at all: wrong
	 * JSON shape for the field type, or a key the schema never declared. Never a
	 * legitimate work-in-progress state, so it's rejected on **every** write,
	 * drafts included. This is the class an agent or a bad client produces.
	 *
	 * `content` — the data is the right shape but isn't finished: required fields
	 * missing, ranges exceeded, cross-field invariants unmet. Perfectly legitimate
	 * mid-edit, so it's only enforced at publish.
	 *
	 * Defaults to `content` when unset — the conservative direction, since
	 * mislabelling a rule error as structural would block saving a draft.
	 */
	kind?: 'structural' | 'content';
}

export interface FieldErrors {
	field: string;
	errors: string[];
	kind: 'structural' | 'content';
}

export interface DocumentValidationResult {
	isValid: boolean;
	errors: FieldErrors[];
	/**
	 * The subset of `errors` that no draft may carry. Empty on a merely
	 * incomplete document; non-empty means the payload is malformed.
	 */
	structuralErrors: FieldErrors[];
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
 * Find which `of` entry an array item belongs to. Mirrors ArrayField.svelte's own
 * resolution (`ref.name === item._type || ref.type === item._type`). An item
 * carrying an explicit `_type` must match one of the declared entries — an
 * unrecognized `_type` is an error, never silently coerced to some other entry,
 * even when only one type is declared. The single-entry fallback only applies
 * when the item has no `_type` tag at all (untagged items in a single-type array).
 */
function resolveArrayItemTypeRef(of: TypeReference[], item: unknown): TypeReference | undefined {
	if (isPlainObject(item) && typeof item._type === 'string') {
		return of.find((ref) => ref.name === item._type || ref.type === item._type);
	}
	if (of.length === 1) return of[0];
	return undefined;
}

/**
 * A leaf field error message is always formatted as `Field "<path>" <reason>`
 * (see the bottom of `validateField`). When that message becomes an input to a
 * shallower level of array-item recursion, re-wrapping it verbatim would nest
 * "Field ..." text once per level. Instead, pull the deeper path back out so the
 * caller can extend it into one clean breadcrumb and keep only the reason.
 */
function splitFieldMessage(message: string): { path: string | null; reason: string } {
	const match = message.match(/^Field "([^"]+)"\s*(.*)$/s);
	return match
		? { path: match[1] ?? null, reason: match[2] ?? message }
		: { path: null, reason: message };
}

/**
 * Shape-check a single Portable Text text block (`_type: 'block'`) — `_key`, `children`
 * (spans and/or inline objects), and `markDefs` all need to be the shape
 * portable-text-serializer.ts produces, since nothing else in this write path checks it.
 * A source that isn't the TipTap editor (an agent's `content_patch_fields` call, an
 * imported document) has no other gate before this reaches storage.
 */
function validatePortableTextBlock(
	item: unknown,
	itemPath: string
): Array<{ field: string; errors: string[] }> {
	if (!isPlainObject(item)) {
		return [
			{
				field: itemPath,
				errors: [`expected a Portable Text block object, got ${describeValue(item)}`]
			}
		];
	}

	const errors: string[] = [];

	if (typeof item._key !== 'string' || item._key.length === 0) {
		errors.push('is missing a non-empty "_key"');
	}
	if (item.style !== undefined && typeof item.style !== 'string') {
		errors.push(`"style" must be a string, got ${describeValue(item.style)}`);
	}
	if (item.listItem !== undefined && typeof item.listItem !== 'string') {
		errors.push(`"listItem" must be a string, got ${describeValue(item.listItem)}`);
	}
	if (item.level !== undefined && typeof item.level !== 'number') {
		errors.push(`"level" must be a number, got ${describeValue(item.level)}`);
	}

	if (!Array.isArray(item.children)) {
		errors.push(`"children" must be an array, got ${describeValue(item.children)}`);
	} else {
		item.children.forEach((child, childIndex) => {
			const childLabel = `child[${childIndex}]`;
			if (!isPlainObject(child)) {
				errors.push(`${childLabel} expected an object, got ${describeValue(child)}`);
				return;
			}
			if (typeof child._type !== 'string' || child._type.length === 0) {
				errors.push(`${childLabel} is missing a "_type"`);
			}
			if (typeof child._key !== 'string' || child._key.length === 0) {
				errors.push(`${childLabel} is missing a non-empty "_key"`);
			}
			if (child._type === 'span') {
				if (typeof child.text !== 'string') {
					errors.push(
						`${childLabel} (span) "text" must be a string, got ${describeValue(child.text)}`
					);
				}
				if (child.marks !== undefined && !Array.isArray(child.marks)) {
					errors.push(
						`${childLabel} (span) "marks" must be an array, got ${describeValue(child.marks)}`
					);
				}
			}
		});
	}

	if (item.markDefs !== undefined) {
		if (!Array.isArray(item.markDefs)) {
			errors.push(`"markDefs" must be an array, got ${describeValue(item.markDefs)}`);
		} else {
			item.markDefs.forEach((def, defIndex) => {
				if (!isPlainObject(def)) {
					errors.push(`markDefs[${defIndex}] expected an object, got ${describeValue(def)}`);
					return;
				}
				if (typeof def._type !== 'string' || def._type.length === 0) {
					errors.push(`markDefs[${defIndex}] is missing a "_type"`);
				}
				if (typeof def._key !== 'string' || def._key.length === 0) {
					errors.push(`markDefs[${defIndex}] is missing a non-empty "_key"`);
				}
			});
		}
	}

	return errors.length > 0 ? [{ field: itemPath, errors }] : [];
}

/**
 * Recursively validate each array item against the type it resolves to in `of`.
 * This is the check that was previously entirely missing: `validateValueShape`
 * only confirmed the field's value IS an array, never that its items match `of` —
 * so a mistyped or malformed array item (wrong `_type`, missing required nested
 * fields) passed validation silently regardless of whether `of` was well-formed.
 *
 * Named types in `of` that aren't inline objects (`fields` absent) — i.e. a
 * reference to another registered schema by name — aren't resolvable here: this
 * module has no schema registry. Those items are left unvalidated, same as
 * before this fix, rather than guessed at.
 */
async function validateArrayItems(
	field: ArrayField,
	items: unknown[],
	context: any
): Promise<Array<{ field: string; errors: string[] }>> {
	const of = field.of ?? [];
	const results: Array<{ field: string; errors: string[] }> = [];

	for (let index = 0; index < items.length; index++) {
		const item = items[index];
		const itemPath = `${field.name}[${index}]`;
		const typeRef = resolveArrayItemTypeRef(of, item);

		if (!typeRef) {
			const gotType =
				isPlainObject(item) && typeof item._type === 'string' ? item._type : describeValue(item);
			const declared = of.map((t) => t.name ?? t.type).join(', ') || '(none declared)';
			results.push({
				field: itemPath,
				errors: [
					`has type "${gotType}", which is not one of the declared array item types: ${declared}`
				]
			});
			continue;
		}

		// Portable Text text blocks (`_type: 'block'`) — the shape the TipTap editor always
		// produces (portable-text-serializer.ts), but nothing an agent-authored patch is bound
		// to. Custom block types (any other `_type` in `of`) fall through to the `typeRef.fields`
		// branch below and get full field validation already; this is the one shape the rest of
		// this function never checked.
		if (typeRef.type === 'block') {
			results.push(...validatePortableTextBlock(item, itemPath));
			continue;
		}

		if (typeRef.type === 'reference') {
			if (!isPlainObject(item) || typeof item._ref !== 'string') {
				results.push({
					field: itemPath,
					errors: [
						`expected a reference object { _type: 'reference', _ref: '<documentId>' }, got ${describeValue(item)}`
					]
				});
			}
			continue;
		}

		if (typeRef.fields) {
			if (!isPlainObject(item)) {
				results.push({
					field: itemPath,
					errors: [`expected an object, got ${describeValue(item)}`]
				});
				continue;
			}
			const nested = await validateFieldSet(typeRef.fields, item, context);
			for (const err of nested) {
				for (const rawMessage of err.errors) {
					const { path, reason } = splitFieldMessage(rawMessage);
					results.push({ field: `${itemPath}.${path ?? err.field}`, errors: [reason] });
				}
			}
		}
	}

	return results;
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
			errors: [
				{ level: 'error', message: `Field "${field.name}" ${shapeError}`, kind: 'structural' }
			]
		};
	}

	// Object fields were previously never recursed into: the shape check above only
	// confirms the value IS an object, so a required field nested inside one was
	// silently unenforced and an undeclared key inside one was never seen.
	if (field.type === 'object' && isPlainObject(value) && Array.isArray(field.fields)) {
		const nested = await validateFieldSet(field.fields, value, context);
		for (const err of nested) {
			allErrors.push({
				level: 'error',
				message: `Field "${field.name}.${err.field}" ${err.errors.join('; ')}`,
				kind: err.kind
			});
		}
	}

	// Array items are never validated by the shape check above (it only confirms
	// the value IS an array) — recurse into each item against `field.of` here.
	if (field.type === 'array' && Array.isArray(value)) {
		const itemErrors = await validateArrayItems(field, value, context);
		for (const err of itemErrors) {
			allErrors.push({ level: 'error', message: `Field "${err.field}" ${err.errors.join('; ')}` });
		}
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
 * Validate a flat set of fields against their values in `data`. Shared by
 * top-level document validation and, recursively, by array-item/nested-object
 * validation — `context.document` carries the full top-level document through
 * either way, since it's set once by the top-level caller and left untouched on
 * recursive calls (so cross-field `Rule.custom((v, { document }) => ...)`
 * validators still see the whole document, not just the nested item).
 */
async function validateFieldSet(
	fields: Field[],
	data: Record<string, any>,
	context: any
): Promise<FieldErrors[]> {
	const validationErrors: FieldErrors[] = [];

	// Keys present in the data but absent from the schema.
	//
	// Everything below walks the *schema's* fields and reads `data[field.name]`,
	// so without this pass an undeclared key is never looked at — it validates
	// clean and is persisted verbatim. That's how an agent writing invented field
	// names silently corrupts a document.
	//
	// Underscore-prefixed keys are structural metadata (`_type`, `_key`, `_ref`),
	// not content, so they're never "unknown".
	const declared = new Set(fields.map((field) => field.name));
	for (const key of Object.keys(data ?? {})) {
		if (key.startsWith('_')) continue;
		if (declared.has(key)) continue;
		validationErrors.push({
			field: key,
			errors: [`Unknown field "${key}" — not declared in the schema`],
			kind: 'structural'
		});
	}

	for (const field of fields) {
		const value = data[field.name];

		const result = await validateField(field, value, {
			...context,
			document: context.document !== undefined ? context.document : data
		});

		if (!result.isValid) {
			const errorEntries = result.errors.filter((e) => e.level === 'error');
			const errorMessages = errorEntries.map((e) => e.message);

			if (errorMessages.length > 0) {
				validationErrors.push({
					field: field.name,
					errors: errorMessages,
					// One structural error makes the whole field structural: the value
					// can't be interpreted, so any content rules reported alongside it
					// are noise anyway.
					kind: errorEntries.some((e) => e.kind === 'structural') ? 'structural' : 'content'
				});
			}
		}
	}

	return validationErrors;
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

	// Normalize date fields: convert to ISO for storage, user format for validation
	const { normalizedData, dataForValidation } = normalizeDateFields(data, schema);

	cmsLogger.debug('[validateDocumentData]', 'After normalization', {
		normalizedData,
		dataForValidation
	});

	const validationErrors = await validateFieldSet(schema.fields, dataForValidation, context);

	cmsLogger.debug('[validateDocumentData]', 'Final result', {
		isValid: validationErrors.length === 0,
		errors: validationErrors
	});

	return {
		isValid: validationErrors.length === 0,
		errors: validationErrors,
		structuralErrors: validationErrors.filter((e) => e.kind === 'structural'),
		normalizedData
	};
}
