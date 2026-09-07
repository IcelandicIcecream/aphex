import type { Field, SchemaAccess, SchemaType, TypeReference } from '@aphexcms/cms-core';
import { effectiveOrganizationRole } from '@aphexcms/cms-core';
import {
	AlignLeft,
	ClipboardList,
	Hash,
	Inbox,
	List,
	Mail,
	MessageSquareText,
	SquareCheck,
	Type
} from '@lucide/svelte';

/**
 * The two collections this plugin contributes: `form` (what an editor composes)
 * and `formSubmission` (what a visitor sent).
 *
 * ## Why a field is a block, not a row of settings
 *
 * A form field is a tagged union — a select has options, a number has a range, a
 * message has no input at all — and the page builder's array-of-blocks is exactly
 * that shape. Modelling it as one flat object with every possible setting on it
 * would show an editor a "minimum value" control while they configure a checkbox.
 * Each field kind is its own type, so each one shows only what applies.
 *
 * ## Reserved names
 *
 * Nothing here declares a field called `type`, `status` or `publishedAt`: those
 * are document columns, and the schema validator rejects a shadowing field at
 * startup — including inside nested objects. The discriminator an editor picks
 * from is the block's own `_type`, which the array field manages, so there is
 * nothing to declare.
 */

/** Settings every field kind shares, spread into each block. */
function baseFields(): Field[] {
	return [
		{
			name: 'name',
			type: 'string',
			title: 'Name',
			description:
				'The key this answer is stored and emailed under. Lowercase, no spaces — e.g. `email`, `company`.',
			validation: (Rule) =>
				Rule.required().custom((value) => {
					if (typeof value !== 'string') return true;
					return /^[a-z][a-z0-9_]*$/.test(value)
						? true
						: 'Use lowercase letters, digits and underscores, starting with a letter';
				})
		},
		{
			name: 'label',
			type: 'string',
			title: 'Label',
			description: 'What the visitor reads above the input.',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'required',
			type: 'boolean',
			title: 'Required',
			initialValue: false
		},
		{
			name: 'width',
			type: 'string',
			title: 'Width',
			initialValue: 'full',
			list: [
				{ title: 'Full width', value: 'full' },
				{ title: 'Half', value: 'half' }
			],
			options: { layout: 'tabs' }
		}
	];
}

function validEmailList(value: unknown, multiple: boolean): true | string {
	if (typeof value !== 'string' || !value.trim()) return true;
	if (value.includes('{{') || value.includes('}}'))
		return 'Recipient addresses cannot use templates';
	const addresses = multiple ? value.split(',') : [value];
	return addresses.every((address) => /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(address.trim()))
		? true
		: multiple
			? 'Enter valid email addresses separated by commas'
			: 'Enter a valid email address';
}

function validateAuthoredFields(value: unknown): true | string {
	if (!Array.isArray(value)) return true;
	const inputs = value.filter(
		(field): field is Record<string, unknown> =>
			!!field && typeof field === 'object' && field._type !== 'formMessage'
	);
	if (inputs.length === 0) return 'Add at least one input field';

	const names = inputs
		.map((field) => field.name)
		.filter((name): name is string => typeof name === 'string');
	if (new Set(names).size !== names.length) return 'Every input must have a unique name';

	for (const field of inputs) {
		if (
			field._type === 'formNumber' &&
			typeof field.min === 'number' &&
			typeof field.max === 'number' &&
			field.min > field.max
		) {
			return `Minimum cannot exceed maximum for ${String(field.label ?? field.name ?? 'number field')}`;
		}
		if (field._type === 'formSelect') {
			const options = Array.isArray(field.options) ? field.options : [];
			const values = options.map((option) => {
				if (!option || typeof option !== 'object') return '';
				const row = option as Record<string, unknown>;
				return String(row.value ?? '').trim() || String(row.label ?? '').trim();
			});
			if (values.some((option) => !option)) return 'Every select option must have a label or value';
			if (new Set(values).size !== values.length) return 'Select option values must be unique';
		}
	}
	return true;
}

/** The row label an editor reads in the collapsed field list. */
function fieldPreview(inputType: string) {
	return {
		select: { title: 'label', name: 'name' },
		prepare: ({ title, name }: Record<string, unknown>) => ({
			title: (typeof title === 'string' && title) || inputType,
			subtitle: typeof name === 'string' && name ? `${inputType} · ${name}` : inputType
		})
	};
}

const textField: TypeReference = {
	type: 'formText',
	title: 'Text',
	icon: Type,
	fields: [
		...baseFields(),
		{ name: 'placeholder', type: 'string', title: 'Placeholder' },
		{ name: 'defaultValue', type: 'string', title: 'Default value' }
	],
	preview: fieldPreview('Text')
};

const textareaField: TypeReference = {
	type: 'formTextarea',
	title: 'Long text',
	icon: AlignLeft,
	fields: [
		...baseFields(),
		{ name: 'placeholder', type: 'string', title: 'Placeholder' },
		{ name: 'rows', type: 'number', title: 'Rows', initialValue: 4, min: 2, max: 20, step: 1 }
	],
	preview: fieldPreview('Long text')
};

