import { and, eq } from 'drizzle-orm';
import type { AphexAuthInstance } from './instance.js';
import type {
	SessionAuth,
	PartialSessionAuth,
	ApiKeyAuth,
	CMSUser,
	DatabaseAdapter
} from '@aphexcms/cms-core/server';
import {
	AuthError,
	createUserProfileWithBootstrap,
	type BootstrapPolicy,
	type CacheAdapter
} from '@aphexcms/cms-core/server';
import { resolveBootstrapPolicy } from './bootstrap-policy.js';
import { cmsLogger, BUILTIN_ROLE_SEED, coarseApiKeyCapabilities } from '@aphexcms/cms-core';

/**
 * Capabilities that make a key a *writing* key. Used to decide whether the
 * coarse `write` scope survives the clamp against the owner's actual role.
 */
const WRITE_CAPABILITIES = [
	'document.create',
	'document.update',
	'document.delete',
	'document.publish',
	'document.unpublish',
	'asset.upload',
	'asset.delete'
] as const;

type ApiKeyPermission = 'read' | 'write';

function isApiKeyPermission(value: unknown): value is ApiKeyPermission {
	return value === 'read' || value === 'write';
}

/**
 * Capabilities a role actually confers in a given organization.
 *
 * Mirrors `RolesService.resolveFromDb`, including its built-in seed fallback:
 * without it, an organization whose built-in role rows were never seeded would
 * resolve to an empty set and silently strip every capability from otherwise
 * valid API keys.
 */
async function resolveGrantableCapabilities(
	db: DatabaseAdapter,
	organizationId: string,
	roleName: string
): Promise<readonly string[]> {
	const row = await db.findRoleByName(organizationId, roleName);
	if (row) return row.capabilities;

	// Widened rather than asserted: `roleName` is a plain string from the
	// membership row, so an index into the union-keyed record needs no cast.
	const seed: Record<string, { capabilities: readonly string[] } | undefined> = BUILTIN_ROLE_SEED;
	const builtin = seed[roleName];
	if (builtin) return builtin.capabilities;

	cmsLogger.warn(
		'[AuthService]',
		`Unknown role "${roleName}" in org=${organizationId} — API key granted no capabilities`
	);
	return [];
}

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
	/**
	 * Legacy coarse-grained scopes. Optional when `capabilities` is supplied —
	 * at least one of the two must be present (validator enforces this).
	 */
	permissions?: string[];
	/** Fine-grained capability allowlist for this key. */
	capabilities?: string[];
	expiresInDays?: number;
}

export interface AuthService {
	getSession(
		request: Request,
		db: DatabaseAdapter
	): Promise<SessionAuth | PartialSessionAuth | null>;
	requireSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth>;
	validateApiKey(request: Request, db: DatabaseAdapter): Promise<ApiKeyAuth | null>;
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
	getUserById(
		userId: string
	): Promise<{ id: string; name?: string; email: string; image?: string } | null>;
	getUserByEmail(
		email: string
	): Promise<{ id: string; name?: string; email: string; image?: string } | null>;
	changeUserName(userId: string, name: string): Promise<void>;
	changeUserImage(userId: string, image: string | null): Promise<void>;
	requestPasswordReset(email: string, redirectTo?: string): Promise<void>;
	resetPassword(token: string, newPassword: string): Promise<void>;
}

/** Collaborators the service closes over, supplied once by `createAphexAuth`. */
export interface AuthServiceDeps {
	/** The better-auth instance whose `api` the service calls. */
	auth: AphexAuthInstance;
	/** Raw Drizzle client, for the few direct table reads (API keys, user lookups). */
	drizzleDb: any;
	/** Dialect-matched auth tables, from `@aphexcms/auth/schema/{pg,sqlite}`. */
	schema: { user: any; apikey: any };
	/**
	 * The cache backing the api-key plugin's secondary storage, when one is
	 * configured. Only used to evict a revoked key — see `deleteApiKey`.
	 */
	cache?: CacheAdapter | null;
	/**
	 * Decides whether a brand-new profile is promoted to an instance role.
	 *
	 * Defaults to `openFirstUser()` — the first person to sign up owns the
	 * instance, the same as WordPress, Ghost, Strapi, Payload and Dokploy. That
	 * assumes you sign up promptly after deploying; an instance left reachable
	 * beforehand belongs to whoever finds it. Harden it with `claimCode()` or
	 * `allowlistEmail()`, or turn it off entirely with `never()`.
	 */
	bootstrap?: BootstrapPolicy;
}

