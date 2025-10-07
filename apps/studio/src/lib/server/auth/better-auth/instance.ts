// apps/studio/src/lib/server/auth/better-auth/instance.ts

import { betterAuth } from 'better-auth';
import { apiKey } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import type { DatabaseAdapter } from '@aphex/cms-core/server';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// This function creates the Better Auth instance, injecting the necessary dependencies.
export function createAuthInstance(db: DatabaseAdapter, drizzleDb: PostgresJsDatabase<any>) {
	const userSyncHooks = createAuthMiddleware(async (ctx) => {
		console.log(`[Auth Hook]: Middleware triggered for path: ${ctx.path}`);

		// Sync: Create CMS user profile when user signs up
		if (ctx.path === '/sign-up/email' && ctx.context.user) {
			console.log(`[Auth Hook]: Sign-up condition met for user: ${ctx.context.user.id}`);
			try {
				await db.createUserProfile({
					userId: ctx.context.user.id,
					role: 'editor' // Default role
				});
				console.log(`[Auth Hook]: Successfully created user profile for ${ctx.context.user.id}`);
			} catch (error) {
				console.error('[Auth Hook]: Error creating user profile:', error);
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
			enabled: true
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
