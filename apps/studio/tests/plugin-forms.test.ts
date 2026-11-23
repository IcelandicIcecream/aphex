import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { validateDocumentData } from '@aphexcms/cms-core';
import type { AphexEnv } from '@aphexcms/cms-core/server';
import { formSchema, formSubmissionSchema } from '../../../plugins/plugin-forms/src/lib/schema';
import { formsPlugin } from '../../../plugins/plugin-forms/src/lib/index';
import { handleSubmit } from '../../../plugins/plugin-forms/src/lib/submit';
import {
	confirmSubmission,
	notifyOnSubmission
} from '../../../plugins/plugin-forms/src/lib/notify';
import { fromHeader, type FormSiteResolver } from '../../../plugins/plugin-forms/src/lib/sender';
import { compileForm } from '../../../plugins/plugin-forms/src/lib/compile';
import { keyFromLabel, withFieldKeys } from '../../../plugins/plugin-forms/src/lib/keys';
import { validateFormData } from '@aphexcms/cms-core';

const formId = '20000000-0000-4000-8000-000000000002';
const organizationId = 'org-second';

function formDocument(version = 'published-hash') {
	return {
		id: formId,
		_meta: { publishedHash: version, status: 'published' },
		title: 'Contact',
		fields: [{ _type: 'formEmail', name: 'email', label: 'Email', required: true }],
		confirmationType: 'message' as const,
		emails: [{ to: 'owner@example.com', subject: 'New submission', message: '{{allFields}}' }]
	};
}

function submissionApp(
	options: { version?: string; form?: Record<string, unknown>; site?: FormSiteResolver } = {}
) {
	const create = vi.fn().mockResolvedValue({ document: { id: 'unused' } });
	const resolvePublishedDocumentOrganizationId = vi.fn().mockResolvedValue(organizationId);
	const findAllOrganizations = vi.fn(() => {
		throw new Error('public form routing must not scan organizations');
	});
	const cms = {
		databaseAdapter: { resolvePublishedDocumentOrganizationId, findAllOrganizations },
		localAPI: {
			// No limit set: the visitor's message may be stored.
			checkDocumentLimit: vi.fn().mockResolvedValue(undefined),
			getCollection: (name: string) =>
				name === 'form'
					? {
							findByID: vi
								.fn()
								.mockResolvedValue({ ...formDocument(options.version), ...options.form })
						}
					: name === 'formSubmission'
						? { create }
						: undefined
		},
		logger: { error: vi.fn() }
	};
	const app = new Hono<AphexEnv>();
	app.use('*', async (c, next) => {
		c.set('aphexCMS', c.env.aphexCMS);
		c.set('auth', null);
		c.set('tenant', c.env.tenant ?? null);
		await next();
	});
	app.post('/api/form-submissions', (c) => handleSubmit(c, options.site));
	return { app, cms, create, resolvePublishedDocumentOrganizationId };
}

function request(body: unknown, forwardedFor = '203.0.113.1') {
	return new Request('http://localhost/api/form-submissions', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-forwarded-for': forwardedFor },
		body: JSON.stringify(body)
	});
}

