import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { createAdminLoad } from '@aphexcms/cms-core/server/pages/admin';
import { handleAuthHook } from '@aphexcms/cms-core/auth/auth-hooks';
import { AuthError } from '@aphexcms/cms-core/auth/auth-errors';
import { authPagesBase, invitationUrl } from '@aphexcms/cms-core/auth/pages';
import { sendInvitationEmail } from '@aphexcms/cms-core/auth/invitation-email';
import { invitationsRouter } from '@aphexcms/cms-core/server/api/routes/invitations';
import type { AphexEnv } from '@aphexcms/cms-core/server/api/index';

/**
 * The account pages core serves from the `/admin` catch-all: what each one shows for
 * the session it finds, and that a host with its own pages keeps its old URLs.
 */

const FUTURE = new Date(Date.now() + 86_400_000);
const PAST = new Date(Date.now() - 86_400_000);

function invitation(overrides: Record<string, unknown> = {}) {
	return {
		id: 'inv-1',
		token: 'tok-1',
		organizationId: 'org-1',
		email: 'sam@example.com',
		role: 'editor',
		invitedBy: 'owner-1',
		createdAt: new Date(),
		expiresAt: FUTURE,
		acceptedAt: null,
		...overrides
	};
}

function fakeDatabase(invitations: ReturnType<typeof invitation>[] = [invitation()]) {
	return {
		findInvitationByToken: async (token: string) =>
			invitations.find((row) => row.token === token) ?? null,
		findInvitationsByEmail: async (email: string) =>
			invitations.filter((row) => row.email === email),
		findOrganizationById: async () => ({ id: 'org-1', name: 'Acme', slug: 'acme' }),
		getInstanceSettings: async () => ({ allowUserOrgCreation: true }),
		acceptInvitation: vi.fn(async () => ({})),
		updateUserSession: vi.fn(async () => undefined),
		deleteInvitation: vi.fn(async () => true)
	};
}

const partialSession = {
	type: 'partial_session',
	user: { id: 'user-2', email: 'sam@example.com', name: 'Sam' },
	session: { id: 's', expiresAt: FUTURE }
};

function load(
	path: string,
	{
		auth,
		database = fakeDatabase(),
		provider,
		extra
	}: {
		auth?: unknown;
		database?: ReturnType<typeof fakeDatabase>;
		provider?: unknown;
		extra?: Record<string, unknown>;
	} = {}
) {
	return createAdminLoad()({
		locals: {
			aphexAuth: auth,
			aphexCMS: { databaseAdapter: database, config: {}, auth: provider, ...extra }
		},
		params: { path },
		url: new URL(`http://localhost/admin/${path}`),
		request: new Request(`http://localhost/admin/${path}`)
	} as never);
}

async function redirectFrom(run: Promise<unknown>): Promise<unknown> {
	return run.then(
		() => null,
		(thrown: { status?: number; location?: string }) => thrown.location
	);
}

describe('invite link', () => {
	it('shows a signed-out visitor who the invitation is for', async () => {
		const data = await load('invite/tok-1');
		expect(data).toMatchObject({
			view: 'invite',
			status: 'open',
			standalone: true,
			invitation: { email: 'sam@example.com', role: 'editor' },
			organization: { name: 'Acme' }
		});
	});

	it('accepts for someone signed in with no organization yet', async () => {
		const database = fakeDatabase();
		const location = await redirectFrom(load('invite/tok-1', { auth: partialSession, database }));
		expect(location).toBe('/admin');
		expect(database.acceptInvitation).toHaveBeenCalledWith('tok-1', 'user-2');
		expect(database.updateUserSession).toHaveBeenCalledWith('user-2', 'org-1');
	});

	it("won't accept for a different address", async () => {
		const database = fakeDatabase();
		const data = await load('invite/tok-1', {
			auth: { ...partialSession, user: { ...partialSession.user, email: 'other@example.com' } },
			database
		});
		expect(data).toMatchObject({ status: 'email_mismatch' });
		expect(database.acceptInvitation).not.toHaveBeenCalled();
	});

	it.each([
		['unknown', 'nope', 'invalid', []],
		['expired', 'tok-1', 'expired', [invitation({ expiresAt: PAST })]],
		['used', 'tok-1', 'already_accepted', [invitation({ acceptedAt: new Date() })]]
	] as const)('reports a %s link', async (_name, token, status, rows) => {
		const data = await load(`invite/${token}`, { database: fakeDatabase([...rows]) });
		expect(data).toMatchObject({ status, invitation: null });
	});
});

