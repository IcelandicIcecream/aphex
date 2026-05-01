// apps/studio/src/lib/server/auth/better-auth/instance.ts

import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import { betterAuth } from 'better-auth';
import { apiKey } from '@better-auth/api-key';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import type { DatabaseAdapter } from '@aphexcms/cms-core/server';
import type { EmailAdapter } from '@aphexcms/cms-core/server';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { cmsLogger } from '@aphexcms/cms-core';
import { emailConfig } from '../../email';
import { cacheAdapter } from '../../cache';

// Support both AUTH_* (preferred) and BETTER_AUTH_* (backwards-compatible).
// During SvelteKit's build/analyse pass, fall back to placeholders so
// betterAuth() doesn't throw — the analyse worker imports server modules
// but never serves requests. Real values are required at runtime.
const authSecret =
	env.AUTH_SECRET || env.BETTER_AUTH_SECRET || (building ? 'build-placeholder-secret' : undefined);
const authUrl =
	env.AUTH_URL || env.BETTER_AUTH_URL || (building ? 'http://localhost:3000' : undefined);

// CSV of origins permitted for cross-origin auth requests. Better Auth uses
// this for CSRF/origin checks; without it, cookie-auth API mutations are
// reachable from any site a logged-in admin visits.
const trustedOrigins = (env.AUTH_TRUSTED_ORIGINS || authUrl || '')
	.split(',')
	.map((o) => o.trim())
	.filter(Boolean);

// This function creates the Better Auth instance, injecting the necessary dependencies.
export function createAuthInstance(
	db: DatabaseAdapter,
	drizzleDb: PostgresJsDatabase<any>,
	emailAdapter?: EmailAdapter | null
) {
	const userSyncHooks = createAuthMiddleware(async (ctx) => {
		// Sync: Create CMS user profile when user signs up
		// Note: Invitation processing is handled in hooks.server.ts
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
				handler: (task) => {
					Promise.resolve(typeof task === 'function' ? task() : task).catch(() => {});
				}
			}
		},
		// Better Auth's internal adapter needs the raw Drizzle client.
		database: drizzleAdapter(drizzleDb, {
			provider: 'pg'
		}),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
			sendResetPassword: async ({ user, url, token }) => {
				// Manually construct the correct URL format
				// Better Auth URL: http://localhost:5173/reset-password?token=xxx&callbackURL=...
				// We want: http://localhost:5173/reset-password/xxx
				const baseUrl = authUrl || 'http://localhost:5173';
				const resetUrl = `${baseUrl}/reset-password/${token}`;

				// Send password reset email if adapter is configured
				if (emailAdapter && emailConfig) {
					try {
						const { html, text } = await emailConfig.passwordReset.render(
							user.name || user.email,
							resetUrl
						);
						const result = await emailAdapter.send({
							from: emailConfig.from,
							to: user.email,
							subject: emailConfig.passwordReset.subject,
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
					cmsLogger.warn('[Auth]', 'Email adapter not configured. Password reset email not sent.');
				}
			}
		},
		emailVerification: {
			enabled: true,
			sendOnSignUp: true,
			autoSignInAfterVerification: true,
			verifyEmailPath: '/verify-email',
			sendVerificationEmail: async ({ user, url, token }) => {
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
						cmsLogger.info(
							'[Auth]',
							`Skipping verification email — throttled (${user.email})`
						);
						return;
					}
					await cacheAdapter.set(throttleKey, Date.now(), VERIFICATION_EMAIL_COOLDOWN);
				}

				// Send verification email if adapter is configured
				if (emailAdapter && emailConfig) {
					try {
						const { html, text } = await emailConfig.emailVerification.render(
							user.name || user.email,
							url
						);
						const result = await emailAdapter.send({
							from: emailConfig.from,
							to: user.email,
							subject: emailConfig.emailVerification.subject,
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
					cmsLogger.warn('[Auth]', 'Email adapter not configured. Verification email not sent.');
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
				...(cacheAdapter
					? {
							storage: 'secondary-storage' as const,
							fallbackToDatabase: true,
							customStorage: {
								get: async (key: string) => cacheAdapter.get(key),
								set: async (key: string, value: string, ttl?: number) =>
									cacheAdapter.set(key, value, ttl),
								delete: async (key: string) => cacheAdapter.delete(key)
							}
						}
					: {})
			})
		],
		hooks: {
			after: userSyncHooks
		}
	});
}
