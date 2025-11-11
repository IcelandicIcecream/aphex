// PostgreSQL adapter - combines document and asset adapters
import type { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import type { DatabaseAdapter, DatabaseProvider, NewOrganizationMember, SchemaType } from '@aphexcms/cms-core/server';
import { PostgreSQLDocumentAdapter } from './document-adapter';
import { PostgreSQLAssetAdapter } from './asset-adapter';
import { PostgreSQLUserProfileAdapter } from './user-adapter';
import { PostgreSQLSchemaAdapter } from './schema-adapter';
import { PostgreSQLOrganizationAdapter } from './organization-adapter';
import type { CMSSchema } from './schema';
import { cmsSchema } from './schema';

/**
 * Combined PostgreSQL adapter that implements the full DatabaseAdapter interface
 * Composes document, asset, user profile, schema, and organization adapters
 */
export class PostgreSQLAdapter implements DatabaseAdapter {
	private db: ReturnType<typeof drizzle>;
	private tables: CMSSchema;
	private documentAdapter: PostgreSQLDocumentAdapter;
	private assetAdapter: PostgreSQLAssetAdapter;
	private userProfileAdapter: PostgreSQLUserProfileAdapter;
	private schemaAdapter: PostgreSQLSchemaAdapter;
	private organizationAdapter: PostgreSQLOrganizationAdapter;
	public readonly rlsEnabled: boolean;
	public readonly hierarchyEnabled: boolean;

	constructor(config: {
		db: ReturnType<typeof drizzle>; // Drizzle client with full schema (CMS + Auth)
		tables: CMSSchema; // CMS-specific tables for adapter to use
		multiTenancy?: {
			enableRLS?: boolean;
			enableHierarchy?: boolean;
		};
	}) {
		this.db = config.db;
		this.tables = config.tables;

		// Multi-tenancy config with defaults
		// RLS enabled by default for defense in depth (database-level security)
		// LocalAPI's PermissionChecker provides application-level security
		// Both can be bypassed with context.overrideAccess = true
		this.rlsEnabled = config.multiTenancy?.enableRLS ?? true;
		this.hierarchyEnabled = config.multiTenancy?.enableHierarchy ?? true;

		// Pass the Drizzle instance and tables to all adapters
		this.documentAdapter = new PostgreSQLDocumentAdapter(this.db, this.tables);
		this.assetAdapter = new PostgreSQLAssetAdapter(this.db, this.tables);
		this.userProfileAdapter = new PostgreSQLUserProfileAdapter(this.db, this.tables);
		this.schemaAdapter = new PostgreSQLSchemaAdapter(this.db, this.tables);
		this.organizationAdapter = new PostgreSQLOrganizationAdapter(this.db, this.tables);
	}

	// Document operations - delegate to document adapter with RLS context
	async findManyDoc(organizationId: string, filters?: any) {
		return this.withOrgContext(organizationId, async () => {
			// If hierarchy is enabled and no explicit filterOrganizationIds provided,
			// include child organizations in the query
			if (this.hierarchyEnabled && !filters?.filterOrganizationIds) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				console.log(
					`[Hierarchy] Parent org ${organizationId} has ${childOrgIds.length} child orgs:`,
					childOrgIds
				);
				const orgIds = [organizationId, ...childOrgIds];

				return this.documentAdapter.findManyDoc(organizationId, {
					...filters,
					filterOrganizationIds: orgIds
				});
			}

			return this.documentAdapter.findManyDoc(organizationId, filters);
		});
	}

	async findByDocId(organizationId: string, id: string, depth?: number) {
		return this.withOrgContext(organizationId, async () => {
			// Try to find in current org first
			let document = await this.documentAdapter.findByDocId(organizationId, id, depth);

			// If not found and hierarchy is enabled, try child organizations
			if (!document && this.hierarchyEnabled) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				for (const childOrgId of childOrgIds) {
					document = await this.documentAdapter.findByDocId(childOrgId, id, depth);
					if (document) break;
				}
			}

			return document;
		});
	}

	async createDocument(data: any) {
		return this.withOrgContext(data.organizationId, () =>
			this.documentAdapter.createDocument(data)
		);
	}

	async updateDocDraft(organizationId: string, id: string, data: any, updatedBy?: string) {
		return this.withOrgContext(organizationId, async () => {
			// Try to update in current org first
			let document = await this.documentAdapter.updateDocDraft(organizationId, id, data, updatedBy);

			// If not found and hierarchy is enabled, try child organizations
			if (!document && this.hierarchyEnabled) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				for (const childOrgId of childOrgIds) {
					document = await this.documentAdapter.updateDocDraft(childOrgId, id, data, updatedBy);
					if (document) break;
				}
			}

			return document;
		});
	}

	async deleteDocById(organizationId: string, id: string) {
		return this.withOrgContext(organizationId, async () => {
			// Try to delete in current org first
			let deleted = await this.documentAdapter.deleteDocById(organizationId, id);

			// If not found and hierarchy is enabled, try child organizations
			if (!deleted && this.hierarchyEnabled) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				for (const childOrgId of childOrgIds) {
					deleted = await this.documentAdapter.deleteDocById(childOrgId, id);
					if (deleted) break;
				}
			}

			return deleted;
		});
	}

	async publishDoc(organizationId: string, id: string) {
		return this.withOrgContext(organizationId, async () => {
			// Try to publish in current org first
			let document = await this.documentAdapter.publishDoc(organizationId, id);

			// If not found and hierarchy is enabled, try child organizations
			if (!document && this.hierarchyEnabled) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				for (const childOrgId of childOrgIds) {
					document = await this.documentAdapter.publishDoc(childOrgId, id);
					if (document) break;
				}
			}

			return document;
		});
	}

	async unpublishDoc(organizationId: string, id: string) {
		return this.withOrgContext(organizationId, async () => {
			// Try to unpublish in current org first
			let document = await this.documentAdapter.unpublishDoc(organizationId, id);

			// If not found and hierarchy is enabled, try child organizations
			if (!document && this.hierarchyEnabled) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				for (const childOrgId of childOrgIds) {
					document = await this.documentAdapter.unpublishDoc(childOrgId, id);
					if (document) break;
				}
			}

			return document;
		});
	}

	async countDocsByType(organizationId: string, type: string) {
		return this.withOrgContext(organizationId, async () => {
			let count = await this.documentAdapter.countDocsByType(organizationId, type);

			// If hierarchy is enabled, add child org counts
			if (this.hierarchyEnabled) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				for (const childOrgId of childOrgIds) {
					const childCount = await this.documentAdapter.countDocsByType(childOrgId, type);
					count += childCount;
				}
			}

			return count;
		});
	}

	async getDocCountsByType(organizationId: string) {
		return this.withOrgContext(organizationId, async () => {
			const counts = await this.documentAdapter.getDocCountsByType(organizationId);

			// If hierarchy is enabled, add child org counts
			if (this.hierarchyEnabled) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				for (const childOrgId of childOrgIds) {
					const childCounts = await this.documentAdapter.getDocCountsByType(childOrgId);
					// Merge counts
					for (const [type, count] of Object.entries(childCounts)) {
						counts[type] = (counts[type] || 0) + count;
					}
				}
			}

			return counts;
		});
	}

	// Asset operations - delegate to asset adapter with RLS context
	async createAsset(data: any) {
		return this.withOrgContext(data.organizationId, () => this.assetAdapter.createAsset(data));
	}

	async findAssetById(organizationId: string, id: string) {
		return this.withOrgContext(organizationId, () =>
			this.assetAdapter.findAssetById(organizationId, id)
		);
	}

	async findAssetByIdGlobal(id: string) {
		// Bypass RLS - call adapter directly without org context
		return this.assetAdapter.findAssetByIdGlobal(id);
	}

	async findAssets(organizationId: string, filters?: any) {
		return this.withOrgContext(organizationId, async () => {
			// If hierarchy is enabled and no explicit filterOrganizationIds provided,
			// include child organizations in the query
			if (this.hierarchyEnabled && !filters?.filterOrganizationIds) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				console.log(
					`[Hierarchy] Parent org ${organizationId} has ${childOrgIds.length} child orgs for assets:`,
					childOrgIds
				);
				const orgIds = [organizationId, ...childOrgIds];

				return this.assetAdapter.findAssets(organizationId, {
					...filters,
					filterOrganizationIds: orgIds
				});
			}

			return this.assetAdapter.findAssets(organizationId, filters);
		});
	}

	async updateAsset(organizationId: string, id: string, data: any) {
		return this.withOrgContext(organizationId, () =>
			this.assetAdapter.updateAsset(organizationId, id, data)
		);
	}

	async deleteAsset(organizationId: string, id: string) {
		return this.withOrgContext(organizationId, () =>
			this.assetAdapter.deleteAsset(organizationId, id)
		);
	}

	async countAssets(organizationId: string) {
		return this.withOrgContext(organizationId, () => this.assetAdapter.countAssets(organizationId));
	}

	async countAssetsByType(organizationId: string) {
		return this.withOrgContext(organizationId, () =>
			this.assetAdapter.countAssetsByType(organizationId)
		);
	}

	async getTotalAssetsSize(organizationId: string) {
		return this.withOrgContext(organizationId, () =>
			this.assetAdapter.getTotalAssetsSize(organizationId)
		);
	}

	// Advanced filtering methods (for unified Local API)
	async findManyDocAdvanced(
		organizationId: string,
		collectionName: string,
		options?: any
	) {
		return this.withOrgContext(organizationId, () =>
			this.documentAdapter.findManyDocAdvanced(organizationId, collectionName, options)
		);
	}

	async findByDocIdAdvanced(
		organizationId: string,
		id: string,
		options?: any
	) {
		return this.withOrgContext(organizationId, () =>
			this.documentAdapter.findByDocIdAdvanced(organizationId, id, options)
		);
	}

	async countDocuments(organizationId: string, collectionName: string, where?: any) {
		return this.withOrgContext(organizationId, () =>
			this.documentAdapter.countDocuments(organizationId, collectionName, where)
		);
	}

	async findManyAssetsAdvanced(organizationId: string, options?: any) {
		return this.withOrgContext(organizationId, () =>
			this.assetAdapter.findManyAssetsAdvanced(organizationId, options)
		);
	}

	async findAssetByIdAdvanced(
		organizationId: string,
		id: string
	) {
		return this.withOrgContext(organizationId, () =>
			this.assetAdapter.findAssetByIdAdvanced(organizationId, id)
		);
	}

	async countAssetsAdvanced(organizationId: string, where?: any) {
		return this.withOrgContext(organizationId, () =>
			this.assetAdapter.countAssetsAdvanced(organizationId, where)
		);
	}

	// User Profile operations - delegate to user profile adapter
	async createUserProfile(data: any) {
		return this.userProfileAdapter.createUserProfile(data);
	}

	async findUserProfileById(userId: string) {
		return this.userProfileAdapter.findUserProfileById(userId);
	}

	async deleteUserProfile(userId: string) {
		return this.userProfileAdapter.deleteUserProfile(userId);
	}

	/**
	 * Check if any user profiles exist (for detecting first user)
	 */
	async hasAnyUserProfiles(): Promise<boolean> {
		const result = await this.db.select().from(this.tables.userProfiles).limit(1);
		return result.length > 0;
	}

	// Schema operations - delegate to schema adapter
	async registerSchemaType(schemaType: SchemaType): Promise<void> {
		return this.schemaAdapter.registerSchemaType(schemaType);
	}

	async getSchemaType(name: string): Promise<SchemaType | null> {
		return this.schemaAdapter.getSchemaType(name);
	}

	async listDocumentTypes(): Promise<Array<{ name: string; title: string; description?: string }>> {
		return this.schemaAdapter.listDocumentTypes();
	}

	async listObjectTypes(): Promise<Array<{ name: string; title: string; description?: string }>> {
		return this.schemaAdapter.listObjectTypes();
	}

	async listSchemas(): Promise<SchemaType[]> {
		return this.schemaAdapter.listSchemas();
	}

	async deleteSchemaType(name: string): Promise<void> {
		return this.schemaAdapter.deleteSchemaType(name);
	}

	// Organization operations - delegate to organization adapter
	async createOrganization(data: any) {
		return this.organizationAdapter.createOrganization(data);
	}

	async findOrganizationById(id: string) {
		return this.organizationAdapter.findOrganizationById(id);
	}

	async findOrganizationBySlug(slug: string) {
		return this.organizationAdapter.findOrganizationBySlug(slug);
	}

	async updateOrganization(id: string, data: any) {
		return this.organizationAdapter.updateOrganization(id, data);
	}

	async deleteOrganization(id: string) {
		return this.organizationAdapter.deleteOrganization(id);
	}

	async addMember(data: NewOrganizationMember) {
		return this.organizationAdapter.addMember(data);
	}

	async removeMember(organizationId: string, userId: string) {
		return this.organizationAdapter.removeMember(organizationId, userId);
	}

	async removeAllMembers(organizationId: string) {
		return this.organizationAdapter.removeAllMembers(organizationId);
	}

	async updateMemberRole(
		organizationId: string,
		userId: string,
		role: 'owner' | 'admin' | 'editor' | 'viewer'
	) {
		return this.organizationAdapter.updateMemberRole(organizationId, userId, role);
	}

	async findUserMembership(userId: string, organizationId: string) {
		return this.organizationAdapter.findUserMembership(userId, organizationId);
	}

	async findUserOrganizations(userId: string) {
		return this.organizationAdapter.findUserOrganizations(userId);
	}

	async findOrganizationMembers(organizationId: string) {
		return this.organizationAdapter.findOrganizationMembers(organizationId);
	}

	async createInvitation(data: any) {
		return this.organizationAdapter.createInvitation(data);
	}

	async findInvitationByToken(token: string) {
		return this.organizationAdapter.findInvitationByToken(token);
	}

	async findOrganizationInvitations(organizationId: string) {
		return this.organizationAdapter.findOrganizationInvitations(organizationId);
	}

	async findInvitationsByEmail(email: string) {
		return this.organizationAdapter.findInvitationsByEmail(email);
	}

	async acceptInvitation(token: string, userId: string) {
		return this.organizationAdapter.acceptInvitation(token, userId);
	}

	async deleteInvitation(id: string) {
		return this.organizationAdapter.deleteInvitation(id);
	}

	async removeAllInvitations(organizationId: string) {
		return this.organizationAdapter.removeAllInvitations(organizationId);
	}

	async cleanupExpiredInvitations() {
		return this.organizationAdapter.cleanupExpiredInvitations();
	}

	async updateUserSession(userId: string, organizationId: string) {
		return this.organizationAdapter.updateUserSession(userId, organizationId);
	}

	async findUserSession(userId: string) {
		return this.organizationAdapter.findUserSession(userId);
	}

	async deleteUserSession(userId: string) {
		return this.organizationAdapter.deleteUserSession(userId);
	}

	// Multi-tenancy RLS helper methods
	/**
	 * Initialize RLS by enabling or disabling it on content tables based on config
	 * Call this after running migrations to set up RLS according to your configuration
	 */
	async initializeRLS(): Promise<void> {
		const action = this.rlsEnabled ? 'ENABLE' : 'DISABLE';

		try {
			await this.db.execute(sql.raw(`ALTER TABLE cms_documents ${action} ROW LEVEL SECURITY`));
			await this.db.execute(sql.raw(`ALTER TABLE cms_assets ${action} ROW LEVEL SECURITY`));
			console.log(`[PostgreSQLAdapter]: RLS ${action}D on content tables`);
		} catch (error) {
			console.error(`[PostgreSQLAdapter]: Failed to ${action} RLS:`, error);
			throw error;
		}
	}

	/**
	 * Execute a function within a transaction with organization context set for RLS
	 * This ensures SET LOCAL is properly scoped and won't leak between requests in connection pooling
	 *
	 * @param organizationId - The organization ID to set as context
	 * @param fn - Function to execute within the transaction context
	 * @param options - Optional configuration
	 * @param options.overrideAccess - Bypass RLS policies (for system operations)
	 * @param options.userId - User ID for audit logging
	 * @param options.userRole - User role for RLS policy checks
	 * @returns The result of the function
	 *
	 * @example
	 * // Regular operation with RLS
	 * const documents = await adapter.withOrgContext(auth.organizationId, async () => {
	 *   return adapter.findManyDoc(auth.organizationId, { type: 'post' });
	 * });
	 *
	 * @example
	 * // System operation bypassing RLS
	 * const allDocuments = await adapter.withOrgContext('system', async () => {
	 *   return adapter.findManyDoc('', { type: 'post' });
	 * }, { overrideAccess: true });
	 */
	async withOrgContext<T>(
		organizationId: string,
		fn: () => Promise<T>,
		options?: {
			overrideAccess?: boolean;
			userId?: string;
			userRole?: string;
		}
	): Promise<T> {
		if (!this.rlsEnabled) {
			// If RLS is disabled, just execute the function directly
			return fn();
		}

		// If overrideAccess is true, bypass RLS but still use transaction for consistency
		if (options?.overrideAccess) {
			return this.db.transaction(async (tx) => {
				// Set override flag - RLS policies will check this
				await tx.execute(sql.raw(`SET LOCAL app.override_access = 'true'`));
				return fn();
			});
		}

		// Validate organizationId is a valid UUID to prevent SQL injection
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (organizationId && !uuidRegex.test(organizationId)) {
			throw new Error('Invalid organization ID format');
		}

		// Use Drizzle's transaction API - SET LOCAL is automatically cleared on commit
		return this.db.transaction(async (tx) => {
			// Set the organization context for this transaction
			// Note: SET LOCAL doesn't support parameterized queries, so we use sql.raw()
			// The organizationId is validated as a UUID above to prevent SQL injection
			await tx.execute(sql.raw(`SET LOCAL app.organization_id = '${organizationId}'`));

			// Set user context if provided (for audit and role-based policies)
			if (options?.userId) {
				await tx.execute(sql.raw(`SET LOCAL app.user_id = '${options.userId}'`));
			}
			if (options?.userRole) {
				await tx.execute(sql.raw(`SET LOCAL app.user_role = '${options.userRole}'`));
			}

			// Execute the provided function
			// Note: The function should use the same db adapter, the transaction context applies to the connection
			return fn();
		});
	}


	/**
	 * Get all child organizations for a given parent organization
	 * Used for parent-child hierarchy access control
	 * @param parentOrganizationId - The parent organization ID
	 * @returns Array of child organization IDs
	 */
	async getChildOrganizations(parentOrganizationId: string): Promise<string[]> {
		if (!this.hierarchyEnabled) {
			return []; // No hierarchy support
		}

		try {
			const children = await this.db
				.select({ id: this.tables.organizations.id })
				.from(this.tables.organizations)
				.where(eq(this.tables.organizations.parentOrganizationId, parentOrganizationId));

			return children.map((child) => child.id);
		} catch (error) {
			console.error('[PostgreSQLAdapter]: Failed to get child organizations:', error);
			throw error;
		}
	}

	// Connection management
	async disconnect(): Promise<void> {
		// Connection is managed by the app, not the adapter
		// This method is here for interface compatibility
	}

	// Health check
	async isHealthy(): Promise<boolean> {
		try {
			// Simple health check - try a basic query
			await this.db.select().from(this.tables.organizations).limit(1);
			return true;
		} catch (error) {
			console.error('Database health check failed:', error);
			return false;
		}
	}
}