/** How many times to retry evicting a revoked key before declaring revocation incomplete. */
const CACHE_EVICTION_ATTEMPTS = 3;
/** Base backoff between eviction attempts; multiplied by the attempt number. */
const CACHE_EVICTION_BACKOFF_MS = 50;

/**
 * Revocation removed the database row but could not clear the cache, so the key may still
 * authenticate until its entry expires — and a key created without `expiresAt` has no TTL
 * at all, which is to say never.
 *
 * This is thrown rather than logged because the alternative is reporting success for a
 * revocation that didn't take. An operator revoking a leaked key needs to know immediately
 * that it is still live; discovering it from a log line later is not the same thing. The
 * failure is not recoverable in-process (the row is already gone, and re-creating it would
 * be worse), so the correct response is to surface it and let a human flush the cache.
 */
export class ApiKeyRevocationError extends Error {
	readonly code = 'API_KEY_REVOCATION_INCOMPLETE';
	constructor(
		readonly keyId: string,
		readonly cause: unknown
	) {
		super(
			`API key ${keyId} was deleted from the database but could not be evicted from the ` +
				`cache. It may continue to authenticate until the cache entry expires — flush the ` +
				`auth cache to complete revocation.`
		);
		this.name = 'ApiKeyRevocationError';
	}
}

