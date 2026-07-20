// A developer-owned form, authored in code. `defineForm` captures the field literals so
// `InferForm<typeof contactForm>` gives the submission shape with no codegen. The fields are
// ordinary CMS fields, so validation (required, email) is the same engine the admin uses.
import { defineForm, type InferForm } from '@aphexcms/cms-core';

export const contactForm = defineForm({
	id: 'contact',
	title: 'Contact us',
	successMessage: "Thanks — we'll be in touch.",
	// Where a "new submission" email lands. In dev, Mailpit (localhost:8025) catches it regardless
	// of the address; in prod this is the real inbox. Different forms can route to different teams.
	notifyEmail: 'team@example.com',
	// Normalize raw input before validation: trim everything, lowercase the email so "Ben@X.com "
	// and "ben@x.com" store identically. The one thing validation can't do (it judges, never mutates).
	transform: (data) => ({
		...data,
		name: typeof data.name === 'string' ? data.name.trim() : data.name,
		email: typeof data.email === 'string' ? data.email.trim().toLowerCase() : data.email,
		subject: typeof data.subject === 'string' ? data.subject.trim() : data.subject,
		message: typeof data.message === 'string' ? data.message.trim() : data.message
	}),
	fields: [
		{ name: 'name', type: 'string', title: 'Name', validation: (R) => R.required().max(120) },
		{ name: 'email', type: 'string', title: 'Email', validation: (R) => R.required().email() },
		{ name: 'subject', type: 'string', title: 'Subject', validation: (R) => R.max(150) },
		{ name: 'message', type: 'text', title: 'Message', validation: (R) => R.required().max(4000) }
	]
});

/** The typed submission shape — `{ name?: string; email?: string; message?: string }`. */
export type ContactSubmission = InferForm<typeof contactForm>;

/** Tiny in-memory registry for Slice 0. Look a form up by its public id. */
export const forms = [contactForm];
export const getForm = (id: string) => forms.find((f) => f.id === id);