describe('public form submissions', () => {
	it('resolves the exact owner and atomically appends the submission event', async () => {
		const { app, cms, create, resolvePublishedDocumentOrganizationId } = submissionApp();
		const response = await app.fetch(
			request({ form: formId, version: 'published-hash', data: { email: 'person@example.com' } }),
			{ aphexCMS: cms, auth: null, clientAddress: '198.51.100.20' } as never
		);

		expect(response.status).toBe(200);
		expect(resolvePublishedDocumentOrganizationId).toHaveBeenCalledWith(formId, 'form');
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ organizationId }),
			expect.objectContaining({ form: { _ref: formId, _type: 'reference' } }),
			expect.objectContaining({
				id: expect.any(String),
				skipVersioning: true,
				outboxEvents: [
					expect.objectContaining({
						type: 'forms.submission.created',
						payload: expect.objectContaining({ formId, submissionId: expect.any(String) })
					})
				]
			})
		);
		const stored = create.mock.calls[0]?.[1];
		expect(stored.notificationEmails).toEqual([
			expect.objectContaining({ to: 'owner@example.com' })
		]);
	});

	it('rejects a stale published form version before storing', async () => {
		const { app, cms, create } = submissionApp({ version: 'new-hash' });
		const response = await app.fetch(
			request({ form: formId, version: 'old-hash', data: { email: 'person@example.com' } }),
			{ aphexCMS: cms, auth: null, clientAddress: '198.51.100.21' } as never
		);

		expect(response.status).toBe(409);
		expect(create).not.toHaveBeenCalled();
	});

	it('rejects a form unpublished after tenant resolution', async () => {
		const { app, cms, create } = submissionApp();
		cms.localAPI.getCollection = (name: string) =>
			name === 'form'
				? {
						findByID: vi.fn().mockResolvedValue({
							...formDocument(),
							_meta: { status: 'unpublished', publishedHash: 'published-hash' }
						})
					}
				: name === 'formSubmission'
					? { create }
					: undefined;
		const response = await app.fetch(
			request({ form: formId, version: 'published-hash', data: { email: 'person@example.com' } }),
			{ aphexCMS: cms, auth: null, clientAddress: '198.51.100.24' } as never
		);

		expect(response.status).toBe(404);
		expect(create).not.toHaveBeenCalled();
	});

	it('ignores spoofed proxy headers when rate limiting', async () => {
		const { app, cms } = submissionApp();
		const statuses: number[] = [];
		for (let i = 0; i < 11; i += 1) {
			const response = await app.fetch(
				request(
					{ form: formId, version: 'published-hash', data: { email: 'person@example.com' } },
					`203.0.113.${i}`
				),
				{ aphexCMS: cms, auth: null, clientAddress: '198.51.100.22' } as never
			);
			statuses.push(response.status);
		}
		expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
		expect(statuses[10]).toBe(429);
	});

	it("refuses another tenant's form on a tenant's address", async () => {
		const { app, cms, create } = submissionApp();
		const response = await app.fetch(
			request({ form: formId, version: 'published-hash', data: { email: 'person@example.com' } }),
			{
				aphexCMS: cms,
				auth: null,
				tenant: { id: 'org-first', slug: 'first' },
				clientAddress: '198.51.100.25'
			} as never
		);

		expect(response.status).toBe(404);
		expect(create).not.toHaveBeenCalled();
	});

	it("accepts the tenant's own form on its address", async () => {
		const { app, cms, create } = submissionApp();
		const response = await app.fetch(
			request({ form: formId, version: 'published-hash', data: { email: 'person@example.com' } }),
			{
				aphexCMS: cms,
				auth: null,
				tenant: { id: organizationId, slug: 'second' },
				clientAddress: '198.51.100.26'
			} as never
		);

		expect(response.status).toBe(200);
		expect(create).toHaveBeenCalledOnce();
	});

	it('rejects an oversized body before tenant resolution', async () => {
		const { app, cms, resolvePublishedDocumentOrganizationId } = submissionApp();
		const response = await app.fetch(
			request({
				form: formId,
				version: 'published-hash',
				data: { email: `${'a'.repeat(70_000)}@example.com` }
			}),
			{ aphexCMS: cms, auth: null, clientAddress: '198.51.100.23' } as never
		);

		expect(response.status).toBe(400);
		expect(resolvePublishedDocumentOrganizationId).not.toHaveBeenCalled();
	});
});

