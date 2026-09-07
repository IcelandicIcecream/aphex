import type { Field, FormDefinition } from '@aphexcms/cms-core';

/**
 * Turn a `form` document — what an editor composed in the studio — into a
 * `FormDefinition`, the developer-authored form shape cms-core already knows how
 * to validate.
 *
 * This is the whole reason the plugin is small. `validateFormData` runs a form's
 * fields through the same engine the admin uses for documents, so "required",
 * "is an email", "within this range" and "one of these options" are already
 * implemented, already consistent with the rest of the CMS, and already returning
 * errors in the shape every other surface uses. Hand-rolling a second validator
 * for submissions would be a second set of rules to keep in step — and the one
 * that runs against untrusted input is the worst place to have a divergent copy.
 *
 * The two layers meet here: `defineForm` is a form a developer writes in code;
 * a `form` document is a form an editor drew in the studio. Compiling the second
 * into the first means only the authoring differs.
 */

/** One field as stored on a `form` document. */
export interface FormFieldValue {
	_type: string;
	_key?: string;
	name?: string;
	label?: string;
	required?: boolean;
	width?: 'full' | 'half';
	placeholder?: string;
	defaultValue?: string | boolean;
	rows?: number;
	min?: number;
	max?: number;
	options?: Array<{ label?: string; value?: string }>;
	message?: unknown;
}

/** A `form` document, as far as this plugin cares. */
export interface FormDocument {
	id: string;
	_meta?: { publishedHash?: string | null; status?: string | null };
	title?: string;
	fields?: FormFieldValue[];
	submitButtonLabel?: string;
	confirmationType?: 'message' | 'redirect';
	confirmationMessage?: unknown;
	redirectUrl?: string;
	emails?: NotificationEmailValue[];
}

export interface NotificationEmailValue {
	_type?: string;
	_key?: string;
	to?: string;
	replyTo?: string;
	subject?: string;
	message?: string;
}

/** Field kinds that collect an answer. `formMessage` is display-only. */
export function isInputField(field: FormFieldValue): boolean {
	return field._type !== 'formMessage' && typeof field.name === 'string' && field.name.length > 0;
}

/** The stored value for a select option — its `value`, or the label when blank. */
export function optionValue(option: { label?: string; value?: string }): string {
	return (option.value ?? '').trim() || (option.label ?? '').trim();
}

/**
 * Compile one authored field into a CMS `Field`.
 *
 * Returns `null` for anything that collects nothing, so the caller can filter
 * rather than branch. An unrecognised `_type` also returns `null`: a form saved
 * by a newer version of this plugin must not have an unknown field silently
 * treated as free text.
 */
function toField(field: FormFieldValue): Field | null {
	if (!isInputField(field)) return null;

	const name = field.name as string;
	const title = field.label ?? name;
	const required = field.required === true;

	switch (field._type) {
		case 'formText':
			return {
				name,
				type: 'string',
				title,
				validation: (Rule) => (required ? Rule.required() : Rule.optional())
			};

		case 'formEmail':
			return {
				name,
				type: 'string',
				title,
				// `.email()` on an optional field only judges values that are present,
				// so a blank optional email stays valid.
				validation: (Rule) => (required ? Rule.required().email() : Rule.optional().email())
			};

		case 'formTextarea':
			return {
				name,
				type: 'text',
				title,
				validation: (Rule) => (required ? Rule.required() : Rule.optional())
			};

		case 'formNumber':
			return {
				name,
				type: 'number',
				title,
				validation: (Rule) => {
					let rule = required ? Rule.required() : Rule.optional();
					if (typeof field.min === 'number') rule = rule.min(field.min);
					if (typeof field.max === 'number') rule = rule.max(field.max);
					return rule;
				}
			};

		case 'formCheckbox':
			return {
				name,
				type: 'boolean',
				title,
				/*
				 * "Required" on a checkbox means ticked, not present — it's the consent
				 * box. `Rule.required()` would accept `false`, which is exactly the case
				 * the editor is trying to prevent, so this is a custom rule instead.
				 */
				validation: (Rule) =>
					required
						? Rule.custom((value) => value === true || 'This must be ticked')
						: Rule.optional()
			};

		case 'formSelect': {
			const values = (field.options ?? []).map(optionValue).filter(Boolean);
			return {
				name,
				type: 'string',
				title,
				list: values,
				validation: (Rule) =>
					(required ? Rule.required() : Rule.optional()).custom((value) => {
						if (value === undefined || value === null || value === '') return true;
						// Never trust the posted value to be one the form offered: a select
						// is a client-side constraint, and the request isn't.
						return values.includes(String(value)) || 'Not one of the available options';
					})
			};
		}

		default:
			return null;
	}
}

/**
 * Compile a `form` document into a `FormDefinition` that `validateFormData` can
 * run. `store` and `notifyEmail` are deliberately left off — this plugin stores
 * submissions as documents and sends notifications from its own consumer, so the
 * definition is used purely as a validation contract.
 */
export function compileForm(doc: FormDocument): FormDefinition {
	const fields = (doc.fields ?? []).map(toField).filter((f): f is Field => f !== null);

	return {
		id: doc.id,
		title: doc.title ?? 'Form',
		fields,
		// Trim every string before validation. This is the transform half — the one
		// thing validation can't do — so " " fails a required check instead of
		// passing it.
		transform: (data) => {
			const out: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(data)) {
				out[key] = typeof value === 'string' ? value.trim() : value;
			}
			return out;
		}
	};
}