describe('invitations view', () => {
	it('lists what is waiting for a session with no organization', async () => {
		const data = await load('invitations', { auth: partialSession });
		expect(data).toMatchObject({
			view: 'invitations',
			standalone: true,
			hasOrganization: false,
			canCreateOrganization: true,
			pendingInvitations: [{ id: 'inv-1', organizationName: 'Acme' }]
		});
	});

	it('sends a signed-out visitor to sign in', async () => {
		expect(await redirectFrom(load('invitations'))).toBe('/admin/login');
	});
});

describe('password reset link', () => {
	it('opens without a session and keeps the token', async () => {
		expect(await load('reset-password/abc')).toMatchObject({
			view: 'reset-password',
			token: 'abc'
		});
	});

	it('moves someone already signed in along', async () => {
		expect(await redirectFrom(load('reset-password/abc', { auth: partialSession }))).toBe('/admin');
	});
});

describe('two-factor challenge', () => {
	it('sends someone with no pending challenge back to sign in', async () => {
		const provider = { hasPendingTwoFactor: () => false };
		expect(await redirectFrom(load('two-factor', { provider }))).toBe(
			'/admin/login?error=two_factor_expired'
		);
	});

	it('offers email codes only with an adapter behind them', async () => {
		const provider = { hasPendingTwoFactor: () => true };
		expect(await load('two-factor', { provider })).toMatchObject({
			otpAvailable: false,
			totpAvailable: true
		});
		expect(
			await load('two-factor', { provider, extra: { emailAdapter: { name: 'x' } } })
		).toMatchObject({ otpAvailable: true, totpAvailable: true });
	});

	it('keeps TOTP when dropping email would leave nothing', async () => {
		const data = await load('two-factor', {
			provider: { hasPendingTwoFactor: () => true },
			extra: { authFeatures: { twoFactorMethods: ['email'] } }
		});
		expect(data).toMatchObject({ otpAvailable: false, totpAvailable: true });
	});
});

describe('auth hook', () => {
	function runHook(path: string, loginUrl: string, session: () => Promise<unknown>) {
		const event = {
			url: new URL(`http://localhost${path}`),
			locals: {},
			request: new Request('http://x')
		};
		const provider = {
			requireSession: session,
			getSession: vi.fn(async () => partialSession)
		};
		const roles = { getCapabilities: async () => [] };
		return {
			event,
			run: handleAuthHook(
				event as never,
				{ auth: { loginUrl } } as never,
				provider as never,
				{} as never,
				roles as never
			)
		};
	}
	const noSession = async () => {
		throw new AuthError('no_session', 'no');
	};
	const pending = async () => {
		throw new AuthError('pending_invitations', 'pending');
	};

	it.each([
		'/admin/invitations',
		'/admin/two-factor',
		'/admin/invite/t',
		'/admin/reset-password/t'
	])('lets %s through and still finds any session', async (path) => {
		const { event, run } = runHook(path, '/admin/login', noSession);
		await expect(run).resolves.toBeNull();
		expect(event.locals).toMatchObject({ aphexAuth: { type: 'partial_session' } });
	});

	it('recognizes an AuthError from another copy of the class', async () => {
		// An auth package loaded outside Vite's bundle has its own AuthError.
		class ForeignAuthError extends Error {
			name = 'AuthError';
			code = 'pending_invitations';
		}
		const { run } = runHook('/admin', '/admin/login', async () => {
			throw new ForeignAuthError('pending');
		});
		await expect(run).rejects.toMatchObject({ location: '/admin/invitations' });
	});

	it('keeps the rest of the admin behind a session', async () => {
		const { run } = runHook('/admin/settings', '/admin/login', noSession);
		await expect(run).rejects.toMatchObject({ location: '/admin/login?error=no_session' });
	});

	it('sends a session with no organization to the invitations view', async () => {
		const { run } = runHook('/admin', '/admin/login', pending);
		await expect(run).rejects.toMatchObject({ location: '/admin/invitations' });
	});

	it("leaves a host's own pages where they are", async () => {
		const pendingRun = runHook('/admin', '/login', pending).run;
		await expect(pendingRun).rejects.toMatchObject({ location: '/invitations' });

		const inviteRun = runHook('/admin/invite/t', '/login', noSession).run;
		await expect(inviteRun).rejects.toMatchObject({ location: '/login?error=no_session' });
	});
});

describe('page URLs', () => {
	it('follow where login lives', () => {
		expect(authPagesBase('/admin/login')).toBe('/admin');
		expect(authPagesBase('/login')).toBe('');
		expect(authPagesBase(undefined)).toBe('');
		expect(
			invitationUrl({ auth: { loginUrl: '/admin/login' } } as never, 'https://a.co', 't')
		).toBe('https://a.co/admin/invite/t');
		expect(invitationUrl({ auth: { loginUrl: '/login' } } as never, 'https://a.co', 't')).toBe(
			'https://a.co/invite/t'
		);
	});
});

