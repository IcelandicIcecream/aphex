// apps/studio/src/lib/server/auth/better-auth/instance.ts

import { betterAuth } from 'better-auth';
import { apiKey } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import type { DatabaseAdapter } from '@aphex/cms-core/server';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// Dev-only storage for password reset URLs
export let latestPasswordResetUrl: string | null = null;

// This function creates the Better Auth instance, injecting the necessary dependencies.
export function createAuthInstance(db: DatabaseAdapter, drizzleDb: PostgresJsDatabase<any>) {
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
		// Better Auth's internal adapter needs the raw Drizzle client.
		database: drizzleAdapter(drizzleDb, {
			provider: 'pg'
		}),
		emailAndPassword: {
			enabled: true,
			sendResetPassword: async ({ user, url, token }, request) => {
				console.log('\n========================================');
				console.log('🔐 PASSWORD RESET REQUEST');
				console.log('========================================');
				console.log('User:', user.email);
				console.log('Reset URL:', url);
				console.log('Token:', token);
				console.log('========================================\n');

				// Store URL for dev purposes
				latestPasswordResetUrl = url;

				// TODO: In production, send email here
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
