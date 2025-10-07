import { auth } from './index.js';
import { apikey } from '../db/auth-schema';
import { eq } from 'drizzle-orm';
import type {
	SessionAuth,
	ApiKeyAuth,
	CMSUser,
	NewUserProfileData,
	DatabaseAdapter
} from '@aphex/cms-core/server';

// This is the new AuthService that centralizes all auth-related server operations.
// It uses dependency injection for the DatabaseAdapter, making it more testable and decoupled.

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
	getSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth | null>;
	requireSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth>;
	validateApiKey(request: Request, db: DatabaseAdapter): Promise<ApiKeyAuth | null>;
	requireApiKey(
		request: Request,
		db: DatabaseAdapter,
		permission?: 'read' | 'write'
	): Promise<ApiKeyAuth>;
	listApiKeys(db: DatabaseAdapter, userId: string): Promise<ApiKey[]>;
	createApiKey(userId: string, data: CreateApiKeyData): Promise<ApiKeyWithSecret>;
	deleteApiKey(userId: string, keyId: string): Promise<boolean>;
}

export const authService: AuthService = {
	async getSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth | null> {
		try {
			console.log('[AuthService]: getSession called.');
			// 1. Get the base user session from the auth provider
			const session = await auth.api.getSession({ headers: request.headers });
			if (!session) {
				console.log('[AuthService]: No active session found from auth provider.');
				return null;
			}
			console.log(`[AuthService]: Found session for user ${session.user.id}`);

			// 2. Get the corresponding CMS user profile from our database
			console.log(`[AuthService]: Checking for user profile for ${session.user.id}`);
			let userProfile = await db.findUserProfileById(session.user.id);

			// 3. If no profile exists, create one (lazy sync)
			if (!userProfile) {
				console.log(
					`[AuthService]: User profile not found for ${session.user.id}. Creating one now (lazy sync).`
				);
				const newUserProfile: NewUserProfileData = {
					userId: session.user.id,
					role: 'editor' // Default role
				};
				userProfile = await db.createUserProfile(newUserProfile);
				console.log(`[AuthService]: Successfully created user profile for ${session.user.id}`);
			}

			// 4. Combine the two into the final CMSUser object
			const cmsUser: CMSUser = {
				id: session.user.id,
				email: session.user.email,
				name: session.user.name ?? undefined,
				image: session.user.image ?? undefined,
				role: userProfile.role,
				preferences: userProfile.preferences
			};
			console.log(`[AuthService]: Successfully assembled CMSUser for ${session.user.id}`);

			// 5. Return the complete SessionAuth object
			return {
				type: 'session',
				user: cmsUser,
				session: {
					id: session.session.id,
					expiresAt: session.session.expiresAt
				}
			};
		} catch (error) {
			console.error('[AuthService]: Error in getSession:', error);
			return null;
		}
	},

	async requireSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth> {
		const session = await this.getSession(request, db);
		if (!session) {
			throw new Error('Unauthorized: Session required');
		}
		return session;
	},

	async validateApiKey(request: Request, db: DatabaseAdapter): Promise<ApiKeyAuth | null> {
		try {
			const apiKeyHeader = request.headers.get('x-api-key');
			if (!apiKeyHeader) return null;

			const result = await auth.api.verifyApiKey({ body: { key: apiKeyHeader } });
			if (!result.valid || !result.key) return null;

			// Note: This still queries a raw table. A future refactor could create an ApiKeyAdapter.
			const apiKeyRecord = await (db as any).query.apikey.findFirst({
				where: eq(apikey.id, result.key.id)
			});
			if (!apiKeyRecord) return null;

			const metadata =
				typeof apiKeyRecord.metadata === 'string'
					? JSON.parse(apiKeyRecord.metadata)
					: (apiKeyRecord.metadata as any) || {};
			const permissions = metadata.permissions || ['read', 'write'];

			return {
				type: 'api_key',
				keyId: result.key.id,
				name: result.key.name || 'Unnamed Key',
				permissions,
				lastUsedAt: result.key.lastRequest || undefined
			};
		} catch {
			return null;
		}
	},

	async requireApiKey(
		request: Request,
		db: DatabaseAdapter,
		permission?: 'read' | 'write'
	): Promise<ApiKeyAuth> {
		const apiKeyAuth = await this.validateApiKey(request, db);
		if (!apiKeyAuth) {
			throw new Error('Unauthorized: Valid API key required');
		}

		if (permission && !apiKeyAuth.permissions.includes(permission)) {
			throw new Error(`Forbidden: API key missing ${permission} permission`);
		}

		return apiKeyAuth;
	},

	async listApiKeys(db: DatabaseAdapter, userId: string): Promise<ApiKey[]> {
		// Note: This still queries a raw table. A future refactor could create an ApiKeyAdapter.
		const userApiKeys = await (db as any).query.apikey.findMany({
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
			key: result.key,
			permissions: data.permissions,
			expiresAt: result.expiresAt,
			createdAt: result.createdAt
		};
	},

	async deleteApiKey(userId: string, keyId: string): Promise<boolean> {
		// This will be implemented when we refactor the [id] route
		console.log(`Deleting key ${keyId} for user ${userId}`);
		return Promise.resolve(true);
	}
};
