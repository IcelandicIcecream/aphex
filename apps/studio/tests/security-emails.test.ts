/**
 * Security emails, against a real auth instance and database: which events email the
 * account's owner, which don't, and what "This wasn't me" does.
 */
import { describe, expect, it, vi } from 'vitest';
import { createAphexAuth } from '@aphexcms/auth';
import { describeDevice } from '@aphexcms/cms-core';
import { notifyOwnersOfRole } from '@aphexcms/cms-core/auth/team-notice';
import { db, drizzleDb, dbDialect } from './helpers/db';

const ORIGIN = 'http://localhost:5173';
const CHROME =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

function setup(
	securityEmails = true,
	emailAdapterFails = 0,
	twoFactorMethods?: Array<'totp' | 'email'>
) {
	const sent: Array<{ to: string | string[]; subject: string; text?: string }> = [];
	let failures = emailAdapterFails;
	const { auth, provider } = createAphexAuth({
		database: db,
		drizzleDb,
		dialect: dbDialect,
		secret: 'security-emails-test-secret-at-least-32-chars',
		baseURL: ORIGIN,
		authPagesPath: '/admin',
		options: {
			inviteOnly: false,
			securityEmails,
			...(twoFactorMethods ? { twoFactorMethods } : {})
		},
		betterAuth: (base) => ({ ...base, rateLimit: { enabled: false } }),
		emailAdapter: {
			name: 'test',
			defaultFrom: 'cms@example.com',
			send: async (message: { to: string | string[]; subject: string; text?: string }) => {
				if (failures-- > 0) return { id: '', error: 'down' };
				sent.push(message);
				return { id: 'x' };
			}
		} as never
	});

	async function post(path: string, body: unknown, cookie = '') {
		const response = await auth.handler(
			new Request(`${ORIGIN}/api/auth${path}`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					origin: ORIGIN,
					'user-agent': CHROME,
					...(cookie ? { cookie } : {})
				},
				body: JSON.stringify(body)
			})
		);
		const cookies = response.headers
			.getSetCookie()
			.map((entry) => entry.split(';')[0] ?? '')
			.filter((entry) => !entry.endsWith('='));
		return { response, cookies, cookie: cookies.join('; ') };
	}

	async function signUp() {
		const email = `sec-${crypto.randomUUID()}@example.com`;
		const result = await post('/sign-up/email', { email, password: 'first-password', name: 'Sam' });
		expect(result.response.status).toBe(200);
		return { email, ...result };
	}
	const signIn = (email: string, cookie = '', password = 'first-password') =>
		post('/sign-in/email', { email, password }, cookie);
	const subjects = () => sent.map(({ subject }) => subject);
	const settle = () => new Promise((resolve) => setTimeout(resolve, 150));
	return { auth, provider, sent, post, signUp, signIn, subjects, settle };
}

const device = (cookies: string[]) => cookies.find((c) => c.includes('known_device')) ?? '';
const tokenIn = (text = '') => /\/admin\/secure-account\/([\w-]+)/.exec(text)?.[1] ?? '';

describe('security emails', () => {
	it('emails a sign-in from a new device, not from the one signed up on', async () => {
		const t = setup();
		const { email, cookies } = await t.signUp();
		expect(device(cookies)).not.toBe('');
		await t.signIn(email, device(cookies));
		await t.settle();
		expect(t.subjects()).toEqual([]);

		const elsewhere = await t.signIn(email);
		await t.settle();
		expect(t.subjects()).toEqual(['New sign-in to your account']);
		expect(t.sent[0]?.to).toBe(email);
		expect(t.sent[0]?.text).toContain('Chrome on macOS');

		await t.signIn(email, device(elsewhere.cookies));
		await t.settle();
		expect(t.sent).toHaveLength(1);
	});

	it('does not know a device by a cookie it did not sign', async () => {
		const t = setup();
		const { email, cookies } = await t.signUp();
		const [name] = device(cookies).split('=');
		await t.signIn(email, `${name}=${'a'.repeat(43)}.${'b'.repeat(43)}%3D`);
		await t.settle();
		expect(t.sent).toHaveLength(1);
	});

	it('knows each person on a shared device', async () => {
		const t = setup();
		const first = await t.signUp();
		const second = await t.signUp();
		const shared = await t.signIn(second.email, device(first.cookies));
		await t.settle();
		expect(t.sent.map(({ to }) => to)).toEqual([second.email]);
		await t.signIn(first.email, device(shared.cookies));
		await t.signIn(second.email, device(shared.cookies));
		await t.settle();
		expect(t.sent).toHaveLength(1);
	});

	it('sends nothing and sets nothing while off, which is the default', async () => {
		const t = setup(false);
		const { email, cookies } = await t.signUp();
		await t.signIn(email);
		await t.settle();
		expect(device(cookies)).toBe('');
		expect(t.sent).toEqual([]);
		expect(t.provider.secureAccount).toBeUndefined();
	});

	it('emails a changed password once, with no new-device email beside it', async () => {
		const t = setup();
		const { cookie } = await t.signUp();
		const { response } = await t.post(
			'/change-password',
			{
				currentPassword: 'first-password',
				newPassword: 'second-password',
				revokeOtherSessions: true
			},
			cookie
		);
		expect(response.status).toBe(200);
		await t.settle();
		expect(t.subjects()).toEqual(['Your password was changed']);
	});

	it('says nothing about a password change that was refused', async () => {
		const t = setup();
		const { cookie } = await t.signUp();
		await t.post(
			'/change-password',
			{ currentPassword: 'wrong', newPassword: 'second-password' },
			cookie
		);
		await t.settle();
		expect(t.sent).toEqual([]);
	});

	it('emails a password reset', async () => {
		const t = setup();
		const { email } = await t.signUp();
		await t.provider.requestPasswordReset(email);
		await t.settle();
		const token = /reset-password\/([\w-]+)/.exec(t.sent[0]?.text ?? '')?.[1] ?? '';
		await t.provider.resetPassword(token, 'second-password');
		await t.settle();
		expect(t.subjects()).toEqual(['Reset your password', 'Your password was changed']);
	});

	it('emails nothing when the password is right and the second factor is not given', async () => {
		const t = setup(true, 0, ['email']);
		const { email, cookie } = await t.signUp();
		const enabled = await t.post('/two-factor/enable', { password: 'first-password' }, cookie);
		expect(enabled.response.status).toBe(200);
		const challenged = await t.signIn(email);
		expect(await challenged.response.json()).toMatchObject({ twoFactorRedirect: true });
		await t.settle();
		expect(t.subjects()).toEqual([]);
		expect(device(challenged.cookies)).toBe('');

		const off = await t.post(
			'/two-factor/disable',
			{ password: 'first-password' },
			enabled.cookie || cookie
		);
		expect(off.response.status).toBe(200);
		await t.settle();
		expect(t.subjects()).toEqual(['Two-factor sign-in was turned off']);
	});

	it('emails repeated failed sign-ins once, and never for an address with no account', async () => {
		const t = setup();
		const { email, cookies } = await t.signUp();
		for (let i = 0; i < 4; i++) {
			await t.signIn(email, device(cookies), 'wrong-password');
			await t.settle();
		}
		expect(t.sent).toEqual([]);
		for (let i = 0; i < 4; i++) {
			await t.signIn(email, '', 'wrong-password');
			await t.settle();
		}
		expect(t.subjects()).toEqual(['Failed sign-ins to your account']);
		for (let i = 0; i < 6; i++) await t.signIn('nobody@example.com', '', 'wrong-password');
		await t.settle();
		expect(t.sent).toHaveLength(1);
	});

	it('sends again when the mail server fails', async () => {
		const t = setup(true, 1);
		const { email } = await t.signUp();
		const { response } = await t.signIn(email);
		expect(response.status).toBe(200);
		await t.settle();
		expect(t.sent).toEqual([]);
		await vi.waitFor(() => expect(t.sent).toHaveLength(1), { timeout: 4000 });
	});
});