describe('authored form invariants', () => {
	async function errors(fields: unknown[], emails: unknown[] = []) {
		const result = await validateDocumentData(formSchema, {
			title: 'Contact',
			fields,
			emails
		});
		return result.errors.flatMap((entry) => entry.errors);
	}

	it('rejects duplicate input names', async () => {
		const messages = await errors([
			{ _type: 'formText', name: 'answer', label: 'First' },
			{ _type: 'formText', name: 'answer', label: 'Second' }
		]);
		expect(messages).toContain('Two questions have the same answer key');
	});

	it('rejects inverted number ranges', async () => {
		const messages = await errors([
			{ _type: 'formNumber', name: 'age', label: 'Age', min: 10, max: 5 }
		]);
		expect(messages).toContain("The lowest number can't be more than the highest for Age");
	});

	it('rejects duplicate effective select values', async () => {
		const messages = await errors([
			{
				_type: 'formSelect',
				name: 'choice',
				label: 'Choice',
				options: [
					{ _type: 'option', _key: '1', label: 'One', value: 'same' },
					{ _type: 'option', _key: '2', label: 'Two', value: 'same' }
				]
			}
		]);
		expect(messages).toContain('Choice has the same choice twice');
	});

	it('rejects templated notification recipients', async () => {
		const messages = await errors(
			[{ _type: 'formText', name: 'answer', label: 'Answer' }],
			[
				{
					_type: 'notification',
					_key: 'email',
					to: '{{email}}',
					subject: 'New submission',
					message: '{{allFields}}'
				}
			]
		);
		expect(
			messages.some((message) => message.includes('Recipient addresses cannot use templates'))
		).toBe(true);
	});
});

describe('submission access', () => {
	const apiKey = { type: 'api_key', keyId: 'key', permissions: ['read', 'write'] } as never;
	const owner = {
		type: 'session',
		user: { id: 'owner', role: 'user' },
		organizationRole: 'owner'
	} as never;

	it('denies API keys even when their coarse capabilities allow document access', () => {
		const read = formSubmissionSchema.access?.read;
		const create = formSubmissionSchema.access?.create;
		expect(typeof read).toBe('function');
		expect(typeof create).toBe('function');
		expect((read as Function)({ auth: apiKey })).toBe(false);
		expect((create as Function)({ auth: apiKey })).toBe(false);
		expect((read as Function)({ auth: owner })).toBe(true);
	});

	it('keeps role-list overrides strict instead of falling through for API keys', () => {
		const plugin = formsPlugin({ submissionAccess: { read: ['forms-reviewer'] } });
		const schemaPart = plugin.parts.find((part) => part.implements === 'aphex/schema');
		const submission = schemaPart?.schemas?.find((schema) => schema.name === 'formSubmission');
		const read = submission?.access?.read;
		expect(typeof read).toBe('function');
		expect((read as Function)({ auth: apiKey })).toBe(false);
	});
});

describe('form notifications', () => {
	const event = {
		organizationId,
		payload: { submissionId: 'submission-id', formId }
	};
	const databaseAdapter = {
		findByDocIdAdvanced: vi.fn().mockResolvedValue({
			draftData: {
				submissionData: [],
				notificationEmails: [{ to: 'owner@example.com', subject: 'New', message: 'Body' }],
				notificationFieldLabels: []
			}
		})
	};

	it('throws when an email adapter reports failure so the job retries', async () => {
		const handler = notifyOnSubmission('forms@example.com');
		await expect(
			handler({
				event,
				databaseAdapter,
				emailAdapter: {
					name: 'test',
					send: vi.fn().mockResolvedValue({ id: '', error: 'mailbox unavailable' })
				},
				logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() }
			} as never)
		).rejects.toThrow('mailbox unavailable');
	});
});

