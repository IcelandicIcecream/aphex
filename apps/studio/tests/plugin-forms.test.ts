import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { validateDocumentData } from '@aphexcms/cms-core';
import type { AphexEnv } from '@aphexcms/cms-core/server';
import { formSchema, formSubmissionSchema } from '../../../plugins/plugin-forms/src/lib/schema';
import { formsPlugin } from '../../../plugins/plugin-forms/src/lib/index';
import { handleSubmit } from '../../../plugins/plugin-forms/src/lib/submit';
import { notifyOnSubmission } from '../../../plugins/plugin-forms/src/lib/notify';

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

function submissionApp(options: { version?: string } = {}) {
	const create = vi.fn().mockResolvedValue({ document: { id: 'unused' } });
	const resolvePublishedDocumentOrganizationId = vi.fn().mockResolvedValue(organizationId);
	const findAllOrganizations = vi.fn(() => {
		throw new Error('public form routing must not scan organizations');
	});
	const cms = {
		databaseAdapter: { resolvePublishedDocumentOrganizationId, findAllOrganizations },
		localAPI: {
			getCollection: (name: string) =>
				name === 'form'
					? { findByID: vi.fn().mockResolvedValue(formDocument(options.version)) }
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
		await next();
	});
	app.post('/api/form-submissions', handleSubmit);
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
		expect(messages).toContain('Every input must have a unique name');
	});

	it('rejects inverted number ranges', async () => {
		const messages = await errors([
			{ _type: 'formNumber', name: 'age', label: 'Age', min: 10, max: 5 }
		]);
		expect(messages).toContain('Minimum cannot exceed maximum for Age');
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
		expect(messages).toContain('Select option values must be unique');
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
