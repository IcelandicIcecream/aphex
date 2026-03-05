// apps/studio/src/lib/server/auth/better-auth/instance.ts

import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth';
import { apiKey } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import type { DatabaseAdapter } from '@aphexcms/cms-core/server';
import type { EmailAdapter } from '@aphexcms/cms-core/server';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { cmsLogger } from '@aphexcms/cms-core';
import { emailConfig } from '../../email';

// Support both AUTH_* (preferred) and BETTER_AUTH_* (backwards-compatible)
const authSecret = env.AUTH_SECRET || env.BETTER_AUTH_SECRET;
const authUrl = env.AUTH_URL || env.BETTER_AUTH_URL;

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
		// Better Auth's internal adapter needs the raw Drizzle client.
		database: drizzleAdapter(drizzleDb, {
			provider: 'pg'
		}),
		emailAndPassword: {
			enabled: true,
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
		plugins: [
			apiKey({
				apiKeyHeaders: ['x-api-key'],
				rateLimit: {
					enabled: true,
					timeWindow: 1000 * 60 * 60 * 24,
					maxRequests: 10000
				},
				enableMetadata: true
			})
		],
		hooks: {
			after: userSyncHooks
		}
	});
}