export function createAuthService(deps: AuthServiceDeps): AuthService {
	const { auth, drizzleDb, cache } = deps;
	const bootstrapPolicy = resolveBootstrapPolicy(deps.bootstrap);
	const { user, apikey } = deps.schema;

	/**
	 * Remove a revoked key from the api-key plugin's secondary storage.
	 *
	 * The three key formats are the plugin's own (`api-key:<hashedKey>`,
	 * `api-key:by-id:<id>`, `api-key:by-ref:<referenceId>`) — a deliberate but
	 * narrow coupling, and the reason this is worth a comment: if a future version
	 * renames them, revocation silently stops taking effect rather than failing
	 * loudly. The `apikey.key` column stores the already-hashed key, which is what
	 * the lookup is keyed on, so nothing here needs the plaintext secret.
	 */
	async function evictApiKeyFromCache(row: {
		id: string;
		key: string;
		referenceId: string | null;
	}): Promise<void> {
		if (!cache) return;

		// Retried before giving up: the common failure is a momentary blip talking to
		// Redis, and re-running the deletes is free — `delete` on an absent key is a
		// no-op, so a partial success on the first pass costs nothing on the second.
		let lastError: unknown;
		for (let attempt = 1; attempt <= CACHE_EVICTION_ATTEMPTS; attempt++) {
			try {
				await Promise.all([
					cache.delete(`api-key:${row.key}`),
					cache.delete(`api-key:by-id:${row.id}`),
					...(row.referenceId ? [cache.delete(`api-key:by-ref:${row.referenceId}`)] : [])
				]);
				return;
			} catch (error) {
				lastError = error;
				if (attempt < CACHE_EVICTION_ATTEMPTS) {
					await new Promise((resolve) => setTimeout(resolve, attempt * CACHE_EVICTION_BACKOFF_MS));
				}
			}
		}

		// Loud, because the key is now live in cache with no database row behind
		// it — the one state an operator needs to know about.
		cmsLogger.error(
			'[AuthService]',
			`API key ${row.id} was deleted but could not be evicted from cache — it may still authenticate:`,
			lastError
		);
		throw new ApiKeyRevocationError(row.id, lastError);
	}

	return {
		async getSession(
			request: Request,
			db: DatabaseAdapter
		): Promise<SessionAuth | PartialSessionAuth | null> {
			try {
				cmsLogger.debug('[AuthService]', 'getSession called');
				// 1. Get the base user session from the auth provider
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) {
					cmsLogger.debug('[AuthService]', 'No active session found from auth provider');
					return null;
				}
				cmsLogger.debug('[AuthService]', `Found session for user ${session.user.id}`);

				// 2. Get the corresponding CMS user profile from our database
				cmsLogger.debug('[AuthService]', `Checking for user profile for ${session.user.id}`);
				let userProfile = await db.findUserProfileById(session.user.id);

				// 3. If no profile exists, create one (lazy sync)
				if (!userProfile) {
					cmsLogger.info(
						'[AuthService]',
						`User profile not found for ${session.user.id}. Creating one now (lazy sync).`
					);

					// Bootstrap promotion lives in cms-core so it happens identically no
					// matter who authenticated the user — this package is just one provider.
					userProfile = await createUserProfileWithBootstrap({
						db,
						user: {
							id: session.user.id,
							email: session.user.email,
							emailVerified: session.user.emailVerified === true
						},
						request,
						bootstrap: bootstrapPolicy
					});
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
				cmsLogger.debug('[AuthService]', `Successfully assembled CMSUser for ${session.user.id}`);

				// 5. Get the user's active organization from their session
				cmsLogger.debug('[AuthService]', `Fetching active organization for ${session.user.id}`);
				const userSession = await db.findUserSession(session.user.id);

				// If no session exists, get the user's first organization as the default
				if (!userSession) {
					cmsLogger.debug('[AuthService]', `No user session found. Fetching user's organizations.`);
					const userOrgs = await db.findUserOrganizations(session.user.id);

					if (userOrgs.length === 0) {
						// If this is a super_admin with no orgs, create a default organization
						if (cmsUser.role === 'super_admin') {
							cmsLogger.info(
								'[AuthService]',
								`Super admin ${session.user.id} has no organizations. Creating default organization.`
							);

							const defaultOrg = await db.createOrganization({
								name: 'Default Organization',
								slug: 'default',
								createdBy: session.user.id
							});

							// Seed built-in roles before assigning membership — member
							// rows reference roles by name, so they must exist first.
							await db.seedBuiltinRoles(defaultOrg.id);

							// Add super admin as owner
							await db.addMember({
								organizationId: defaultOrg.id,
								userId: session.user.id,
								role: 'owner'
							});

							// Set as active organization
							await db.updateUserSession(session.user.id, defaultOrg.id);

							cmsLogger.info(
								'[AuthService]',
								`Created default organization ${defaultOrg.id} for super admin.`
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

						// User has no organizations — return partial session without org context
						// Routes like /invitations can use this to identify the user
						cmsLogger.debug(
							'[AuthService]',
							`User ${session.user.id} has no organizations. Returning partial session.`
						);
						return {
							type: 'partial_session',
							user: cmsUser,
							session: {
								id: session.session.id,
								expiresAt: session.session.expiresAt
							}
						};
					}

					// Set the first organization as active
					const firstOrg = userOrgs[0]!;
					await db.updateUserSession(session.user.id, firstOrg.organization.id);

					cmsLogger.debug(
						'[AuthService]',
						`Set first organization ${firstOrg.organization.id} as active.`
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

				// 6. Get the user's membership in the active organization
				cmsLogger.debug(
					'[AuthService]',
					`Getting membership for org ${userSession.activeOrganizationId}`
				);
				const membership = await db.findUserMembership(
					session.user.id,
					userSession.activeOrganizationId!
				);

				if (!membership) {
					cmsLogger.error(
						'[AuthService]',
						`User ${session.user.id} is not a member of org ${userSession.activeOrganizationId}`
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
				cmsLogger.error('[AuthService]', 'Error in getSession:', error);
				return null;
			}
		},

		async requireSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth> {
			const session = await this.getSession(request, db);
			if (!session) {
				throw new AuthError('no_session', 'Unauthorized: Session required');
			}
			// User is authenticated but has no organization — redirect to invitations
			if (session.type === 'partial_session') {
				throw new AuthError('pending_invitations', 'User has pending invitations to review');
			}
			return session;
		},

		async validateApiKey(request: Request, db: DatabaseAdapter): Promise<ApiKeyAuth | null> {
			try {
				const apiKeyHeader = request.headers.get('x-api-key');
				if (!apiKeyHeader) return null;

				const result = await auth.api.verifyApiKey({ body: { key: apiKeyHeader } });
				if (!result.valid || !result.key) return null;

				// Key metadata is CLIENT-WRITABLE. better-auth mounts its own
				// `POST /api-key/create`, and `enableMetadata` lets any signed-in user
				// put whatever they like in it — so nothing read here is authority, only
				// a claim about which organization the key was meant for. Treating it as
				// authority let any user mint a key for another tenant with arbitrary
				// capabilities.
				const metadata = result.key.metadata || {};
				const claimedOrganizationId = metadata.organizationId;

				if (!claimedOrganizationId) {
					cmsLogger.error(
						'[AuthService]',
						`API key ${result.key.id} missing organizationId in metadata`
					);
					return null;
				}

				// The key acts as its owner. Re-check membership on every request rather
				// than trusting the claim: this is also what revokes a key's access the
				// moment its owner is removed from the organization.
				// `referenceId` is the owning entity — userId here, since the plugin is
				// left on its default `references` setting (see createApiKey below).
				const ownerId = result.key.referenceId;
				const membership = ownerId
					? await db.findUserMembership(ownerId, claimedOrganizationId)
					: null;

				if (!membership) {
					cmsLogger.warn(
						'[AuthService]',
						`API key ${result.key.id} rejected — owner is not a member of ${claimedOrganizationId}`
					);
					return null;
				}

				// A key can never grant more than its owner holds in that organization.
				// Instance admins are intentionally *not* special-cased: a long-lived
				// bearer token shouldn't silently carry break-glass powers.
				const grantable = new Set(
					await resolveGrantableCapabilities(db, claimedOrganizationId, membership.role)
				);

				// Same clamp for the coarse read/write scopes.
				const requestedPermissions: unknown[] = Array.isArray(metadata.permissions)
					? metadata.permissions
					: ['read'];
				const canWrite = WRITE_CAPABILITIES.some((capability) => grantable.has(capability));
				const permissions = requestedPermissions
					.filter(isApiKeyPermission)
					.filter((permission) => permission !== 'write' || canWrite);

				// Always resolved to a concrete list here, never left undefined for a
				// consumer to expand later. A key with no allowlist means "whatever the
				// coarse scopes imply", and that expansion has to be clamped the same
				// way an explicit list is: `canWrite` above only asks whether the owner
				// can write *at all*, so an editor whose role lacks `document.delete`
				// would otherwise pick it up from the `write` scope. Intersecting here
				// makes `grantable` the ceiling for both paths.
				const requested: unknown[] = Array.isArray(metadata.capabilities)
					? metadata.capabilities
					: coarseApiKeyCapabilities(permissions);
				const capabilities = requested
					.filter((capability): capability is string => typeof capability === 'string')
					.filter((capability) => grantable.has(capability));

				return {
					type: 'api_key',
					keyId: result.key.id,
					name: result.key.name || 'Unnamed Key',
					permissions,
					capabilities,
					organizationId: claimedOrganizationId,
					lastUsedAt: result.key.lastRequest || undefined
				};
			} catch (error) {
				cmsLogger.error('[AuthService]', 'validateApiKey error:', error);
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

		async listApiKeys(_db: DatabaseAdapter, userId: string): Promise<ApiKey[]> {
			// Query the apikey table directly using drizzleDb (not the adapter)
			const userApiKeys = await drizzleDb.query.apikey.findMany({
				where: eq(apikey.referenceId, userId),
				columns: {
					id: true,
					name: true,
					metadata: true,
					expiresAt: true,
					lastRequest: true,
					createdAt: true
				},
				orderBy: (table: Record<string, unknown>, ops: { desc: (c: unknown) => unknown }) => [
					ops.desc(table.createdAt)
				]
			});

			return userApiKeys.map((key: Record<string, unknown>) => {
				const metadata =
					typeof key.metadata === 'string' ? JSON.parse(key.metadata) : (key.metadata as any) || {};
				return {
					...key,
					permissions: metadata.permissions || [],
					capabilities: Array.isArray(metadata.capabilities) ? metadata.capabilities : undefined,
					organizationId: metadata.organizationId
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
						// Keep both fields for forward/backward compatibility:
						// older validators read `permissions`, newer ones prefer
						// `capabilities` when the caller supplied them.
						permissions: data.permissions ?? ['read'],
						capabilities: data.capabilities,
						organizationId: organizationId
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
				permissions: data.permissions ?? ['read'],
				capabilities: data.capabilities,
				organizationId: organizationId,
				expiresAt: result.expiresAt,
				createdAt: result.createdAt
			};
		},

		async deleteApiKey(userId: string, keyId: string): Promise<boolean> {
			// Scoped by owner in the WHERE clause, not checked beforehand: a key id
			// belonging to somebody else matches nothing and reports false, so one
			// account can't delete another's key by guessing an id.
			//
			// `referenceId` is the owner column — better-auth's api-key plugin does not
			// call it `userId`.
			const deleted = await drizzleDb
				.delete(apikey)
				.where(and(eq(apikey.id, keyId), eq(apikey.referenceId, userId)))
				.returning({ id: apikey.id, key: apikey.key, referenceId: apikey.referenceId });

			if (!deleted.length) {
				cmsLogger.warn('[AuthService]', `No API key ${keyId} owned by ${userId} — nothing deleted`);
				return false;
			}

			// Dropping the row is not revocation on its own. The api-key plugin runs
			// in `secondary-storage` mode with `fallbackToDatabase`, and its lookup
			// returns a cache hit *without* consulting the database — so a deleted key
			// keeps authenticating for as long as its cache entry lives. Entries are
			// written with a TTL derived from `expiresAt`, and a key created without
			// an expiry (the default) gets no TTL at all, so "until it expires" meant
			// "forever" for exactly the keys most worth revoking.
			//
			// Deliberately not caught: if eviction fails this throws `ApiKeyRevocationError`
			// and the caller reports a failure. The row really is gone by now, so the throw
			// isn't "nothing happened" — it's "revocation is incomplete", which is precisely
			// what the operator has to act on. Swallowing it here would return `true` for a
			// key that still authenticates.
			await evictApiKeyFromCache(deleted[0]);

			cmsLogger.info('[AuthService]', `Deleted API key ${keyId}`);
			return true;
		},

		async getUserById(
			userId: string
		): Promise<{ id: string; name?: string; email: string; image?: string } | null> {
			try {
				const userRecord = await drizzleDb.query.user.findFirst({
					where: eq(user.id, userId),
					columns: {
						id: true,
						name: true,
						email: true,
						image: true
					}
				});

				if (!userRecord) {
					return null;
				}

				return {
					id: userRecord.id,
					name: userRecord.name ?? undefined,
					email: userRecord.email,
					image: userRecord.image ?? undefined
				};
			} catch (error) {
				cmsLogger.error('[AuthService]', 'Error fetching user by ID:', error);
				return null;
			}
		},

		async getUserByEmail(
			email: string
		): Promise<{ id: string; name?: string; email: string; image?: string } | null> {
			try {
				const userRecord = await drizzleDb.query.user.findFirst({
					where: eq(user.email, email.toLowerCase()),
					columns: {
						id: true,
						name: true,
						email: true,
						image: true
					}
				});

				if (!userRecord) {
					return null;
				}

				return {
					id: userRecord.id,
					name: userRecord.name ?? undefined,
					email: userRecord.email,
					image: userRecord.image ?? undefined
				};
			} catch (error) {
				cmsLogger.error('[AuthService]', 'Error fetching user by email:', error);
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

		async changeUserImage(userId: string, image: string | null): Promise<void> {
			await drizzleDb
				.update(user)
				.set({
					image,
					updatedAt: new Date()
				})
				.where(eq(user.id, userId));
		},

		async requestPasswordReset(email: string, redirectTo?: string): Promise<void> {
			try {
				await auth.api.requestPasswordReset({
					body: {
						email,
						redirectTo
					}
				});

				// TODO: Send password reset email via email adapter - for true agnosticism
				// The email adapter can be accessed from event.locals.aphexCMS.emailAdapter
				// For now, Better Auth handles the email sending internally
			} catch (error) {
				cmsLogger.error('[AuthService]', 'Error requesting password reset:', error);
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
				cmsLogger.error('[AuthService]', 'Error resetting password:', error);
				throw error;
			}
		}
	};
}
