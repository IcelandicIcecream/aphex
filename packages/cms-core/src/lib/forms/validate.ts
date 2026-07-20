// Compile a form's fields into the same validation the admin runs. A form definition IS a
// schema's worth of fields, so we adapt it to a `SchemaType` and hand it to the standard
// document validator — required checks, formats, and every custom `Rule` come for free, and
// errors come back in the shape every other surface already uses.
import type { SchemaType } from '../types/schemas';
import type { FormDefinition } from './types';
import { validateDocumentData, type DocumentValidationResult } from '../field-validation/utils';

/** Adapt a form to a schema-like object so the field validator can run against it. */
function formToSchema(form: FormDefinition): SchemaType {
	return {
		type: 'object',
		name: form.id,
		title: form.title,
		fields: [...form.fields]
	};
}

/**
 * Validate raw submission data against a form's fields. Returns the standard
 * `DocumentValidationResult` (`isValid`, field-keyed `errors`, `normalizedData`) — the core
 * submit path rejects on `!isValid` and stores/emits from `normalizedData`.
 */
export function validateFormData(
	form: FormDefinition,
	data: Record<string, unknown>
): Promise<DocumentValidationResult> {
	return validateDocumentData(formToSchema(form), data);
}