describe('invitation email', () => {
	const send = () => vi.fn(async () => ({ id: '1' }));
	const services = (emailAdapter: unknown, config: object = {}) =>
		({
			config: { auth: { loginUrl: '/admin/login' }, ...config },
			databaseAdapter: fakeDatabase(),
			emailAdapter
		}) as never;

	it('sends the plain template from the adapter sender', async () => {
		const mail = send();
		await sendInvitationEmail(
			services({ name: 'x', defaultFrom: 'App <a@b.co>', send: mail }),
			invitation() as never,
			'https://a.co'
		);
		expect(mail).toHaveBeenCalledOnce();
		expect(mail).toHaveBeenCalledWith(
			expect.objectContaining({
				from: 'App <a@b.co>',
				to: 'sam@example.com',
				subject: "You've been invited to join Acme",
				html: expect.stringContaining('https://a.co/admin/invite/tok-1'),
				text: expect.stringContaining('https://a.co/admin/invite/tok-1')
			})
		);
	});

	it('uses the configured template', async () => {
		const mail = send();
		await sendInvitationEmail(
			services(
				{ name: 'x', send: mail },
				{
					invitationEmail: {
						from: 'Custom <c@b.co>',
						getSubject: (org: string) => `Join ${org}!`,
						render: async () => ({ html: 'H', text: 'T' })
					}
				}
			),
			invitation() as never,
			'https://a.co'
		);
		expect(mail).toHaveBeenCalledWith(
			expect.objectContaining({ from: 'Custom <c@b.co>', subject: 'Join Acme!', html: 'H' })
		);
	});

	it('skips quietly with no adapter or sender, and survives a failed send', async () => {
		const mail = send();
		await expect(
			sendInvitationEmail(services(null), invitation() as never, 'https://a.co')
		).resolves.toBeUndefined();
		await sendInvitationEmail(
			services({ name: 'x', send: mail }),
			invitation() as never,
			'https://a.co'
		);
		expect(mail).not.toHaveBeenCalled();

		await expect(
			sendInvitationEmail(
				services({
					name: 'x',
					defaultFrom: 'a@b.co',
					send: async () => {
						throw new Error('smtp down');
					}
				}),
				invitation() as never,
				'https://a.co'
			)
		).resolves.toBeUndefined();
	});
});

describe('/invitations API', () => {
	function call(path: string, method: string, auth: unknown, database = fakeDatabase()) {
		const app = new Hono<AphexEnv>();
		app.use(async (c, next) => {
			c.set('aphexCMS', c.env.aphexCMS);
			c.set('auth', c.env.auth);
			await next();
		});
		app.route('/invitations', invitationsRouter);
		return app.fetch(new Request(`http://localhost${path}`, { method }), {
			aphexCMS: { databaseAdapter: database },
			auth
		} as never);
	}

	it('needs a session, and an API key is not one', async () => {
		expect((await call('/invitations', 'GET', null)).status).toBe(401);
		expect((await call('/invitations', 'GET', { type: 'api_key' })).status).toBe(401);
	});

	it('lists pending invitations for a session with no organization', async () => {
		const response = await call('/invitations', 'GET', partialSession);
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			data: [{ id: 'inv-1', organizationName: 'Acme' }]
		});
	});

	it('accepts by id only through the caller’s own address', async () => {
		const database = fakeDatabase();
		const stranger = {
			...partialSession,
			user: { ...partialSession.user, email: 'other@example.com' }
		};
		const denied = await call('/invitations/inv-1/accept', 'POST', stranger, database);
		expect(denied.status).toBe(404);
		expect(database.acceptInvitation).not.toHaveBeenCalled();

		const accepted = await call('/invitations/inv-1/accept', 'POST', partialSession, database);
		expect(accepted.status).toBe(200);
		expect(database.acceptInvitation).toHaveBeenCalledWith('tok-1', 'user-2');
	});

	it('refuses an expired invitation', async () => {
		const database = fakeDatabase([invitation({ expiresAt: PAST })]);
		const response = await call('/invitations/inv-1/accept', 'POST', partialSession, database);
		expect(response.status).toBe(400);
		expect(database.acceptInvitation).not.toHaveBeenCalled();
	});

	it('declines within the invitation’s organization', async () => {
		const database = fakeDatabase();
		const response = await call('/invitations/inv-1/reject', 'POST', partialSession, database);
		expect(response.status).toBe(200);
		expect(database.deleteInvitation).toHaveBeenCalledWith('inv-1', 'org-1');
	});
});
