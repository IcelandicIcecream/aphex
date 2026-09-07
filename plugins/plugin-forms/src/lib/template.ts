import type { FormFieldValue } from './compile';

/**
 * `{{fieldName}}` substitution for notification emails.
 *
 * Deliberately tiny and deliberately not a template engine. The strings come
 * from an editor, and the values come from the public internet; anything with
 * expressions, property access or partials in it would be a way to reach further
 * than the submission. A name is looked up in a plain map or it is left alone.
 */

/** One stored answer. */
export interface Answer {
	field: string;
	value: string;
}

/** `{{name}}` — a bare field name, nothing else. */
const TOKEN = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

/** The whole submission as `Label: value` lines, for the default `{{allFields}}`. */
export function renderAllFields(answers: Answer[], labels: Map<string, string>): string {
	return answers
		.map(({ field, value }) => `${labels.get(field) ?? field}: ${value || '—'}`)
		.join('\n');
}

/**
 * Replace `{{token}}` in an editor-authored string.
 *
 * An unknown token is left verbatim rather than blanked: a typo that renders as
 * `{{emial}}` in the email is a bug someone notices and fixes, whereas one that
 * silently renders nothing looks like the visitor left the field empty.
 */
export function renderTemplate(
	template: string,
	answers: Answer[],
	labels: Map<string, string>
): string {
	const values = new Map(answers.map((a) => [a.field, a.value]));
	const all = renderAllFields(answers, labels);

	return template.replace(TOKEN, (match, name: string) => {
		if (name === 'allFields') return all;
		const value = values.get(name);
		return value === undefined ? match : value;
	});
}

/** Field name → the label an editor gave it, for readable email output. */
export function fieldLabels(fields: FormFieldValue[]): Map<string, string> {
	const labels = new Map<string, string>();
	for (const field of fields) {
		if (typeof field.name === 'string' && field.name) {
			labels.set(field.name, field.label ?? field.name);
		}
	}
	return labels;
}

/**
 * A submitted value as a string, for storage and email.
 *
 * Everything is stored as text on purpose: a submission is a record of what was
 * sent, and it has to stay readable after the form is edited. A checkbox reads
 * "Yes"/"No" rather than "true"/"false" because the audience for a submission is
 * a person reading an inbox.
 */
export function toStoredValue(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'boolean') return value ? 'Yes' : 'No';
	return String(value);
}