describe('who form emails are from and to', () => {
	const site: FormSiteResolver = () => ({ name: 'Lily’s Bakery', email: 'hello@lilys.example' });
	let address = 30;
	/** Submit once (each from its own address, past the rate limit) and return what was stored. */
	async function submit(
		options: Parameters<typeof submissionApp>[0],
		data = { email: 'visitor@example.com' }
	) {
		const { app, cms, create } = submissionApp(options);
		address += 1;
		const response = await app.fetch(request({ form: formId, version: 'published-hash', data }), {
			aphexCMS: cms,
			auth: null,
			clientAddress: `198.51.100.${address}`
		} as never);
		expect(response.status).toBe(200);
		return create.mock.calls[0]?.[1];
	}

	it('sends replies to the visitor unless the form names someone', async () => {
		expect((await submit({})).notificationEmails[0].replyTo).toBe('visitor@example.com');
		const named = await submit({
			form: {
				emails: [
					{ to: 'owner@example.com', replyTo: 'desk@example.com', subject: 'S', message: 'M' }
				]
			}
		});
		expect(named.notificationEmails[0].replyTo).toBe('desk@example.com');
	});

	it('sends a form that names nobody to the site’s own address, and nowhere without one', async () => {
		const stored = await submit({ form: { emails: [] }, site });
		expect(stored.notificationEmails).toEqual([
			expect.objectContaining({
				to: 'hello@lilys.example',
				replyTo: 'visitor@example.com',
				subject: 'New message: Contact'
			})
		]);
		expect((await submit({ form: { emails: [] } })).notificationEmails).toEqual([]);
	});

	it('keeps the site’s name, and the visitor’s confirmation with replies going to the site', async () => {
		const stored = await submit({
			form: {
				confirmationEmail: {
					enabled: true,
					subject: 'Got it',
					message: 'Thanks, we’ll be in touch.'
				}
			},
			site
		});
		expect(stored.senderName).toBe('Lily’s Bakery');
		expect(stored.confirmationEmail).toEqual({
			to: 'visitor@example.com',
			replyTo: 'hello@lilys.example',
			subject: 'Got it',
			message: 'Thanks, we’ll be in touch.'
		});
	});

	it('sends no confirmation when it is off, or carries an answer', async () => {
		const off = await submit({
			form: { confirmationEmail: { enabled: false, subject: 'S', message: 'M' } }
		});
		expect(off.confirmationEmail).toBeUndefined();
		const templated = await submit({
			form: { confirmationEmail: { enabled: true, subject: 'Hi', message: 'You said {{message}}' } }
		});
		expect(templated.confirmationEmail).toBeUndefined();
	});

	it('still stores the message when the site’s details can’t be read', async () => {
		const stored = await submit({
			site: () => {
				throw new Error('settings unavailable');
			}
		});
		expect(stored.senderName).toBeUndefined();
		expect(stored.notificationEmails).toHaveLength(1);
	});

	it('puts the site’s name in front of the app’s address', () => {
		expect(fromHeader('Aphex Sites <hello@aphex.site>', 'Lily’s Bakery')).toBe(
			'"Lily’s Bakery" <hello@aphex.site>'
		);
		expect(fromHeader('hello@aphex.site', 'Say "hi"\r\nBcc: x@y.z')).toBe(
			'"Say hiBcc: x@y.z" <hello@aphex.site>'
		);
		expect(fromHeader('Aphex Sites <hello@aphex.site>', '  ')).toBe(
			'Aphex Sites <hello@aphex.site>'
		);
	});

	it('refuses answers in the visitor’s confirmation, and an empty one switched on', async () => {
		const messages = async (confirmationEmail: unknown) =>
			(
				await validateDocumentData(formSchema, {
					title: 'Contact',
					fields: [],
					emails: [],
					confirmationEmail
				})
			).errors.flatMap((entry) => entry.errors);
		// Nested errors read `Field "confirmationEmail.subject" …`.
		expect(
			await messages({ enabled: true, subject: 'Hi {{name}}', message: 'Thanks' })
		).toContainEqual(expect.stringContaining('Answers can’t go in the email to the visitor'));
		expect(await messages({ enabled: true, subject: 'Hi', message: '' })).toContainEqual(
			expect.stringContaining('Write the message')
		);
		expect(await messages({ enabled: false, subject: '', message: '' })).not.toContainEqual(
			expect.stringContaining('confirmationEmail')
		);
	});

	const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
	const event = { organizationId, payload: { submissionId: 'submission-id', formId } };
	const stored = (draftData: Record<string, unknown>) => ({
		findByDocIdAdvanced: vi.fn().mockResolvedValue({ draftData })
	});

	it('sends the owner’s email as the site', async () => {
		const send = vi.fn().mockResolvedValue({ id: 'sent' });
		await notifyOnSubmission('Aphex Sites <hello@aphex.site>')({
			event,
			databaseAdapter: stored({
				senderName: 'Lily’s Bakery',
				submissionData: [],
				notificationEmails: [
					{
						to: 'owner@example.com',
						replyTo: 'visitor@example.com',
						subject: 'New',
						message: 'Body'
					}
				]
			}),
			emailAdapter: { name: 'test', send },
			logger
		} as never);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				from: '"Lily’s Bakery" <hello@aphex.site>',
				replyTo: 'visitor@example.com'
			})
		);
	});

	it('sends the visitor their confirmation, and nothing when there is none', async () => {
		const send = vi.fn().mockResolvedValue({ id: 'sent' });
		const confirm = confirmSubmission('Aphex Sites <hello@aphex.site>');
		await confirm({
			event,
			databaseAdapter: stored({
				senderName: 'Lily’s Bakery',
				confirmationEmail: {
					to: 'visitor@example.com',
					replyTo: 'hello@lilys.example',
					subject: 'Got it',
					message: 'Thanks'
				}
			}),
			emailAdapter: { name: 'test', send },
			logger
		} as never);
		expect(send).toHaveBeenCalledWith({
			from: '"Lily’s Bakery" <hello@aphex.site>',
			to: 'visitor@example.com',
			replyTo: 'hello@lilys.example',
			subject: 'Got it',
			text: 'Thanks'
		});
		send.mockClear();
		await confirm({
			event,
			databaseAdapter: stored({ submissionData: [] }),
			emailAdapter: { name: 'test', send },
			logger
		} as never);
		expect(send).not.toHaveBeenCalled();
	});
});

