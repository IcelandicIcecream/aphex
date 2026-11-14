import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The admin only ever talks to better-auth through this adapter, so a wrong mapping
 * shows up as a dead button in the browser and nowhere else. These pin each call to the
 * endpoint and body better-auth's server expects.
 */
const calls: Array<{ path: string; method: string; body: unknown }> = [];

// Stubbed before the import, because better-auth's client keeps a reference to `fetch`
// when it's created. Paths are relative, as in a browser, which takes the page's origin.
vi.stubGlobal('fetch', async (input: string | URL, init?: RequestInit) => {
	const request = new Request(new URL(input, 'http://localhost'), init);
	const text = await request.text();
	calls.push({
		path: new URL(request.url).pathname,
		method: request.method,
		body: text ? JSON.parse(text) : undefined
	});
	return new Response(JSON.stringify({ ok: true }), {
		headers: { 'content-type': 'application/json' }
	});
});

const { adminAuthClient } = await import('@aphexcms/auth/client');

beforeEach(() => {
	calls.length = 0;
});

afterAll(() => {
	vi.unstubAllGlobals();
});

describe('adminAuthClient', () => {
	it.each([
		[
			'signIn',
			() => adminAuthClient.signIn?.({ email: 'a@b.co', password: 'pw' }),
			'/api/auth/sign-in/email',
			{ email: 'a@b.co', password: 'pw' }
		],
		[
			'signUp',
			() => adminAuthClient.signUp?.({ email: 'a@b.co', password: 'pw', name: 'A' }),
			'/api/auth/sign-up/email',
			{ email: 'a@b.co', password: 'pw', name: 'A' }
		],
		[
			'sendVerificationEmail',
			() => adminAuthClient.sendVerificationEmail?.({ email: 'a@b.co' }),
			'/api/auth/send-verification-email',
			{ email: 'a@b.co' }
		],
		[
			'changePassword',
			() => adminAuthClient.changePassword({ currentPassword: 'a', newPassword: 'b' }),
			'/api/auth/change-password',
			{ currentPassword: 'a', newPassword: 'b' }
		],
		[
			'deleteUser',
			() => adminAuthClient.deleteUser({ password: 'pw' }),
			'/api/auth/delete-user',
			{ password: 'pw' }
		],
		[
			'twoFactor.enable',
			() => adminAuthClient.twoFactor.enable({ password: 'pw' }),
			'/api/auth/two-factor/enable',
			{ password: 'pw' }
		],
		[
			'twoFactor.verifyTotp',
			() => adminAuthClient.twoFactor.verifyTotp({ code: '123456' }),
			'/api/auth/two-factor/verify-totp',
			{ code: '123456' }
		],
		[
			'twoFactor.disable',
			() => adminAuthClient.twoFactor.disable({ password: 'pw' }),
			'/api/auth/two-factor/disable',
			{ password: 'pw' }
		],
		[
			'twoFactor.generateBackupCodes',
			() => adminAuthClient.twoFactor.generateBackupCodes({ password: 'pw' }),
			'/api/auth/two-factor/generate-backup-codes',
			{ password: 'pw' }
		],
		[
			'twoFactor.verifyOtp',
			() => adminAuthClient.twoFactor.verifyOtp?.({ code: '123456' }),
			'/api/auth/two-factor/verify-otp',
			{ code: '123456' }
		],
		[
			'twoFactor.verifyBackupCode',
			() => adminAuthClient.twoFactor.verifyBackupCode?.({ code: 'abc' }),
			'/api/auth/two-factor/verify-backup-code',
			{ code: 'abc' }
		]
	])('%s posts to its endpoint', async (_name, call, path, body) => {
		await call();
		expect(calls).toContainEqual({ path, method: 'POST', body });
	});

	it('signOut and sendOtp post to their endpoints', async () => {
		await adminAuthClient.signOut?.();
		await adminAuthClient.twoFactor.sendOtp?.();
		expect(calls.map((call) => call.path)).toEqual(
			expect.arrayContaining(['/api/auth/sign-out', '/api/auth/two-factor/send-otp'])
		);
	});

	it('recognises the two-factor challenge and nothing else', () => {
		const isChallenge = adminAuthClient.isTwoFactorRedirect;
		expect(isChallenge?.({ twoFactorRedirect: true })).toBe(true);
		expect(isChallenge?.({ twoFactorRedirect: false })).toBe(false);
		expect(isChallenge?.({ user: {} })).toBe(false);
		expect(isChallenge?.(null)).toBe(false);
	});
});
