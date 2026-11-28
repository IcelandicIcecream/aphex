/**
 * How a user signs in, as Account settings reads it: a password ('credential'), or
 * only a social provider, whose user is offered "Set a password" instead.
 */
import { describe, expect, it } from 'vitest';
import { createAphexAuth } from '@aphexcms/auth';
import { db, drizzleDb, dbDialect } from './helpers/db';

const ORIGIN = 'http://localhost:5173';

describe('signInMethods', () => {
	const { auth, provider } = createAphexAuth({
		database: db,
		drizzleDb,
		dialect: dbDialect,
		secret: 'sign-in-methods-test-secret-at-least-32-chars',
		baseURL: ORIGIN,
		authPagesPath: '/admin',
		options: { inviteOnly: false },
		betterAuth: (base) => ({ ...base, rateLimit: { enabled: false } })
	});

	it('names a password for an email sign-up, and only Google for a Google one', async () => {
		const email = `methods-${crypto.randomUUID()}@example.com`;
		const response = await auth.handler(
			new Request(`${ORIGIN}/api/auth/sign-up/email`, {
				method: 'POST',
				headers: { 'content-type': 'application/json', origin: ORIGIN },
				body: JSON.stringify({ email, password: 'a-good-password', name: 'Sam' })
			})
		);
		expect(response.status).toBe(200);
		const context = await auth.$context;
		const withPassword = await context.internalAdapter.findUserByEmail(email);
		expect(await provider.signInMethods?.(withPassword!.user.id)).toEqual(['credential']);

		const googleOnly = await context.internalAdapter.createUser({
			email: `google-${crypto.randomUUID()}@example.com`,
			name: 'Alex',
			emailVerified: true
		});
		await context.internalAdapter.createAccount({
			userId: googleOnly.id,
			providerId: 'google',
			accountId: `g-${crypto.randomUUID()}`
		});
		expect(await provider.signInMethods?.(googleOnly.id)).toEqual(['google']);
	});
});