// Re-export for convenience
export { PostgreSQLDocumentAdapter } from './document-adapter';
export { PostgreSQLAssetAdapter } from './asset-adapter';

// Export schema (table definitions for Drizzle)
export { cmsSchema } from './schema';
export type { CMSSchema } from './schema';

// Export individual schema tables for app usage
export { documents, assets, schemaTypes, documentStatusEnum, schemaTypeEnum } from './schema';

// Re-export universal types from cms-core for convenience
// Apps can import from either @aphexcms/cms-core or @aphexcms/postgresql-adapter
export type {
	Document,
	NewDocument,
	Asset,
	NewAsset,
	SchemaType,
	NewSchemaType
} from '@aphexcms/cms-core/server';

/**
 * PostgreSQL-specific configuration options
 */
export interface PostgreSQLConfig {
	/** Pre-initialized postgres client (recommended for connection pooling) */
	client?: any;
	/** Connection string (if not providing client) */
	connectionString?: string;
	/** Connection pool options (if using connectionString) */
	options?: {
		max?: number; // Maximum connections in pool (default: 10)
		idle_timeout?: number; // Close idle connections after N seconds (default: 20)
		connect_timeout?: number; // Connection timeout in seconds (default: 10)
		[key: string]: any; // Allow additional postgres options
	};
	/** Multi-tenancy configuration */
	multiTenancy?: {
		/**
		 * Enable Row-Level Security (RLS) policies (default: true)
		 * Provides database-level defense in depth alongside LocalAPI's PermissionChecker
		 * Can be bypassed with context.overrideAccess = true for system operations
		 */
		enableRLS?: boolean;
		/** Enable parent-child organization hierarchy (default: true) */
		enableHierarchy?: boolean;
	};
}

