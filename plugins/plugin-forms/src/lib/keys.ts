/**
 * The key a form field's answer is stored and emailed under (`name`), made from its
 * label when the editor left it empty: "Your phone number" -> `your_phone_number`.
 *
 * An editor shouldn't have to invent a lowercase identifier to add a question, so
 * the form schema's save hook fills empty names in with these, once: a stored key
 * stays put when the label is reworded later, so earlier submissions and email
 * templates (`{{your_phone_number}}`) keep matching. The site's renderer calls the
 * same function for a form it previews before that save, so both agree.
 *
 * Browser-safe: no runtime imports.
 */

interface KeyedField {
	_type?: string;
	_key?: string;
	name?: string;
	label?: string;
}

/** `Your phone number!` -> `your_phone_number`; null when there's nothing to make one from. */
export function keyFromLabel(label: string | undefined): string | null {
	const key = (label ?? '')
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 40)
		.replace(/_+$/, '');
	if (!key) return null;
	return /^[a-z]/.test(key) ? key : `field_${key}`;
}

/**
 * `fields` with every input's `name` filled in: its own when set, else one made
 * from its label, numbered (`name_2`) where that's taken. Display-only fields
 * (`formMessage`) and fields with neither are left as they are.
 */
export function withFieldKeys<T extends KeyedField>(fields: readonly T[] | undefined): T[] {
	if (!Array.isArray(fields)) return [];
	const taken = new Set(
		fields.map((field) => field?.name?.trim()).filter((name): name is string => !!name)
	);
	return fields.map((field) => {
		if (!field || field._type === 'formMessage' || field.name?.trim()) return field;
		const base = keyFromLabel(field.label);
		if (!base) return field;
		let name = base;
		for (let n = 2; taken.has(name); n++) name = `${base}_${n}`;
		taken.add(name);
		return { ...field, name };
	});
}
