import { auth } from './instance.js';
import { apikey, user } from '../db/auth-schema';
import { drizzleDb } from '../db';
import { eq } from 'drizzle-orm';
import type {
	SessionAuth,
	ApiKeyAuth,
	CMSUser,
	NewUserProfileData,
	DatabaseAdapter
} from '@aphex/cms-core/server';
import { AuthError } from '@aphex/cms-core/server';

// This is the new AuthService that centralizes all auth-related server operations.
// It uses dependency injection for the DatabaseAdapter, making it more testable and decoupled.

export interface ApiKey {
	id: string;
	name: string | null;
	organizationId?: string;
	[key: string]: any;
}

export interface ApiKeyWithSecret extends ApiKey {
	key: string;
	organizationId: string; // Make required (override optional from ApiKey)
}

export interface CreateApiKeyData {
	name: string;
	permissions: string[];
	expiresInDays?: number;
}

export interface AuthService {
	getSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth | null>;
	requireSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth>;
	validateApiKey(request: Request): Promise<ApiKeyAuth | null>;
	requireApiKey(
		request: Request,
		db: DatabaseAdapter,
		permission?: 'read' | 'write'
	): Promise<ApiKeyAuth>;
	listApiKeys(db: DatabaseAdapter, userId: string): Promise<ApiKey[]>;
	createApiKey(
		userId: string,
		organizationId: string,
		data: CreateApiKeyData
	): Promise<ApiKeyWithSecret>;
	deleteApiKey(userId: string, keyId: string): Promise<boolean>;
	getUserById(userId: string): Promise<{ id: string; name?: string; email: string } | null>;
	changeUserName(userId: string, name: string): Promise<void>;
	requestPasswordReset(email: string, redirectTo?: string): Promise<void>;
	resetPassword(token: string, newPassword: string): Promise<void>;
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

				// Check if this is the first user in the system
				const hasExistingUsers =
					typeof db.hasAnyUserProfiles === 'function'
						? await db.hasAnyUserProfiles()
						: false;
				const isFirstUser = !hasExistingUsers;

				const newUserProfile: NewUserProfileData = {
					userId: session.user.id,
					role: isFirstUser ? 'super_admin' : 'editor' // First user gets super_admin, others get editor
				};
				userProfile = await db.createUserProfile(newUserProfile);
				console.log(
					`[AuthService]: Successfully created user profile for ${session.user.id}${isFirstUser ? ' with SUPER_ADMIN role' : ''}`
				);
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

			// 5. Get the user's active organization from their session
			console.log(`[AuthService]: Fetching active organization for ${session.user.id}`);
			const userSession = await db.findUserSession(session.user.id);

			// If no session exists, get the user's first organization as the default
			if (!userSession) {
				console.log(`[AuthService]: No user session found. Fetching user's organizations.`);
				const userOrgs = await db.findUserOrganizations(session.user.id);

				if (userOrgs.length === 0) {
					// If this is a super_admin with no orgs, create a default organization
					if (cmsUser.role === 'super_admin') {
						console.log(
							`[AuthService]: Super admin ${session.user.id} has no organizations. Creating default organization.`
						);

						const defaultOrg = await db.createOrganization({
							name: 'Default Organization',
							slug: 'default',
							createdBy: session.user.id
						});

						// Add super admin as owner
						await db.addMember({
							organizationId: defaultOrg.id,
							userId: session.user.id,
							role: 'owner'
						});

						// Set as active organization
						await db.updateUserSession(session.user.id, defaultOrg.id);

						console.log(
							`[AuthService]: Created default organization ${defaultOrg.id} for super admin.`
						);
						return {
							type: 'session',
							user: cmsUser,
							session: {
								id: session.session.id,
								expiresAt: session.session.expiresAt
							},
							organizationId: defaultOrg.id,
							organizationRole: 'owner'
						};
					}

					// Check if user has pending invitations - they may be auto-joining
					console.log(
						`[AuthService]: User ${session.user.id} has no organizations. Checking for pending invitations.`
					);
					const invitations = await db.findInvitationsByEmail(session.user.email);
					const hasPendingInvitations = invitations.some(
						(inv) => !inv.acceptedAt && inv.expiresAt > new Date()
					);

					if (hasPendingInvitations) {
						console.log(
							`[AuthService]: User ${session.user.id} has pending invitations. Processing them now.`
						);

						// Accept each invitation
						for (const invitation of invitations.filter(
							(inv) => !inv.acceptedAt && inv.expiresAt > new Date()
						)) {
							await db.acceptInvitation(invitation.token, session.user.id);
							console.log(
								`[AuthService]: Accepted invitation ${invitation.id} for org ${invitation.organizationId}`
							);
						}

						// Set first org as active
						const firstInvitation = invitations.find(
							(inv) => !inv.acceptedAt && inv.expiresAt > new Date()
						);
						if (firstInvitation) {
							await db.updateUserSession(session.user.id, firstInvitation.organizationId);
							console.log(
								`[AuthService]: Set org ${firstInvitation.organizationId} as active for user ${session.user.id}`
							);

							// Re-fetch user's organizations now that invitations are processed
							const userOrgsAfterAccept = await db.findUserOrganizations(session.user.id);
							if (userOrgsAfterAccept.length > 0) {
								const firstOrg = userOrgsAfterAccept[0]!;
								console.log(
									`[AuthService]: User now has ${userOrgsAfterAccept.length} organization(s)`
								);

								return {
									type: 'session',
									user: cmsUser,
									session: {
										id: session.session.id,
										expiresAt: session.session.expiresAt
									},
									organizationId: firstOrg.organization.id,
									organizationRole: firstOrg.member.role
								};
							}
						}
					}

					console.error(
						`[AuthService]: User ${session.user.id} has no organizations and no pending invitations.`
					);
					throw new AuthError('no_organization', 'User must belong to at least one organization');
				}

				// Set the first organization as active
				const firstOrg = userOrgs[0]!;
				await db.updateUserSession(session.user.id, firstOrg.organization.id);

				console.log(`[AuthService]: Set first organization ${firstOrg.organization.id} as active.`);
				return {
					type: 'session',
					user: cmsUser,
					session: {
						id: session.session.id,
						expiresAt: session.session.expiresAt
					},
					organizationId: firstOrg.organization.id,
					organizationRole: firstOrg.member.role
				};
			}