/**
 * PostgreSQL database provider
 */
class PostgreSQLProvider implements DatabaseProvider {
	name = 'postgresql';
	private config: PostgreSQLConfig;

	constructor(config: PostgreSQLConfig) {
		this.config = config;
	}

	createAdapter(): DatabaseAdapter {
		// Initialize database connection
		if (this.config.client) {
			const db = drizzlePostgres(this.config.client, { schema: cmsSchema });
			return new PostgreSQLAdapter({
				db,
				tables: cmsSchema,
				multiTenancy: this.config.multiTenancy
			});
		}

		if (!this.config.connectionString) {
			throw new Error('PostgreSQL adapter requires either a client or connectionString');
		}

		const client = postgres(this.config.connectionString, this.config.options);
		const db = drizzlePostgres(client, { schema: cmsSchema });
		return new PostgreSQLAdapter({
			db,
			tables: cmsSchema,
			multiTenancy: this.config.multiTenancy
		});
	}
}

/**
 * Create a PostgreSQL database provider with type-safe configuration
 *
 * @example
 * // With pre-initialized client (recommended)
 * const provider = createPostgreSQLProvider({ client: myPostgresClient });
 *
 * @example
 * // With connection string
 * const provider = createPostgreSQLProvider({
 *   connectionString: 'postgres://...',
 *   options: { max: 10, idle_timeout: 20 }
 * });
 */
export function createPostgreSQLProvider(config: PostgreSQLConfig): DatabaseProvider {
	return new PostgreSQLProvider(config);
}
