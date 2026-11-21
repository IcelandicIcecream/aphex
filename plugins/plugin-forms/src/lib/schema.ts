import type { Field, Fieldset, SchemaAccess, SchemaType, TypeReference } from '@aphexcms/cms-core';
import { effectiveOrganizationRole } from '@aphexcms/cms-core';
import {
	AlignLeft,
	CalendarDays,
	ChevronsUpDown,
	CircleDot,
	ClipboardList,
	Hash,
	Inbox,
	Mail,
	MessageSquareText,
	Phone,
	SquareCheck,
	Type
} from '@lucide/svelte';
import { withFieldKeys } from './keys';

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

/** Settings every field kind shares, first in each block. */
function baseFields(): Field[] {
	return [
		{
			name: 'label',
			type: 'string',
			title: 'Question',
			description: 'What the visitor reads above the box, e.g. "Your phone number".',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'required',
			type: 'boolean',
			title: 'Must be answered',
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

/** "More": settings most forms never touch, folded away under each field. */
const MORE: Fieldset[] = [{ name: 'more', title: 'More', options: { collapsed: true } }];

/**
 * The key an answer is stored and emailed under, last in "More". Left empty, the
 * form's save hook makes one from the question (`keys.ts`), so nobody has to
 * invent `your_phone_number` to add a question.
 */
function keyField(): Field {
	return {
		name: 'name',
		type: 'string',
		title: 'Answer key',
		fieldset: 'more',
		description:
			'What this answer is saved under, and what an email template uses ({{phone}}). Made from the question when left empty.',
		validation: (Rule) =>
			Rule.custom((value) => {
				// Empty is fine: the save fills it in.
				if (typeof value !== 'string' || !value) return true;
				return /^[a-z][a-z0-9_]*$/.test(value)
					? true
					: 'Use lowercase letters, digits and underscores, starting with a letter';
			})
	};
}

/** A field in "More". */
const more = (field: Field): Field => ({ ...field, fieldset: 'more' });

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
	const inputs = withFieldKeys(
		value.filter(
			(field): field is Record<string, unknown> =>
				!!field && typeof field === 'object' && field._type !== 'formMessage'
		) as Array<Record<string, unknown> & { name?: string; label?: string }>
	);
	if (inputs.length === 0) return 'Add at least one question';

	const names = inputs
		.map((field) => field.name)
		.filter((name): name is string => typeof name === 'string');
	if (new Set(names).size !== names.length) return 'Two questions have the same answer key';

	for (const field of inputs) {
		const label = String(field.label ?? field.name ?? 'a question');
		if (
			field._type === 'formNumber' &&
			typeof field.min === 'number' &&
			typeof field.max === 'number' &&
			field.min > field.max
		) {
			return `The lowest number can't be more than the highest for ${label}`;
		}
		if (field._type === 'formSelect' || field._type === 'formRadio') {
			const options = Array.isArray(field.options) ? field.options : [];
			const values = options.map((option) => {
				if (!option || typeof option !== 'object') return '';
				const row = option as Record<string, unknown>;
				return String(row.value ?? '').trim() || String(row.label ?? '').trim();
			});
			if (values.some((option) => !option)) return `Every choice in ${label} needs a name`;
			if (new Set(values).size !== values.length) return `${label} has the same choice twice`;
		}
	}
	return true;
}

/** The row an editor reads in the field list: the question, then its kind. */
function fieldPreview(inputType: string) {
	return {
		select: { title: 'label', required: 'required' },
		prepare: ({ title, required }: Record<string, unknown>) => ({
			title: (typeof title === 'string' && title) || inputType,
			subtitle: required === true ? `${inputType} · must be answered` : inputType
		})
	};
}

/** The choices of a "Choose one" or a dropdown. */
function optionsField(): Field {
	return {
		name: 'options',
		type: 'array',
		title: 'Choices',
		validation: (Rule) => Rule.required().min(1).max(100),
		of: [
			{
				type: 'object',
				name: 'option',
				title: 'Choice',
				fields: [
					{
						name: 'label',
						type: 'string',
						title: 'Choice',
						validation: (Rule) => Rule.required()
					},
					{
						name: 'value',
						type: 'string',
						title: 'Saved as',
						description: 'What the answer is saved as, if not the choice itself.'
					}
				],
				preview: { select: { title: 'label', subtitle: 'value' } }
			}
		]
	};
}

const placeholder = (): Field =>
	more({
		name: 'placeholder',
		type: 'string',
		title: 'Hint inside the box',
		description: 'Greyed-out example text, e.g. "07700 900123".'
	});

const textField: TypeReference = {
	type: 'formText',
	title: 'Short answer',
	icon: Type,
	fieldsets: MORE,
	fields: [
		...baseFields(),
		placeholder(),
		more({ name: 'defaultValue', type: 'string', title: 'Filled in already' }),
		keyField()
	],
	preview: fieldPreview('Short answer')
};

const textareaField: TypeReference = {
	type: 'formTextarea',
	title: 'Long answer',
	icon: AlignLeft,
	fieldsets: MORE,
	fields: [
		...baseFields(),
		placeholder(),
		more({
			name: 'rows',
			type: 'number',
			title: 'Height in lines',
			initialValue: 4,
			min: 2,
			max: 20,
			step: 1
		}),
		keyField()
	],
	preview: fieldPreview('Long answer')
};

const emailField: TypeReference = {
	type: 'formEmail',
	title: 'Email',
	icon: Mail,
	fieldsets: MORE,
	fields: [...baseFields(), placeholder(), keyField()],
	preview: fieldPreview('Email')
};

const phoneField: TypeReference = {
	type: 'formPhone',
	title: 'Phone',
	icon: Phone,
	fieldsets: MORE,
	fields: [...baseFields(), placeholder(), keyField()],
	preview: fieldPreview('Phone')
};

const dateField: TypeReference = {
	type: 'formDate',
	title: 'Date',
	icon: CalendarDays,
	fieldsets: MORE,
	fields: [
		...baseFields(),
		{
			name: 'notPast',
			type: 'boolean',
			title: 'Today or later only',
			description: 'For bookings and deliveries: a date that has passed is refused.',
			initialValue: true
		},
		keyField()
	],
	preview: fieldPreview('Date')
};

const numberField: TypeReference = {
	type: 'formNumber',
	title: 'Number',
	icon: Hash,
	fieldsets: MORE,
	fields: [
		...baseFields(),
		{ name: 'min', type: 'number', title: 'Lowest allowed' },
		{ name: 'max', type: 'number', title: 'Highest allowed' },
		keyField()
	],
	preview: fieldPreview('Number')
};

const checkboxField: TypeReference = {
	type: 'formCheckbox',
	title: 'Tick box',
	icon: SquareCheck,
	fieldsets: MORE,
	fields: [
		...baseFields(),
		more({ name: 'defaultValue', type: 'boolean', title: 'Ticked already', initialValue: false }),
		keyField()
	],
	preview: fieldPreview('Tick box')
};

const radioField: TypeReference = {
	type: 'formRadio',
	title: 'Choose one',
	icon: CircleDot,
	fieldsets: MORE,
	fields: [...baseFields(), optionsField(), keyField()],
	preview: fieldPreview('Choose one')
};

const selectField: TypeReference = {
	type: 'formSelect',
	title: 'Dropdown',
	icon: ChevronsUpDown,
	fieldsets: MORE,
	fields: [...baseFields(), optionsField(), keyField()],
	preview: fieldPreview('Dropdown')
};

/**
 * Words between the questions: a heading, an explanation, a consent notice. It
 * collects nothing, so it has no question, key or width.
 */
const messageField: TypeReference = {
	type: 'formMessage',
	title: 'Paragraph',
	icon: MessageSquareText,
	fields: [{ name: 'message', type: 'array', title: 'Text', of: [{ type: 'block' }] }],
	preview: {
		select: { heading: 'message.0.children.0.text' },
		prepare: ({ heading }) => ({
			title: (heading as string) || 'Paragraph',
			subtitle: 'Paragraph · words between questions'
		})
	}
};

/**
 * Every field kind an editor can add, in the order of the "add" menu: the ones
 * nearly every form has, then choices, then the rest.
 */
export const formFieldTypes: TypeReference[] = [
	textField,
	emailField,
	phoneField,
	textareaField,
	dateField,
	radioField,
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
		{ name: 'build', title: 'Questions', default: true },
		{ name: 'confirmation', title: 'After sending' },
		{ name: 'notifications', title: 'Emails' }
	],
	preview: { select: { title: 'title' } },
	hooks: {
		// An empty answer key becomes one made from its question, once (keys.ts).
		beforeValidate: [
			({ data }) =>
				Array.isArray(data.fields)
					? { ...data, fields: withFieldKeys(data.fields as Array<Record<string, unknown>>) }
					: data
		]
	},
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title',
			description:
				'The form’s name, and its heading on the page unless the Form block gives another.',
			group: 'build',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'fields',
			type: 'array',
			title: 'Questions',
			group: 'build',
			of: formFieldTypes,
			validation: (Rule) => Rule.required().min(1).max(50).custom(validateAuthoredFields)
		},
		{
			name: 'submitButtonLabel',
			type: 'string',
			title: 'Button',
			group: 'build',
			initialValue: 'Submit'
		},
		{
			name: 'confirmationType',
			type: 'string',
			title: 'When someone sends it',
			group: 'confirmation',
			initialValue: 'message',
			list: [
				{ title: 'Say thank you', value: 'message' },
				{ title: 'Go to another page', value: 'redirect' }
			],
			options: { layout: 'tabs' }
		},
		{
			name: 'confirmationMessage',
			type: 'array',
			title: 'Thank-you message',
			group: 'confirmation',
			of: [{ type: 'block' }],
			hidden: ({ siblingData }) => siblingData.confirmationType !== 'message',
			validation: (Rule) =>
				Rule.custom((value, context) =>
					context?.document?.confirmationType === 'message' &&
					(!Array.isArray(value) || value.length === 0)
						? 'Write the thank-you message, or choose another page instead'
						: true
				)
		},
		{
			name: 'redirectUrl',
			type: 'string',
			title: 'Page to go to',
			description: 'A page of your site (/thanks) or a full web address (https://…).',
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
					if (!url) return redirects ? 'Say which page to go to' : true;
					if (/^https?:\/\//.test(url) || url.startsWith('/')) return true;
					return 'Use a site path (/thanks) or an absolute URL (https://…)';
				})
		},
		{
			name: 'emails',
			type: 'array',
			title: 'Emails about new messages',
			description:
				'Who hears about each message. {{allFields}} puts in every answer; {{phone}} puts in one, by its answer key.',
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