			// 6. Get the user's membership in the active organization
			console.log(`[AuthService]: Getting membership for org ${userSession.activeOrganizationId}`);
			const membership = await db.findUserMembership(
				session.user.id,
				userSession.activeOrganizationId!
			);

			if (!membership) {
				console.error(
					`[AuthService]: User ${session.user.id} is not a member of org ${userSession.activeOrganizationId}`
				);
				throw new AuthError('kicked_from_org', 'User is not a member of the active organization');
			}

			// 7. Return the complete SessionAuth object with organization context
			return {
				type: 'session',
				user: cmsUser,
				session: {
					id: session.session.id,
					expiresAt: session.session.expiresAt
				},
				organizationId: userSession.activeOrganizationId!,
				organizationRole: membership.role
			};
		} catch (error) {
			// Re-throw AuthError to preserve error codes
			if (error instanceof AuthError) {
				throw error;
			}
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

	async validateApiKey(request: Request): Promise<ApiKeyAuth | null> {
		try {
			const apiKeyHeader = request.headers.get('x-api-key');
			if (!apiKeyHeader) return null;

			const result = await auth.api.verifyApiKey({ body: { key: apiKeyHeader } });
			if (!result.valid || !result.key) return null;

			// Better Auth stores metadata in the key object
			const metadata = result.key.metadata || {};
			const permissions = metadata.permissions || ['read', 'write'];
			const organizationId = metadata.organizationId;

			if (!organizationId) {
				console.error(`[AuthService]: API key ${result.key.id} missing organizationId in metadata`);
				return null;
			}

			return {
				type: 'api_key',
				keyId: result.key.id,
				name: result.key.name || 'Unnamed Key',
				permissions,
				organizationId,
				lastUsedAt: result.key.lastRequest || undefined
			};
		} catch (error) {
			console.error('[AuthService] validateApiKey error:', error);
			return null;
		}
	},

	async requireApiKey(
		request: Request,
		db: DatabaseAdapter,
		permission?: 'read' | 'write'
	): Promise<ApiKeyAuth> {
		const apiKeyAuth = await this.validateApiKey(request);
		if (!apiKeyAuth) {
			throw new Error('Unauthorized: Valid API key required');
		}

		if (permission && !apiKeyAuth.permissions.includes(permission)) {
			throw new Error(`Forbidden: API key missing ${permission} permission`);
		}

		return apiKeyAuth;
	},

	async listApiKeys(db: DatabaseAdapter, userId: string): Promise<ApiKey[]> {
		// Query the apikey table directly using drizzleDb (not the adapter)
		const userApiKeys = await drizzleDb.query.apikey.findMany({
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
				permissions: metadata.permissions || [],
				organizationId: metadata.organizationId // Include organizationId from metadata
			};
		});
	},

	async createApiKey(
		userId: string,
		organizationId: string,
		data: CreateApiKeyData
	): Promise<ApiKeyWithSecret> {
		const expiresIn = data.expiresInDays ? data.expiresInDays * 24 * 60 * 60 : undefined;

		const result = await auth.api.createApiKey({
			body: {
				userId: userId,
				name: data.name,
				expiresIn,
				metadata: {
					permissions: data.permissions,
					organizationId: organizationId // Store organization ID in metadata
				}
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
			organizationId: organizationId, // Include in return value
			expiresAt: result.expiresAt,
			createdAt: result.createdAt
		};
	},

	async deleteApiKey(userId: string, keyId: string): Promise<boolean> {
		// This will be implemented when we refactor the [id] route
		console.log(`Deleting key ${keyId} for user ${userId}`);
		return Promise.resolve(true);
	},

	async getUserById(userId: string): Promise<{ id: string; name?: string; email: string } | null> {
		try {
			const userRecord = await drizzleDb.query.user.findFirst({
				where: eq(user.id, userId),
				columns: {
					id: true,
					name: true,
					email: true
				}
			});

			if (!userRecord) {
				return null;
			}

			return {
				id: userRecord.id,
				name: userRecord.name ?? undefined,
				email: userRecord.email
			};
		} catch (error) {
			console.error('[AuthService]: Error fetching user by ID:', error);
			return null;
		}
	},

	async changeUserName(userId: string, name: string): Promise<void> {
		await drizzleDb
			.update(user)
			.set({
				name,
				updatedAt: new Date()
			})
			.where(eq(user.id, userId));
	},

	async requestPasswordReset(email: string, redirectTo?: string): Promise<void> {
		try {
			await auth.api.forgetPassword({
				body: {
					email,
					redirectTo
				}
			});

			// TODO: Send password reset email via email adapter - for true agnoticism
			// The email adapter can be accessed from event.locals.aphexCMS.emailAdapter
			// For now, Better Auth handles the email sending internally
		} catch (error) {
			console.error('[AuthService]: Error requesting password reset:', error);
			throw error;
		}
	},

	async resetPassword(token: string, newPassword: string): Promise<void> {
		try {
			await auth.api.resetPassword({
				body: {
					newPassword,
					token
				}
			});
		} catch (error) {
			console.error('[AuthService]: Error resetting password:', error);
			throw error;
		}
	}
};
