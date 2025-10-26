// apps/studio/src/lib/server/auth/better-auth/instance.ts

import { BETTER_AUTH_URL, BETTER_AUTH_SECRET } from '$env/static/private';
import { betterAuth } from 'better-auth';
import { apiKey } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import type { DatabaseAdapter } from '@aphex/cms-core/server';
import type { EmailAdapter } from '@aphex/cms-core/server';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { emailConfig } from '../../email';

// Dev-only storage for password reset URLs
export let latestPasswordResetUrl: string | null = null;

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
				console.log(`[Better Auth Hook]: Created user profile for ${ctx.context.user.id}`);
			} catch (error) {
				console.error('[Better Auth Hook]: Error creating user profile:', error);
			}
		}

		// Sync: Clean up CMS data when user is deleted
		if (ctx.path === '/user/delete-user' && ctx.context.user) {
			console.log(`[Auth Hook]: Deletion condition met for user: ${ctx.context.user.id}`);
			try {
				await db.deleteUserProfile(ctx.context.user.id);
				console.log(`[Auth Hook]: Successfully deleted user profile for ${ctx.context.user.id}`);
			} catch (error) {
				console.error('[Auth Hook]: Error deleting user profile:', error);
			}
		}
	});

	return betterAuth({
		baseURL: BETTER_AUTH_URL,
		secret: BETTER_AUTH_SECRET,
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
				const baseUrl = BETTER_AUTH_URL || 'http://localhost:5173';
				const resetUrl = `${baseUrl}/reset-password/${token}`;
				
				console.log('\n========================================');
				console.log('🔐 PASSWORD RESET REQUEST');
				console.log('========================================');
				console.log('User:', user.email);
				console.log('Better Auth URL:', url);
				console.log('Constructed Reset URL:', resetUrl);
				console.log('Token:', token);
				console.log('========================================\n');

				// Store URL for dev purposes
				latestPasswordResetUrl = resetUrl;

				// Send password reset email if adapter is configured
				if (emailAdapter) {
					try {
						const result = await emailAdapter.send({
							from: emailConfig.from,
							to: user.email,
							subject: emailConfig.passwordReset.subject,
							html: emailConfig.passwordReset.getHtml(user.name || user.email, resetUrl),
							text: emailConfig.passwordReset.getText(resetUrl)
						});

						if (result.error) {
							console.error('Failed to send password reset email:', result.error);
						} else {
							console.log('Password reset email sent successfully:', result.id);
						}
					} catch (error) {
						console.error('Error sending password reset email:', error);
					}
				} else {
					console.warn('Email adapter not configured. Password reset email not sent.');
				}
			}
		},
		emailVerification: {
			enabled: false,
			verifyEmailPath: '/verify-email', // Path for email verification
			sendVerificationEmail: async ({ user, url, token }) => {
				console.log('\n========================================');
				console.log('📧 EMAIL VERIFICATION REQUEST');
				console.log('========================================');
				console.log('User:', user.email);
				console.log('Verification URL:', url);
				console.log('Token:', token);
				console.log('========================================\n');

				// Send verification email if adapter is configured
				if (emailAdapter) {
					try {
						const result = await emailAdapter.send({
							from: emailConfig.from,
							to: user.email,
							subject: emailConfig.emailVerification.subject,
							html: emailConfig.emailVerification.getHtml(user.name || user.email, url),
							text: emailConfig.emailVerification.getText(url)
						});

						if (result.error) {
							console.error('Failed to send verification email:', result.error);
						} else {
							console.log('Verification email sent successfully:', result.id);
						}
					} catch (error) {
						console.error('Error sending verification email:', error);
					}
				} else {
					console.warn('Email adapter not configured. Verification email not sent.');
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
