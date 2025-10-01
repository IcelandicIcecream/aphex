// Better Auth instance with API Key plugin
import { betterAuth } from 'better-auth';
import { apiKey } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from "better-auth/api";
import { db } from '$lib/server/db';
import { userProfiles } from '$lib/server/db/schema';
import { apikey } from '$lib/server/db/auth-schema';
import { eq } from 'drizzle-orm';
import type { AuthProvider, SessionAuth, ApiKeyAuth } from '@aphex/cms-core/server';

// Initialize Better Auth with Drizzle adapter and API Key plugin
export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg' // PostgreSQL
	}),
	emailAndPassword: {
		enabled: true
	},
	plugins: [
		apiKey({
			// API key configuration
			apiKeyHeaders: ['x-api-key'], // Header to check for API keys
			rateLimit: {
				enabled: true,
				timeWindow: 1000 * 60 * 60 * 24, // 1 day
				maxRequests: 10000 // 10k requests per day
			},
			enableMetadata: true,
		})
	],
	hooks: {
		after: createAuthMiddleware(async (ctx) => {
			// Sync: Create CMS user profile when user signs up
			if (ctx.path === '/sign-up/email' && ctx.context.user) {
				await db.insert(userProfiles).values({
					userId: ctx.context.user.id,
					role: 'editor', // Default role
					preferences: {}
				});
			}

			// Sync: Clean up CMS data when user is deleted
			if (ctx.path === '/user/delete-user' && ctx.context.user) {
				// Delete user profile (cascade will not delete documents/assets due to no FK)
				await db.delete(userProfiles).where(eq(userProfiles.userId, ctx.context.user.id));

				// TODO: Handle orphaned documents/assets
				// Option 1: Reassign to admin
				// Option 2: Soft delete (add deletedAt field)
				// Option 3: Prevent deletion if user has content
			}
		})
	}
});

// Helper: Ensure user profile exists (lazy sync fallback)
async function ensureUserProfile(userId: string): Promise<void> {
	const existing = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.userId, userId)
	});

	if (!existing) {
		// Lazy create if sync failed
		await db.insert(userProfiles).values({
			userId,
			role: 'editor',
			preferences: {}
		});
	}
}

// Adapter to map Better Auth to CMS AuthProvider interface
export const authProvider: AuthProvider = {
	async getSession(request) {
		try {
			const session = await auth.api.getSession({ headers: request.headers });
			if (!session) return null;

			// Ensure user profile exists (lazy sync)
			await ensureUserProfile(session.user.id);

			return {
				type: 'session',
				user: {
					id: session.user.id,
					email: session.user.email,
					name: session.user.name ?? undefined,
					image: session.user.image ?? undefined
				},
				session: {
					id: session.session.id,
					expiresAt: session.session.expiresAt
				}
			} satisfies SessionAuth;
		} catch {
			return null;
		}
	},

	async requireSession(request) {
		const session = await this.getSession(request);
		if (!session) {
			throw new Error('Unauthorized: Session required');
		}
		return session;
	},

	async validateApiKey(request) {
		try {
			// Get API key from header
			const apiKeyHeader = request.headers.get('x-api-key');
			if (!apiKeyHeader) return null;

			// Verify with Better Auth
			const result = await auth.api.verifyApiKey({
				body: {
					key: apiKeyHeader
				}
			});

			if (!result.valid || !result.key) return null;

			// Fetch the API key from database to get metadata (permissions)
			const apiKeyRecord = await db.query.apikey.findFirst({
				where: eq(apikey.id, result.key.id)
			});

			if (!apiKeyRecord) return null;

			// Extract permissions from metadata
			const metadata = typeof apiKeyRecord.metadata === 'string'
				? JSON.parse(apiKeyRecord.metadata)
				: (apiKeyRecord.metadata as any) || {};
			const permissions = metadata.permissions || ['read', 'write'];

			return {
				type: 'api_key',
				keyId: result.key.id,
				name: result.key.name || 'Unnamed Key',
				permissions,
				lastUsedAt: result.key.lastRequest || undefined
			} satisfies ApiKeyAuth;
		} catch {
			return null;
		}
	},

	async requireApiKey(request, permission) {
		const apiKeyAuth = await this.validateApiKey(request);
		if (!apiKeyAuth) {
			throw new Error('Unauthorized: Valid API key required');
		}

		// Check permission if specified
		if (permission && !apiKeyAuth.permissions.includes(permission)) {
			throw new Error(`Forbidden: API key missing ${permission} permission`);
		}

		return apiKeyAuth;
	}
};