describe('"This wasn\'t me"', () => {
	it('signs out every device, kills the password and emails a reset, once', async () => {
		const t = setup();
		const { email, cookie } = await t.signUp();
		await t.signIn(email);
		await t.settle();
		const token = tokenIn(t.sent[0]?.text);
		expect(token).not.toBe('');

		const context = await t.auth.$context;
		const { user } = (await context.internalAdapter.findUserByEmail(email)) ?? {};
		expect(await context.internalAdapter.listSessions(user?.id ?? '')).toHaveLength(2);

		expect(await t.provider.secureAccount?.(token)).toEqual({ passwordReset: true });
		await t.settle();
		expect(await context.internalAdapter.listSessions(user?.id ?? '')).toEqual([]);
		expect((await t.signIn(email)).response.status).toBe(401);
		expect(t.subjects().at(-1)).toBe('Reset your password');
		expect(cookie).not.toBe('');

		expect(await t.provider.secureAccount?.(token)).toBeNull();
		// The reset it emailed works.
		const reset = /reset-password\/([\w-]+)/.exec(t.sent.at(-1)?.text ?? '')?.[1] ?? '';
		await t.provider.resetPassword(reset, 'third-password');
		expect((await t.signIn(email, '', 'third-password')).response.status).toBe(200);
	});

	it('refuses a made-up link', async () => {
		expect(await setup().provider.secureAccount?.('nope')).toBeNull();
	});
});

describe('telling owners', () => {
	function services(securityEmails: boolean) {
		const send = vi.fn(async () => ({ id: 'x' }));
		return {
			send,
			value: {
				config: {},
				authFeatures: { securityEmails },
				emailAdapter: { defaultFrom: 'cms@example.com', send },
				databaseAdapter: {
					findOrganizationById: async () => ({ id: 'o', name: 'Acme' }),
					findOrganizationMembers: async () => [
						{ userId: 'owner', role: 'owner' },
						{ userId: 'actor', role: 'owner' },
						{ userId: 'editor', role: 'editor' },
						{ userId: 'new', role: 'owner' }
					]
				},
				auth: { getUserById: async (id: string) => ({ id, email: `${id}@example.com` }) }
			} as never
		};
	}
	const change = { organizationId: 'o', userId: 'new', actorId: 'actor', origin: ORIGIN };

	it('tells the other owners about a new owner or admin', async () => {
		const { send, value } = services(true);
		await notifyOwnersOfRole(value, { ...change, role: 'admin' });
		expect(send).toHaveBeenCalledTimes(1);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'owner@example.com',
				subject: 'new@example.com is now an admin of Acme'
			})
		);
	});

	it('says nothing for other roles, or while off', async () => {
		const on = services(true);
		await notifyOwnersOfRole(on.value, { ...change, role: 'editor' });
		const off = services(false);
		await notifyOwnersOfRole(off.value, { ...change, role: 'owner' });
		expect(on.send).not.toHaveBeenCalled();
		expect(off.send).not.toHaveBeenCalled();
	});
});

it('describes a device the way its owner would', () => {
	expect(describeDevice(CHROME)).toBe('Chrome on macOS');
	expect(describeDevice(`${CHROME} Edg/140.0`)).toBe('Edge on macOS');
	expect(
		describeDevice(
			'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Safari/604.1'
		)
	).toBe('Safari on iPhone');
	expect(describeDevice('curl/8')).toBeNull();
	expect(describeDevice(null)).toBeNull();
});
