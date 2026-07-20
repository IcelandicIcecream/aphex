// @aphexcms/auth — the hardened Better Auth instance.
//
// This is the security-critical baseline that used to live in every app's
// better-auth/instance.ts. It now ships from the package so hardening fixes
// (rate-limit rules, throttles, CSRF origins, cookie-cache, api-key config)
// reach apps through a version bump instead of a hand-edit.

import { betterAuth } from 'better-auth';
import { apiKey } from '@better-auth/api-key';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import { cmsLogger } from '@aphexcms/cms-core';
import type { CacheAdapter } from '@aphexcms/cms-core/server';
import type { AphexAuthDeps } from './types';

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
 * Build the hardened Better Auth instance. All app-specific inputs are injected
 * via `deps`; the security-relevant configuration is owned here.
 */
export function createAuthInstance(deps: AphexAuthDeps) {
	const {
		db,
		drizzleDb,
		provider = 'pg',
		env,
		building = false,
		emailAdapter,
		emailRenderers,
		cacheAdapter,
		options = { requireEmailVerification: false },
		betterAuth: ext
	} = deps;

	const { requireEmailVerification } = options;

	// Support both AUTH_* (preferred) and BETTER_AUTH_* (backwards-compatible).
	// During SvelteKit's build/analyze pass, fall back to placeholders so
	// betterAuth() doesn't throw — the analyze worker imports server modules
	// but never serves requests. Real values are required at runtime.
	const authSecret =
		env.AUTH_SECRET ||
		env.BETTER_AUTH_SECRET ||
		(building ? 'build-placeholder-secret' : undefined);
	const authUrl =
		env.AUTH_URL || env.BETTER_AUTH_URL || (building ? 'http://localhost:3000' : undefined);

	// CSV of origins permitted for cross-origin auth requests. Better Auth uses
	// this for CSRF/origin checks; without it, cookie-auth API mutations are
	// reachable from any site a logged-in admin visits.
	const trustedOrigins = (env.AUTH_TRUSTED_ORIGINS || authUrl || '')
		.split(',')
		.map((o) => o.trim())
		.filter(Boolean);

	const userSyncHooks = createAuthMiddleware(async (ctx) => {
		// Sync: Create CMS user profile when user signs up
		// Note: Invitation processing is handled in the app's hooks.server.ts
		if (ctx.path === '/sign-up/email' && ctx.context.user) {
			try {
				await db.createUserProfile({
					userId: ctx.context.user.id,
					role: 'editor' // Default role
				});
				cmsLogger.info('[Auth]', 'Created user profile');
			} catch (error) {
				cmsLogger.error('[Auth]', 'Error creating user profile:', error);
			}
		}

		// Sync: Clean up CMS data when user is deleted
		if (ctx.path === '/user/delete-user' && ctx.context.user) {
			try {
				await db.deleteUserProfile(ctx.context.user.id);
				cmsLogger.info('[Auth]', 'Deleted user profile');
			} catch (error) {
				cmsLogger.error('[Auth]', 'Error deleting user profile:', error);
			}
		}
	});

	return betterAuth({
		// App-supplied, non-critical overrides are spread first so the hardened
		// keys below always win. App extensions belong in `betterAuth.plugins`.
		...(ext?.options ?? {}),
		baseURL: authUrl,
		secret: authSecret,
		trustedOrigins,
		session: {
			// Validates the session cookie's signature without a DB hit. Short
			// maxAge keeps revocation lag tight for role/membership changes,
			// which the per-request RBAC chain re-reads on top of this.
			cookieCache: {
				enabled: true,
				maxAge: 60
			}
		},
		advanced: {
			backgroundTasks: {
				handler: (task: unknown) => {
					Promise.resolve(typeof task === 'function' ? task() : task).catch(() => {});
				}
			}
		},
		// Better Auth's internal adapter needs the raw Drizzle client.
		database: drizzleAdapter(drizzleDb, {
			provider
		}),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification,
			revokeSessionsOnPasswordReset: true,
			sendResetPassword: async ({ user, token }) => {
				// Manually construct the correct URL format.
				// We want: {baseUrl}/reset-password/{token}
				const baseUrl = authUrl || 'http://localhost:5173';
				const resetUrl = `${baseUrl}/reset-password/${token}`;

				// Send password reset email if renderers + transport are configured
				if (emailAdapter && emailRenderers) {
					try {
						const { html, text } = await emailRenderers.passwordReset.render(
							user.name || user.email,
							resetUrl
						);
						const result = await emailAdapter.send({
							from: emailRenderers.from,
							to: user.email,
							subject: emailRenderers.passwordReset.subject,
							html,
							text
						});

						if (result.error) {
							cmsLogger.error('[Auth]', 'Failed to send password reset email:', result.error);
						} else {
							cmsLogger.info('[Auth]', 'Password reset email sent');
						}
					} catch (error) {
						cmsLogger.error('[Auth]', 'Error sending password reset email:', error);
					}
				} else {
					cmsLogger.warn('[Auth]', 'Email not configured. Password reset email not sent.');
				}
			}
		},
		emailVerification: {
			enabled: true,
			sendOnSignUp: requireEmailVerification,
			autoSignInAfterVerification: true,
			verifyEmailPath: '/verify-email',
			sendVerificationEmail: async ({ user, url }) => {
				// Per-email throttle: even if a caller bypasses the IP rate limit
				// (different IP, different session), refuse to send a fresh
				// verification email to the same address within VERIFICATION_EMAIL_COOLDOWN
				// seconds. This caps the blast radius of someone trying to flood a
				// victim's inbox or burn through the email provider's quota.
				const VERIFICATION_EMAIL_COOLDOWN = 60;
				if (cacheAdapter) {
					const throttleKey = `verify-email-throttle:${user.email.toLowerCase()}`;
					const recent = await cacheAdapter.get<number>(throttleKey);
					if (recent) {
						cmsLogger.info('[Auth]', `Skipping verification email — throttled (${user.email})`);
						return;
					}
					await cacheAdapter.set(throttleKey, Date.now(), VERIFICATION_EMAIL_COOLDOWN);
				}

				// Send verification email if renderers + transport are configured
				if (emailAdapter && emailRenderers) {
					try {
						const { html, text } = await emailRenderers.emailVerification.render(
							user.name || user.email,
							url
						);
						const result = await emailAdapter.send({
							from: emailRenderers.from,
							to: user.email,
							subject: emailRenderers.emailVerification.subject,
							html,
							text
						});

						if (result.error) {
							cmsLogger.error('[Auth]', 'Failed to send verification email:', result.error);
						} else {
							cmsLogger.info('[Auth]', 'Verification email sent');
						}
					} catch (error) {
						cmsLogger.error('[Auth]', 'Error sending verification email:', error);
					}
				} else {
					cmsLogger.warn('[Auth]', 'Email not configured. Verification email not sent.');
				}
			}
		},
		rateLimit: {
			// Better Auth's default rate limit only kicks in for production. We
			// enable it explicitly so the per-endpoint rule below also applies in
			// dev — useful when testing the resend flow against mailpit.
			enabled: true,
			window: 60,
			max: 100,
			customRules: {
				// IP-scoped throttle for the resend-verification endpoint. Pairs
				// with the per-email throttle inside sendVerificationEmail above:
				// IP guard catches scripted abuse; per-email guard caps damage when
				// the attacker rotates IPs.
				'/send-verification-email': { window: 60, max: 2 },
				'/forget-password': { window: 60, max: 2 }
			}
		},
		plugins: [
			apiKey({
				apiKeyHeaders: ['x-api-key'],
				deferUpdates: true,
				rateLimit: {
					enabled: true,
					timeWindow: 1000 * 60 * 60 * 24,
					maxRequests: 10000
				},
				enableMetadata: true,
				...(cacheAdapter ? buildCacheStorage(cacheAdapter) : {})
			}),
			// App-supplied extensions (social login, 2FA, …) — additive; they
			// cannot remove the hardened api-key plugin above.
			...(ext?.plugins ?? [])
		],
		hooks: {
			after: userSyncHooks
		}
	});
}

/** The concrete Better Auth instance type produced by {@link createAuthInstance}. */
export type AphexAuth = ReturnType<typeof createAuthInstance>;