const emailField: TypeReference = {
	type: 'formEmail',
	title: 'Email',
	icon: Mail,
	fields: [...baseFields(), { name: 'placeholder', type: 'string', title: 'Placeholder' }],
	preview: fieldPreview('Email')
};

const numberField: TypeReference = {
	type: 'formNumber',
	title: 'Number',
	icon: Hash,
	fields: [
		...baseFields(),
		{ name: 'min', type: 'number', title: 'Minimum' },
		{ name: 'max', type: 'number', title: 'Maximum' }
	],
	preview: fieldPreview('Number')
};

const checkboxField: TypeReference = {
	type: 'formCheckbox',
	title: 'Checkbox',
	icon: SquareCheck,
	fields: [
		...baseFields(),
		{ name: 'defaultValue', type: 'boolean', title: 'Ticked by default', initialValue: false }
	],
	preview: fieldPreview('Checkbox')
};

const selectField: TypeReference = {
	type: 'formSelect',
	title: 'Select',
	icon: List,
	fields: [
		...baseFields(),
		{
			name: 'options',
			type: 'array',
			title: 'Options',
			validation: (Rule) => Rule.required().min(1).max(100),
			of: [
				{
					type: 'object',
					name: 'option',
					title: 'Option',
					fields: [
						{
							name: 'label',
							type: 'string',
							title: 'Label',
							validation: (Rule) => Rule.required()
						},
						{
							name: 'value',
							type: 'string',
							title: 'Value',
							description: 'What gets stored. Defaults to the label if left blank.'
						}
					],
					preview: { select: { title: 'label', subtitle: 'value' } }
				}
			]
		}
	],
	preview: fieldPreview('Select')
};

/**
 * A block of text between inputs — a section heading, an explanation, a consent
 * notice. It has no `name` and collects nothing, so it deliberately doesn't
 * spread `baseFields()`.
 */
const messageField: TypeReference = {
	type: 'formMessage',
	title: 'Message',
	icon: MessageSquareText,
	fields: [{ name: 'message', type: 'array', title: 'Message', of: [{ type: 'block' }] }],
	preview: {
		select: { heading: 'message.0.children.0.text' },
		prepare: ({ heading }) => ({
			title: (heading as string) || 'Message',
			subtitle: 'Message · display text'
		})
	}
};

/** Every field kind an editor can add, in the order they appear in the "add" menu. */
export const formFieldTypes: TypeReference[] = [
	textField,
	emailField,
	textareaField,
	selectField,
	checkboxField,
	numberField,
	messageField
];

/** Field kinds that actually collect an answer — everything except `formMessage`. */
export const INPUT_FIELD_TYPES = formFieldTypes
	.map((f) => f.type)
	.filter((type) => type !== 'formMessage');

export const formSchema: SchemaType = {
	type: 'document',
	name: 'form',
	title: 'Form',
	description: 'A form an editor composes, embedded on a page by the Form block',
	icon: ClipboardList,
	groups: [
		{ name: 'build', title: 'Build', default: true },
		{ name: 'confirmation', title: 'Confirmation' },
		{ name: 'notifications', title: 'Notifications' }
	],
	preview: { select: { title: 'title' } },
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title',
			description: 'Internal name, and the default heading where the form is embedded.',
			group: 'build',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'fields',
			type: 'array',
			title: 'Fields',
			group: 'build',
			of: formFieldTypes,
			validation: (Rule) => Rule.required().min(1).max(50).custom(validateAuthoredFields)
		},
		{
			name: 'submitButtonLabel',
			type: 'string',
			title: 'Submit button label',
			group: 'build',
			initialValue: 'Submit'
		},
		{
			name: 'confirmationType',
			type: 'string',
			title: 'On submit',
			group: 'confirmation',
			initialValue: 'message',
			list: [
				{ title: 'Show a message', value: 'message' },
				{ title: 'Redirect', value: 'redirect' }
			],
			options: { layout: 'tabs' }
		},
		{
			name: 'confirmationMessage',
			type: 'array',
			title: 'Confirmation message',
			group: 'confirmation',
			of: [{ type: 'block' }],
			hidden: ({ siblingData }) => siblingData.confirmationType !== 'message',
			validation: (Rule) =>
				Rule.custom((value, context) =>
					context?.document?.confirmationType === 'message' &&
					(!Array.isArray(value) || value.length === 0)
						? 'Required when the form shows a confirmation message'
						: true
				)
		},
		{
			name: 'redirectUrl',
			type: 'string',
			title: 'Redirect to',
			description: 'A site path (/thanks) or an absolute URL.',
			group: 'confirmation',
			hidden: ({ siblingData }) => siblingData.confirmationType !== 'redirect',
			/*
			 * `hidden` takes the field off screen for the other branch; validation
			 * still has to enforce it, because hiding is an authoring affordance and
			 * the API is reachable without the UI.
			 *
			 * Cross-field invariants belong in validation rather than a hook — a hook
			 * transforms, validation judges. `context.document` is the whole document,
			 * which is what makes "required, but only for this branch" expressible.
			 */
			validation: (Rule) =>
				Rule.custom((value, context) => {
					const url = typeof value === 'string' ? value.trim() : '';
					const redirects = context?.document?.confirmationType === 'redirect';
					if (!url) return redirects ? 'Required when the form redirects on submit' : true;
					if (/^https?:\/\//.test(url) || url.startsWith('/')) return true;
					return 'Use a site path (/thanks) or an absolute URL (https://…)';
				})
		},
		{
			name: 'emails',
			type: 'array',
			title: 'Notification emails',
			description:
				'Sent after a submission is stored. Reference an answer with {{fieldName}}; {{allFields}} expands to the whole submission.',
			group: 'notifications',
			validation: (Rule) => Rule.max(20),
			of: [
				{
					type: 'object',
					name: 'notification',
					title: 'Email',
					fields: [
						{
							name: 'to',
							type: 'string',
							title: 'To',
							description: 'Comma-separated for several recipients.',
							validation: (Rule) => Rule.required().custom((value) => validEmailList(value, true))
						},
						{
							name: 'replyTo',
							type: 'string',
							title: 'Reply to',
							validation: (Rule) => Rule.custom((value) => validEmailList(value, false))
						},
						{
							name: 'subject',
							type: 'string',
							title: 'Subject',
							initialValue: 'New form submission',
							validation: (Rule) => Rule.required()
						},
						{
							name: 'message',
							type: 'text',
							title: 'Message',
							rows: 6,
							initialValue: '{{allFields}}',
							validation: (Rule) => Rule.required()
						}
					],
					preview: { select: { title: 'to', subtitle: 'subject' } }
				}
			]
		}
	]
};

