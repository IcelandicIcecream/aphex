import { db } from '../db';
import { auth } from './index';
import { apikey } from '../db/auth-schema';
import { eq } from 'drizzle-orm';
import type { SessionAuth } from '@aphex/cms-core/server';

// This is the new AuthService that centralizes all auth-related server operations.
// It's designed to be the single point of interaction for any auth tasks in the app layer.

export interface ApiKey {
	id: string;
	name: string | null;
	[key: string]: any;
}

export interface ApiKeyWithSecret extends ApiKey {
	key: string;
}

export interface CreateApiKeyData {
	name: string;
	permissions: string[];
	expiresInDays?: number;
}

export interface AuthService {
	// Session management
	getSession(request: Request): Promise<SessionAuth | null>;
	requireSession(request: Request): Promise<SessionAuth>;

	// API Key management
	listApiKeys(userId: string): Promise<ApiKey[]>;
	createApiKey(userId: string, data: CreateApiKeyData): Promise<ApiKeyWithSecret>;
	deleteApiKey(userId: string, keyId: string): Promise<boolean>;
}

export const authService: AuthService = {
	// For now, we delegate session management to the existing authProvider.
	// In the future, this logic could be fully merged into the service.
	async getSession(request: Request): Promise<SessionAuth | null> {
		const { authProvider } = await import('./index');
		return authProvider.getSession(request);
	},

	async requireSession(request: Request): Promise<SessionAuth> {
		const { authProvider } = await import('./index');
		return authProvider.requireSession(request);
	},

	async listApiKeys(userId: string): Promise<ApiKey[]> {
		const userApiKeys = await db.query.apikey.findMany({
			where: eq(apikey.userId, userId),
			columns: {
				id: true,
				name: true,
				metadata: true,
				expiresAt: true,
				lastRequest: true,
				createdAt: true
			},
			orderBy: (apikey, { desc }) => [desc(apikey.createdAt)]
		});

		return userApiKeys.map((key) => {
			const metadata =
				typeof key.metadata === 'string' ? JSON.parse(key.metadata) : (key.metadata as any) || {};
			return {
				...key,
				permissions: metadata.permissions || []
			};
		});
	},

	async createApiKey(userId: string, data: CreateApiKeyData): Promise<ApiKeyWithSecret> {
		const expiresIn = data.expiresInDays ? data.expiresInDays * 24 * 60 * 60 : undefined;

		const result = await auth.api.createApiKey({
			body: {
				userId: userId,
				name: data.name,
				expiresIn,
				metadata: { permissions: data.permissions }
			}
		});

		if (!result || !result.id) {
			throw new Error('Failed to create API key');
		}

		return {
			id: result.id,
			name: result.name,
			key: result.key, // Only available on creation
			permissions: data.permissions,
			expiresAt: result.expiresAt,
			createdAt: result.createdAt
		};
	},

	async deleteApiKey(userId: string, keyId: string): Promise<boolean> {
		// Logic for this will be extracted from the DELETE endpoint later.
		// For now, just a placeholder.
		console.log(`Deleting key ${keyId} for user ${userId}`);
		return Promise.resolve(true);
	}
};
