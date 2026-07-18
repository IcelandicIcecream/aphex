import { defineType } from '@aphexcms/cms-core';
import { Mail } from '@lucide/svelte';

/**
 * Contact form submissions.
 *
 * A form in Aphex is just a collection: a frontend contact form POSTs to a
 * route that calls the Local API `create()` for this schema, and every entry
 * shows up in the admin like any other document.
 *
 * Authored with `defineType`, so the `beforeValidate` hooks get a `data` typed
 * straight from the `fields` below — no generated types, no casts. Each value is
 * `T | undefined` (a write may carry only a subset), hence the `?.` access.
 *
 * Responsibilities stay split:
 *  - `hooks.beforeValidate` TRANSFORMS — trims/normalizes input, stamps the time.
 *  - `validation: (Rule) => ...` REJECTS — required fields, email format, length.
 *  - Anything reactive (emailing the submission) belongs in an event consumer.
 */
export default defineType({
	type: 'document',
	name: 'contactSubmission',
	title: 'Contact Submission',
	description: 'Messages sent through the site contact form',
	icon: Mail,
	preview: {
		select: {
			title: 'name',
			subtitle: 'email'
		}
	},
	fields: [
		{
			name: 'name',
			type: 'string',
			title: 'Name',
			validation: (Rule) => Rule.required().max(100)
		},
		{
			name: 'email',
			type: 'string',
			title: 'Email',
			validation: (Rule) => Rule.required().email()
		},
		{
			name: 'subject',
			type: 'string',
			title: 'Subject',
			validation: (Rule) => Rule.max(150)
		},
		{
			name: 'message',
			type: 'text',
			title: 'Message',
			validation: (Rule) => Rule.required().max(2000)
		},
		{
			name: 'submittedAt',
			type: 'datetime',
			title: 'Submitted At',
			description: 'Set automatically by the beforeValidate hook on submit'
		}
	],
	hooks: {
		beforeValidate: [
			// `data.name` / `data.email` / `data.subject` are `string | undefined`,
			// inferred from the fields — no type guards, no codegen.
			({ data }) => ({
				...data,
				name: data.name?.trim(),
				email: data.email?.trim().toLowerCase(),
				subject: data.subject?.trim()
			}),
			// Stamp the submission time once, on create.
			({ data, operation }) =>
				operation === 'create' && !data.submittedAt
					? { ...data, submittedAt: new Date().toISOString() }
					: data
		]
	}
});