/**
 * A stored submission.
 *
 * Answers live in one `submissionData` array of `{ field, value }` rather than as
 * named columns, because the shape is per-form and changes whenever an editor
 * edits the form. Storing them positionally keeps old submissions readable after
 * a field is renamed or removed — the record is what was actually sent.
 *
 * Written only by this plugin's endpoint, under a system context. Nothing in the
 * admin should edit one: a submission is a record of an event, and an editable
 * record of an event is not a record.
 */
/**
 * No role may write these fields: the UI renders them read-only and the API drops
 * writes at the boundary. Note that built-in `super_admin`/`admin` bypass field
 * access by design, so this discourages rather than forbids — the endpoint remains
 * the only thing that writes submissions in practice.
 */
const NO_WRITES = { update: [] as string[] };

/**
 * Submissions can contain personal data, so the general document capabilities
 * are too broad. The submit route writes with system access; humans may only
 * read or erase submissions when their organization role explicitly allows it.
 */
export const defaultSubmissionAccess: SchemaAccess = {
	read: ({ auth }) => ['owner', 'admin'].includes(effectiveOrganizationRole(auth) ?? ''),
	create: () => false,
	update: () => false,
	delete: ({ auth }) => ['owner', 'admin'].includes(effectiveOrganizationRole(auth) ?? ''),
	publish: () => false,
	unpublish: () => false
};

export const formSubmissionSchema: SchemaType = {
	type: 'document',
	name: 'formSubmission',
	title: 'Form submission',
	description: 'A submitted form. Read-only — written by the public submit endpoint.',
	icon: Inbox,
	access: defaultSubmissionAccess,
	preview: {
		select: { title: 'summary', subtitle: 'submittedAt' }
	},
	fields: [
		{
			name: 'form',
			type: 'reference',
			title: 'Form',
			to: [{ type: 'form' }],
			access: NO_WRITES
		},
		{
			// Denormalized one-line description, stamped at submit time so the list
			// view is readable without loading every submission's answers.
			name: 'summary',
			type: 'string',
			title: 'Summary',
			access: NO_WRITES
		},
		{
			name: 'submittedAt',
			type: 'datetime',
			title: 'Submitted at',
			access: NO_WRITES
		},
		{
			name: 'submissionData',
			type: 'array',
			title: 'Answers',
			access: NO_WRITES,
			of: [
				{
					type: 'object',
					name: 'answer',
					title: 'Answer',
					fields: [
						{ name: 'field', type: 'string', title: 'Field' },
						{ name: 'value', type: 'text', title: 'Value', rows: 2 }
					],
					preview: { select: { title: 'field', subtitle: 'value' } }
				}
			]
		},
		{
			name: 'notificationEmails',
			type: 'array',
			title: 'Notification snapshot',
			access: NO_WRITES,
			of: [
				{
					type: 'object',
					name: 'submissionNotification',
					fields: [
						{ name: 'to', type: 'string', title: 'To' },
						{ name: 'replyTo', type: 'string', title: 'Reply to' },
						{ name: 'subject', type: 'string', title: 'Subject' },
						{ name: 'message', type: 'text', title: 'Message' }
					]
				}
			]
		},
		{
			name: 'notificationFieldLabels',
			type: 'array',
			title: 'Field label snapshot',
			access: NO_WRITES,
			of: [
				{
					type: 'object',
					name: 'submissionFieldLabel',
					fields: [
						{ name: 'field', type: 'string', title: 'Field' },
						{ name: 'label', type: 'string', title: 'Label' }
					]
				}
			]
		}
	]
};
