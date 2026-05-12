import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { userRouter } from '@aphexcms/cms-core/server/api/routes/user';
import type { AphexEnv } from '@aphexcms/cms-core/server/api/index';

/**
 * Phase 5 gate — auth-related user routes ported from studio shims into
 * cms-core Hono routers.
 *
 * The contract: cms-core handlers are thin wrappers over the AuthProvider
 * interface. Studio supplies the implementation at boot via
 * `config.auth.provider`. cms-core never sees better-auth or any specific
 * auth library directly.
 */

const TEST_USER = 'user-1';

function buildEnv(
	opts: {
		missingAuth?: boolean;
		missingProvider?: boolean;
		providerOverrides?: Partial<{
			changeUserName: any;
			requestPasswordReset: any;
			resetPassword: any;
		}>;
	} = {}
) {
	const provider = opts.missingProvider
		? undefined
		: {
				changeUserName: vi.fn(async (_uid: string, _name: string) => undefined),
				requestPasswordReset: vi.fn(async (_email: string, _redirect?: string) => undefined),
				resetPassword: vi.fn(async (_token: string, _pwd: string) => undefined),
				...opts.providerOverrides
			};

	return {
		env: {
			aphexCMS: { auth: provider } as any,
			auth: opts.missingAuth
				? null
				: ({
						type: 'session',
						organizationId: 'org-1',
						user: {
							id: TEST_USER,
							email: 'me@e.com',
							name: 'Me',
							role: 'admin' as const
						}
					} as any)
		},
		provider: provider as NonNullable<typeof provider>
	};
}

function makeApp() {
	const app = new Hono<AphexEnv>();
	app.use('*', async (c, next) => {
		c.set('aphexCMS', c.env.aphexCMS);
		c.set('auth', c.env.auth);
		await next();
	});
	app.route('/user', userRouter);
	return app;
}

// ---------- PATCH /user ----------

describe('PATCH /user — change name', () => {
	it('200 + calls provider.changeUserName(uid, name)', async () => {
		const { env, provider } = buildEnv();
		const res = await makeApp().fetch(
			new Request('http://localhost/user', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: 'New Name' })
			}),
			env
		);
		expect(res.status).toBe(200);
		expect(provider.changeUserName).toHaveBeenCalledWith(TEST_USER, 'New Name');
	});

	it('401 when no session', async () => {
		const { env } = buildEnv({ missingAuth: true });
		const res = await makeApp().fetch(
			new Request('http://localhost/user', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: 'Whatever' })
			}),
			env
		);
		expect(res.status).toBe(401);
	});

	it('400 with issues[] when name missing', async () => {
		const { env } = buildEnv();
		const res = await makeApp().fetch(
			new Request('http://localhost/user', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({})
			}),
			env
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(Array.isArray(body.issues)).toBe(true);
	});

	it('500 when provider not configured', async () => {
		const { env } = buildEnv({ missingProvider: true });
		const res = await makeApp().fetch(
			new Request('http://localhost/user', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: 'X' })
			}),
			env
		);
		expect(res.status).toBe(500);
	});
});

// ---------- POST /user/request-password-reset ----------

describe('POST /user/request-password-reset', () => {
	it('200 + calls provider.requestPasswordReset(email, redirect?)', async () => {
		const { env, provider } = buildEnv();
		const res = await makeApp().fetch(
			new Request('http://localhost/user/request-password-reset', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: 'a@b.com', redirectTo: '/login' })
			}),
			env
		);
		expect(res.status).toBe(200);
		expect(provider.requestPasswordReset).toHaveBeenCalledWith('a@b.com', '/login');
	});

	it('returns same generic message regardless of provider success', async () => {
		// Defensive against account enumeration.
		const { env } = buildEnv();
		const res = await makeApp().fetch(
			new Request('http://localhost/user/request-password-reset', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: 'unknown@example.com' })
			}),
			env
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.message).toMatch(/If an account exists/i);
	});

	it('400 on bad email shape', async () => {
		const { env } = buildEnv();
		const res = await makeApp().fetch(
			new Request('http://localhost/user/request-password-reset', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: 'not-an-email' })
			}),
			env
		);
		expect(res.status).toBe(400);
	});

	it('does NOT require session auth (forgot-password flow)', async () => {
		// Logged-out users must be able to call this.
		const { env, provider } = buildEnv({ missingAuth: true });
		const res = await makeApp().fetch(
			new Request('http://localhost/user/request-password-reset', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: 'a@b.com' })
			}),
			env
		);
		expect(res.status).toBe(200);
		expect(provider.requestPasswordReset).toHaveBeenCalledOnce();
	});
});

// ---------- POST /user/reset-password ----------

describe('POST /user/reset-password', () => {
	it('200 + calls provider.resetPassword(token, newPassword)', async () => {
		const { env, provider } = buildEnv();
		const res = await makeApp().fetch(
			new Request('http://localhost/user/reset-password', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ token: 'tok', newPassword: 'secureP@ss1' })
			}),
			env
		);
		expect(res.status).toBe(200);
		expect(provider.resetPassword).toHaveBeenCalledWith('tok', 'secureP@ss1');
	});

	it('400 when token missing', async () => {
		const { env } = buildEnv();
		const res = await makeApp().fetch(
			new Request('http://localhost/user/reset-password', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ newPassword: 'secureP@ss1' })
			}),
			env
		);
		expect(res.status).toBe(400);
	});

	it('500 when provider rejects (invalid token, etc)', async () => {
		const { env } = buildEnv({
			providerOverrides: {
				resetPassword: vi.fn(async () => {
					throw new Error('Invalid or expired token');
				})
			}
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/user/reset-password', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ token: 'bad', newPassword: 'secureP@ss1' })
			}),
			env
		);
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.success).toBe(false);
	});
});
