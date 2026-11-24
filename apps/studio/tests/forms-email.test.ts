/**
 * Form emails end to end: a visitor posts to the public address, the message is
 * stored, the worker runs, and real SMTP delivers it. Only the mail server is ours.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	__notifyAphexConfigChanged,
	createCMSConfig,
	createCMSHook,
	runJobsBatch,
	systemContext
} from '@aphexcms/cms-core/server';
import type { RequestEvent } from '@sveltejs/kit';
import { createNodemailerAdapter } from '@aphexcms/nodemailer-adapter';
import { sqliteAdapter } from '@aphexcms/sqlite-adapter';
import { formsPlugin, type FormsPluginOptions } from '../../../plugins/plugin-forms/src/lib/index';
import { startMailServer } from './helpers/smtp';
import { testCmsConfig } from './fixtures/config';

const cleanups: Array<() => Promise<unknown>> = [];
afterEach(async () => {
	for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

const FIELDS = [
	{ _type: 'formText', _key: 'a', label: 'Your name', required: true },
	{ _type: 'formEmail', _key: 'b', label: 'Your email', required: true },
	{ _type: 'formPhone', _key: 'c', label: 'Phone' },
	{ _type: 'formTextarea', _key: 'd', label: 'Message', required: true }
];

let visitor = 0;

async function site(
	form: Record<string, unknown> = {},
	refuse = 0,
	options: FormsPluginOptions = {}
) {
	const mail = await startMailServer({ refuse });
	cleanups.push(mail.close);
	const directory = await mkdtemp(join(tmpdir(), 'aphex-forms-email-'));
	const url = `file:${join(directory, 'aphex.db')}`;
	cleanups.push(async () => {
		globalThis.__aphexDatabaseConnections?.delete(`sqlite:${url}`);
		await rm(directory, { recursive: true });
	});
	const { database: _database, auth: _auth, ...base } = testCmsConfig;
	const config = createCMSConfig({
		...base,
		schemaTypes: [],
		graphql: false,
		jobs: undefined,
		database: sqliteAdapter({ url }),
		email: createNodemailerAdapter({ host: '127.0.0.1', port: mail.port }),
		plugins: [
			formsPlugin({
				...options,
				from: 'Aphex Sites <hello@aphex.site>',
				site: () => ({ name: 'Lily’s Café', email: 'lily@example.com' })
			})
		]
	});
	const event = {
		url: new URL('http://localhost/forms-email-probe'),
		route: { id: null },
		request: new Request('http://localhost/forms-email-probe'),
		locals: {},
		cookies: { get: () => undefined }
	} as unknown as RequestEvent;
	// The hook keeps one instance per process: this test's config replaces the last one's.
	__notifyAphexConfigChanged(config);
	await createCMSHook(config)({ event, resolve: async () => new Response('ok') });
	const cms = event.locals.aphexCMS;
	const organization = await cms.databaseAdapter.createOrganization({
		name: 'Lily’s Café',
		slug: `lily-${crypto.randomUUID()}`,
		createdBy: 'test'
	});
	const context = systemContext(organization.id);
	const forms = cms.localAPI.getCollection('form');
	if (!forms) throw new Error('The forms plugin should add its collection');
	const { document } = await forms.create(
		context,
		{
			title: 'Contact',
			fields: FIELDS,
			confirmationType: 'redirect',
			redirectUrl: '/thanks',
			emails: [],
			...form
		},
		{ publish: true }
	);
	const published = await forms.findByID(context, document.id, { perspective: 'published' });

	const submit = (data: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
		cms.apiApp.fetch(
			new Request('http://localhost/api/form-submissions', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					form: document.id,
					version: published?._meta?.publishedHash,
					data,
					...extra
				})
			}),
			{ aphexCMS: cms, auth: null, tenant: null, clientAddress: `198.51.100.${++visitor}` }
		);
	const work = () => runJobsBatch(cms);
	return { cms, mail, submit, work };
}

const ANSWERS = {
	your_name: 'Zoë Müller',
	your_email: 'zoe@example.com',
	phone: '+61 400 000 000',
	message: 'Hello!\nDo you open Sundays? <b>Thanks</b> & bye'
};

describe('form emails, sent for real', () => {
	it('reaches the site’s own address, from the site, with replies to the visitor', async () => {
		const { mail, submit, work } = await site();
		const response = await submit(ANSWERS);
		expect(await response.json()).toMatchObject({ success: true, redirectUrl: '/thanks' });
		// Sending never holds up the visitor.
		expect(mail.received).toHaveLength(0);

		await work();

		expect(mail.received).toHaveLength(1);
		const [message] = mail.received;
		expect(message?.recipients).toEqual(['lily@example.com']);
		expect(message?.headers.from).toContain('<hello@aphex.site>');
		expect(message?.headers['reply-to']).toBe('zoe@example.com');
		expect(message?.headers.subject).toBe('New message: Contact');
		const text = message?.parts['text/plain'];
		expect(text).toContain('Your name: Zoë Müller');
		expect(text).toContain('Phone: +61 400 000 000');
		expect(text?.replace(/\r\n/g, '\n')).toContain(
			'Hello!\nDo you open Sundays? <b>Thanks</b> & bye'
		);
		// What a visitor typed is never HTML in the owner's inbox.
		expect(message?.parts['text/html'] ?? '').not.toContain('<b>Thanks</b>');
	});

	it('sends one message once, however often the worker runs', async () => {
		const { mail, submit, work } = await site();
		await submit(ANSWERS);
		await work();
		await work();
		await work();
		expect(mail.received).toHaveLength(1);
	});

	it('sends to everyone the form names, with the answers in its own words', async () => {
		const { mail, submit, work } = await site({
			emails: [
				{
					_type: 'notification',
					_key: 'n',
					to: 'a@example.com, b@example.com',
					subject: 'From {{your_name}}',
					message: '{{your_name}} says: {{message}} ({{nothing}})'
				}
			]
		});
		await submit({ ...ANSWERS, your_name: 'Zoe' });
		await work();
		expect(mail.received).toHaveLength(1);
		expect(mail.received[0]?.recipients).toEqual(['a@example.com', 'b@example.com']);
		expect(mail.received[0]?.headers.subject).toBe('From Zoe');
		expect(mail.received[0]?.parts['text/plain']).toContain('Zoe says: Hello!');
		expect(mail.received[0]?.parts['text/plain']).toContain('({{nothing}})');
	});

	it('sends the visitor their confirmation, and nothing they typed in it', async () => {
		const { mail, submit, work } = await site({
			confirmationEmail: { enabled: true, subject: 'We got it', message: 'We’ll reply soon.' }
		});
		await submit(ANSWERS);
		await work();
		expect(mail.received).toHaveLength(2);
		const copy = mail.received.find(({ recipients }) => recipients[0] === 'zoe@example.com');
		expect(copy?.headers.subject).toBe('We got it');
		expect(copy?.headers['reply-to']).toBe('lily@example.com');
		expect(copy?.parts['text/plain']?.trim()).toBe('We’ll reply soon.');
	});

	it('cannot be made to add a recipient or header', async () => {
		const { mail, submit, work } = await site({
			emails: [
				{
					_type: 'notification',
					_key: 'n',
					to: 'a@example.com',
					subject: 'From {{your_name}}',
					message: '{{allFields}}'
				}
			]
		});
		await submit({ ...ANSWERS, your_name: 'Zoe\r\nBcc: victim@example.com' });
		await work();
		for (const message of mail.received) {
			expect(message.recipients).toEqual(['a@example.com']);
			expect(message.headers.bcc).toBeUndefined();
		}
		expect((await submit({ ...ANSWERS, your_email: 'a@b.co, victim@example.com' })).status).toBe(
			400
		);
	});

	it('keeps the message and tries again when the mail server turns it away', async () => {
		const { cms, mail, submit, work } = await site({}, 1);
		expect((await submit(ANSWERS)).status).toBe(200);
		const first = await work();
		expect(mail.received).toHaveLength(0);
		expect(first.retried).toBe(1);
		// Stored either way: the owner can read it in the admin.
		const organizations = await cms.databaseAdapter.findAllOrganizations();
		const submissions = cms.localAPI.getCollection('formSubmission');
		const stored = await submissions?.find(systemContext(organizations[0]?.id ?? ''));
		expect(stored?.totalDocs).toBe(1);
	});

	it('lets the app change, narrow or stop each email, the same key on a retry', async () => {
		const keys: string[] = [];
		const { mail, submit, work } = await site(
			{
				emails: [
					{
						_type: 'notification',
						_key: 'n',
						to: 'a@example.com, b@example.com',
						subject: 'S',
						message: '{{allFields}}'
					}
				],
				confirmationEmail: { enabled: true, subject: 'We got it', message: 'Thanks.' }
			},
			1,
			{
				prepareEmail: (email) => {
					keys.push(email.key);
					if (email.kind === 'confirmation') return null;
					expect(email.answers[0]).toMatchObject({ label: 'Your name', value: 'Zoë Müller' });
					return { ...email, to: ['a@example.com'], html: '<p>Designed</p>' };
				}
			}
		);
		await submit(ANSWERS);
		await work();
		expect(mail.received).toHaveLength(0);
		vi.useFakeTimers({ now: Date.now() + 60 * 60 * 1000, toFake: ['Date'] });
		try {
			await work();
		} finally {
			vi.useRealTimers();
		}
		expect(mail.received).toHaveLength(1);
		expect(mail.received[0]?.recipients).toEqual(['a@example.com']);
		expect(mail.received[0]?.parts['text/html']).toContain('Designed');
		const sent = keys.filter((key) => key.includes(':notification:'));
		expect(sent).toHaveLength(2);
		expect(new Set(sent).size).toBe(1);
	});

	it('sends nothing for a bot, a missing answer or an undeclared one', async () => {
		const { mail, submit, work } = await site();
		expect((await submit(ANSWERS, { website: 'https://spam.example' })).status).toBe(200);
		expect((await submit({ your_name: 'Zoe' })).status).toBe(400);
		await work();
		expect(mail.received).toHaveLength(0);

		await submit({ ...ANSWERS, secret: 'stuffed' });
		await work();
		expect(mail.received[0]?.parts['text/plain']).not.toContain('stuffed');
	});
});
