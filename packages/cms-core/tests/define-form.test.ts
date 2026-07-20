/**
 * defineForm + validateFormData — the developer-owned forms core. `defineForm` is a typed
 * pass-through (inference is a compile-time concern, asserted via `expectTypeOf`), and
 * `validateFormData` must reuse the CMS field validator so a form's `Rule`s judge submissions
 * exactly as the admin judges document data.
 *
 * Run: pnpm -F @aphexcms/cms-core test
 */
import { describe, it, expect, expectTypeOf } from 'vitest';
import { defineForm, validateFormData, type InferForm } from '../src/lib/forms/index';

const contactForm = defineForm({
	id: 'contact',
	title: 'Contact us',
	fields: [
		{ name: 'name', type: 'string', title: 'Name', validation: (R) => R.required() },
		{ name: 'email', type: 'string', title: 'Email', validation: (R) => R.required().email() },
		{ name: 'message', type: 'text', title: 'Message', validation: (R) => R.required() }
	]
} as const);

describe('defineForm', () => {
	it('returns the definition unchanged (typed pass-through)', () => {
		expect(contactForm.id).toBe('contact');
		expect(contactForm.fields).toHaveLength(3);
	});

	it('infers the submission shape from the fields', () => {
		type Submission = InferForm<typeof contactForm>;
		expectTypeOf<Submission>().toMatchTypeOf<{
			name?: string;
			email?: string;
			message?: string;
		}>();
	});
});

describe('validateFormData', () => {
	it('accepts a valid submission', async () => {
		const result = await validateFormData(contactForm, {
			name: 'Ada',
			email: 'ada@example.com',
			message: 'Hello there'
		});
		expect(result.isValid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('rejects a missing required field', async () => {
		const result = await validateFormData(contactForm, {
			name: 'Ada',
			email: 'ada@example.com'
			// message omitted
		});
		expect(result.isValid).toBe(false);
		expect(result.errors.map((e) => e.field)).toContain('message');
	});

	it('rejects a malformed email via the field Rule', async () => {
		const result = await validateFormData(contactForm, {
			name: 'Ada',
			email: 'not-an-email',
			message: 'Hi'
		});
		expect(result.isValid).toBe(false);
		expect(result.errors.map((e) => e.field)).toContain('email');
	});
});