describe('answer keys from questions', () => {
	it('makes a key from the question', () => {
		expect(keyFromLabel('Your phone number!')).toBe('your_phone_number');
		expect(keyFromLabel('Café name')).toBe('cafe_name');
		expect(keyFromLabel('2 guests?')).toBe('field_2_guests');
		expect(keyFromLabel('  ')).toBeNull();
	});

	it('fills only empty keys, numbering clashes, and leaves paragraphs alone', () => {
		const fields = withFieldKeys([
			{ _type: 'formText', label: 'Name', name: 'name' },
			{ _type: 'formText', label: 'Name' },
			{ _type: 'formMessage' },
			{ _type: 'formPhone', label: 'Phone' }
		]);
		expect(fields.map((field) => field.name)).toEqual(['name', 'name_2', undefined, 'phone']);
	});

	it('keys empty names on save', async () => {
		const hook = formSchema.hooks!.beforeValidate![0]!;
		const data = await hook({
			data: { fields: [{ _type: 'formEmail', label: 'Email address' }] },
			operation: 'create',
			context: { organizationId: 'org' },
			schema: formSchema
		} as never);
		expect((data.fields as Array<{ name?: string }>)[0]!.name).toBe('email_address');
	});
});

describe('phone, date and choose-one answers', () => {
	const form = compileForm({
		id: 'f',
		fields: [
			{ _type: 'formPhone', label: 'Phone', required: true },
			{ _type: 'formDate', label: 'Date', notPast: true },
			{
				_type: 'formRadio',
				label: 'Seating',
				options: [{ label: 'Inside' }, { label: 'Outside', value: 'out' }]
			}
		]
	});
	const check = async (data: Record<string, unknown>) =>
		(await validateFormData(form, data)).errors.map((entry) => entry.field);

	it('accepts a real answer', async () => {
		const later = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
		expect(await check({ phone: '+44 (0)7700 900-123', date: later, seating: 'out' })).toEqual([]);
	});

	it('refuses a non-number phone, a past date and a choice that was never offered', async () => {
		expect(await check({ phone: 'call me', date: '2001-01-01', seating: 'Outside' })).toEqual([
			'phone',
			'date',
			'seating'
		]);
		expect(await check({ phone: '12' })).toEqual(['phone']);
	});
});
