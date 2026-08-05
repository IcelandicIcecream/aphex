import { betterAuth } from 'better-auth';
import { apiKey } from '@better-auth/api-key';
import { twoFactor as twoFactorPlugin } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { cmsLogger } from '@aphexcms/cms-core';
import {
	assertSignUpAllowed,
	SignUpBlockedError,
	type CacheAdapter
} from '@aphexcms/cms-core/server';
import type { AphexAuthConfig } from './types.js';

/** Per-address cooldown between verification emails, in seconds. */
const VERIFICATION_EMAIL_COOLDOWN = 60;

function buildCacheStorage(cache: CacheAdapter) {
	return {
		storage: 'secondary-storage' as const,
		fallbackToDatabase: true,
		customStorage: {
			get: async (key: string) => cache.get(key),
			set: async (key: string, value: string, ttl?: number) => cache.set(key, value, ttl),
			delete: async (key: string) => cache.delete(key)
		}
	};
}

/**
 * Builds the better-auth instance from an app's adapters.
 *
 * Everything the studio used to configure by hand lives here — session cookie
 * cache, API-key plugin, rate limits, the CMS user-profile sync, and the
 * password-reset / verification email flows.
 */
export function createAuthInstance(config: AphexAuthConfig) {
	const {
		database: db,
		drizzleDb,
		dialect,
		building = false,
		emailAdapter,
		email: emailConfig,
		cache,
		socialProviders,
		twoFactor,
		appName,
		betterAuth: extend
	} = config;

	const { requireEmailVerification = false, inviteOnly = true } = config.options ?? {};

	// betterAuth() throws without these, and SvelteKit's analyse pass imports every
	// server module without ever serving a request. Placeholders keep the build
	// green; at runtime `building` is false and a missing secret fails loudly.
	const secret = config.secret || (building ? 'build-placeholder-secret' : undefined);
	const baseURL = config.baseURL || (building ? 'http://localhost:3000' : undefined);
	const trustedOrigins = config.trustedOrigins?.length
		? config.trustedOrigins
		: baseURL
			? [baseURL]
			: [];

	/** Sends one auth email, tolerating an unconfigured adapter. */
	async function sendAuthEmail(
		template: 'passwordReset' | 'emailVerification',
		to: string,
		userName: string,
		url: string
	) {
		if (!emailAdapter || !emailConfig) {
			cmsLogger.warn('[Auth]', `Email adapter not configured. ${template} email not sent.`);
			return;
		}
		try {
			const { subject, render } = emailConfig[template];
			const { html, text } = await render(userName, url);
			const result = await emailAdapter.send({ from: emailConfig.from, to, subject, html, text });
			if (result.error) {
				cmsLogger.error('[Auth]', `Failed to send ${template} email:`, result.error);
			} else {
				cmsLogger.info('[Auth]', `${template} email sent`);
			}
		} catch (error) {
			cmsLogger.error('[Auth]', `Error sending ${template} email:`, error);
		}
	}

	// Keeps the CMS's own user tables in step with better-auth's.
	const userSyncHooks = createAuthMiddleware(async (ctx) => {
		if (ctx.path === '/sign-up/email' && ctx.context.user) {
			try {
				await db.createUserProfile({ userId: ctx.context.user.id, role: 'editor' });
				cmsLogger.info('[Auth]', 'Created user profile');
			} catch (error) {
				cmsLogger.error('[Auth]', 'Error creating user profile:', error);
			}
		}

		if (ctx.path === '/user/delete-user' && ctx.context.user) {
			try {
				await db.deleteUserProfile(ctx.context.user.id);
				cmsLogger.info('[Auth]', 'Deleted user profile');
			} catch (error) {
				cmsLogger.error('[Auth]', 'Error deleting user profile:', error);
			}
		}
	});

	// better-auth reads `appName` as the default TOTP issuer, so it's what shows up
	// beside the code in the user's authenticator app.
	const twoFactorOptions = twoFactor === true ? {} : twoFactor || undefined;

	const base = {
		baseURL,
		secret,
		trustedOrigins,
		...(appName ? { appName } : {}),
		session: {
			// Verifies the cookie signature without a DB hit. The short maxAge keeps
			// revocation lag tight for role/membership changes, which the per-request
			// RBAC chain re-reads on top of this.
			cookieCache: { enabled: true, maxAge: 60 }
		},
		advanced: {
			backgroundTasks: {
				handler: (task: unknown) => {
					Promise.resolve(typeof task === 'function' ? task() : task).catch(() => {});
				}
			}
		},
		database: drizzleAdapter(drizzleDb as never, { provider: dialect }),
		databaseHooks: {
			user: {
				create: {
					// The rule itself lives in cms-core so every AuthProvider enforces the
					// same one. This hook only supplies Better Auth's lifecycle and error
					// type — running *before* the row is written, so a direct POST to the
					// sign-up endpoint is rejected exactly like a form submission.
					before: async (user: { email?: string }) => {
						try {
							await assertSignUpAllowed({ db, email: user.email, inviteOnly });
						} catch (error) {
							if (error instanceof SignUpBlockedError) {
								throw new APIError('FORBIDDEN', { message: error.message });
							}
							throw error;
						}

						return { data: user };
					}
				}
			}
		},
		emailAndPassword: {
			enabled: true,
			requireEmailVerification,
			revokeSessionsOnPasswordReset: true,
			sendResetPassword: async ({
				user,
				token
			}: {
				user: { name?: string; email: string };
				token: string;
			}) => {
				// better-auth's default link is /reset-password?token=…; the apps route
				// the token as a path segment instead.
				const resetUrl = `${baseURL || 'http://localhost:5173'}/reset-password/${token}`;
				await sendAuthEmail('passwordReset', user.email, user.name || user.email, resetUrl);
			}
		},
		emailVerification: {
			enabled: true,
			sendOnSignUp: requireEmailVerification,
			autoSignInAfterVerification: true,
			verifyEmailPath: '/verify-email',
			sendVerificationEmail: async ({
				user,
				url
			}: {
				user: { name?: string; email: string };
				url: string;
			}) => {
				// Per-address throttle. The IP rate limit below stops scripted abuse;
				// this caps the damage once an attacker rotates IPs, so a victim's
				// inbox (and the email quota) can't be flooded.
				if (cache) {
					const throttleKey = `verify-email-throttle:${user.email.toLowerCase()}`;
					if (await cache.get<number>(throttleKey)) {
						cmsLogger.info('[Auth]', `Skipping verification email — throttled (${user.email})`);
						return;
					}
					await cache.set(throttleKey, Date.now(), VERIFICATION_EMAIL_COOLDOWN);
				}
				await sendAuthEmail('emailVerification', user.email, user.name || user.email, url);
			}
		},
		rateLimit: {
			// better-auth only rate-limits in production by default; enabled explicitly
			// so the per-endpoint rules below also apply in dev.
			enabled: true,
			window: 60,
			max: 100,
			customRules: {
				'/send-verification-email': { window: 60, max: 2 },
				'/forget-password': { window: 60, max: 2 }
			}
		},
		...(socialProviders ? { socialProviders } : {}),
		hooks: { after: userSyncHooks }
	};

	const apiKeyPlugin = apiKey({
		apiKeyHeaders: ['x-api-key'],
		deferUpdates: true,
		rateLimit: { enabled: true, timeWindow: 1000 * 60 * 60 * 24, maxRequests: 10000 },
		enableMetadata: true,
		...(cache ? buildCacheStorage(cache) : {})
	});

	// One call with a fixed plugin tuple, deliberately. better-auth derives the
	// whole `auth.api.*` surface from the exact tuple it's given: a conditional
	// spread widens it to `(A | B)[]`, and branching into two calls makes the
	// return type a union — both erase the typed endpoints, so `deleteApiKey()`
	// degrades to a bare `Response` and callers lose `.success`.
	//
	// So the 2FA plugin is always registered, and `config.twoFactor` decides its
	// options rather than its presence. Mounting /two-factor/* costs nothing on
	// its own: the behaviour that needs a verification screen only engages for a
	// user who has *enabled* 2FA, which requires the app to have built that UI to
	// call `twoFactor.enable` in the first place.
	const options = {
		...base,
		plugins: [apiKeyPlugin, twoFactorPlugin(twoFactorOptions ?? {})]
	};

	return betterAuth(extend ? (extend(options) as typeof options) : options);
}

export type AphexAuthInstance = ReturnType<typeof createAuthInstance>;
