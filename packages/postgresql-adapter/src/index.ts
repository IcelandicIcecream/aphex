// PostgreSQL adapter - combines document and asset adapters
import type { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { eq, and } from 'drizzle-orm';
import type {
	DatabaseAdapter,
	DatabaseProvider,
	FindOptions,
	AssetFilters,
	NewOrganizationMember,
	SchemaType,
	AppendEventInput,
	ScheduleJobInput,
	ClaimJobsOptions,
	ListEventsOptions,
	ListJobsOptions,
	ListUnprocessedOutboxOptions,
	CreatePluginRecordInput,
	ListPluginRecordsOptions
} from '@aphexcms/cms-core/server';
import type { Capability, NewRole } from '@aphexcms/cms-core';
import { PostgreSQLDocumentAdapter } from './document-adapter';
import { PostgreSQLAssetAdapter } from './asset-adapter';
import { PostgreSQLUserProfileAdapter } from './user-adapter';
import { PostgreSQLSchemaAdapter } from './schema-adapter';
import { PostgreSQLOrganizationAdapter } from './organization-adapter';
import { PostgreSQLRolesAdapter } from './roles-adapter';
import { PostgreSQLReferenceAdapter } from './reference-adapter';
import { PostgreSQLEventJobAdapter } from './event-job-adapter';
import { PostgreSQLPluginStorageAdapter } from './plugin-storage-adapter';
import type { CMSSchema } from './schema';
import { cmsSchema } from './schema';

/** The transaction handle drizzle passes to a `db.transaction(tx => …)` callback. */
type DrizzleTx = Parameters<Parameters<ReturnType<typeof drizzle>['transaction']>[0]>[0];

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
	private rolesAdapter: PostgreSQLRolesAdapter;
	private referenceAdapter: PostgreSQLReferenceAdapter;
	private eventJobAdapter: PostgreSQLEventJobAdapter;
	private pluginStorageAdapter: PostgreSQLPluginStorageAdapter;
	public readonly rlsEnabled: boolean;
	public readonly hierarchyEnabled: boolean;
	// Single-connection mode (pglite): the driver has ONE connection, so the usual
	// `db.transaction(tx => …)` + inner queries on `this.db` deadlocks (the inner query can't
	// get a second connection). In this mode withOrgContext rebinds the sub-adapters to `tx`
	// and serializes via a mutex so the rebind is safe. See withOrgContext below.
	private readonly singleConnection: boolean;
	private opQueue: Promise<unknown> = Promise.resolve();
	private inSingleConnTx = false;

	constructor(config: {
		db: ReturnType<typeof drizzle>; // Drizzle client with full schema (CMS + Auth)
		tables: CMSSchema; // CMS-specific tables for adapter to use
		multiTenancy?: {
			enableRLS?: boolean;
			enableHierarchy?: boolean;
		};
		/** Set true for single-connection drivers (pglite) — see field docs above. */
		singleConnection?: boolean;
	}) {
		this.db = config.db;
		this.tables = config.tables;
		this.singleConnection = config.singleConnection ?? false;

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
		this.rolesAdapter = new PostgreSQLRolesAdapter(this.db, this.tables);
		this.referenceAdapter = new PostgreSQLReferenceAdapter(this.db as any, this.tables);
		this.eventJobAdapter = new PostgreSQLEventJobAdapter(this.db as any, this.tables);
		this.pluginStorageAdapter = new PostgreSQLPluginStorageAdapter(this.db as any, this.tables);
	}

	/**
	 * Run `fn` inside org context only when RLS is actually enforced on this connection.
	 *
	 * Pooled Postgres connects as the table owner, which bypasses RLS — these reference/version
	 * methods can run directly (and historically did, with no transaction). The single pglite
	 * connection runs as a non-superuser with RLS enforced, so the policy's
	 * current_setting('app.organization_id') GUC must be set or its ::uuid subquery throws on the
	 * leftover '' from a prior SET LOCAL. Gate on singleConnection so Postgres keeps its behavior.
	 */
	private maybeOrgContext<T>(
		organizationId: string,
		fn: () => Promise<T>,
		options?: { overrideAccess?: boolean }
	): Promise<T> {
		return this.singleConnection ? this.withOrgContext(organizationId, fn, options) : fn();
	}

	// Reference operations - delegate to reference adapter
	async replaceReferencesFor(organizationId: string, referencerId: string, refIds: string[]) {
		return this.maybeOrgContext(organizationId, () =>
			this.referenceAdapter.replaceReferencesFor(organizationId, referencerId, refIds)
		);
	}

	async findBackReferences(organizationId: string, refId: string) {
		return this.maybeOrgContext(organizationId, () =>
			this.referenceAdapter.findBackReferences(organizationId, refId)
		);
	}

	async findBackReferencesForMany(organizationId: string, refIds: string[]) {
		return this.maybeOrgContext(organizationId, () =>
			this.referenceAdapter.findBackReferencesForMany(organizationId, refIds)
		);
	}

	async hasAnyReferences(organizationId: string) {
		return this.maybeOrgContext(organizationId, () =>
			this.referenceAdapter.hasAnyReferences(organizationId)
		);
	}

	async bulkInsertReferences(
		rows: Array<{ organizationId: string; referencerId: string; refId: string }>
	) {
		// Rows may span organizations, so there's no single org to set — run with overrideAccess
		// (RLS bypassed by the policy's override branch). On Postgres this is a plain direct call.
		return this.maybeOrgContext('', () => this.referenceAdapter.bulkInsertReferences(rows), {
			overrideAccess: true
		});
	}

	/**
	 * List all documents for an org with just the minimal fields the
	 * references backfill needs. Single query, no per-type filtering —
	 * the backfill walks data via the schema-aware walker which already
	 * resolves the schema by `type`.
	 */
	async listAllDocsForOrg(
		organizationId: string
	): Promise<Array<{ id: string; type: string; data: unknown }>> {
		return this.withOrgContext(organizationId, async () => {
			const rows = await this.db
				.select({
					id: this.tables.documents.id,
					type: this.tables.documents.type,
					draftData: this.tables.documents.draftData
				})
				.from(this.tables.documents)
				.where(eq(this.tables.documents.organizationId, organizationId));
			return rows.map((r) => ({ id: r.id, type: r.type, data: r.draftData }));
		});
	}

	// Role operations - delegate to roles adapter
	async listRoles(organizationId: string) {
		return this.rolesAdapter.listRoles(organizationId);
	}

	async findRoleByName(organizationId: string, name: string) {
		return this.rolesAdapter.findRoleByName(organizationId, name);
	}

	async createRole(data: NewRole) {
		return this.rolesAdapter.createRole(data);
	}

	async updateRole(
		organizationId: string,
		name: string,
		data: { description?: string | null; capabilities?: Capability[] }
	) {
		return this.rolesAdapter.updateRole(organizationId, name, data);
	}

	async deleteRole(organizationId: string, name: string) {
		return this.rolesAdapter.deleteRole(organizationId, name);
	}

	async seedBuiltinRoles(organizationId: string, ownerCapabilities?: string[]) {
		return this.rolesAdapter.seedBuiltinRoles(organizationId, ownerCapabilities);
	}

	/**
	 * Retry a document op against the doc's actual (child-org) home when the caller's
	 * organizationId doesn't own it directly — hierarchy access lets a parent-org caller
	 * operate on a child org's document. A thrown error (e.g. RevisionConflictError)
	 * propagates without retrying: a conflict means the doc WAS found, so the "not found,
	 * maybe it's in a child org" fallback doesn't apply.
	 */
	private async withHierarchyFallback<T>(
		organizationId: string,
		id: string,
		op: (organizationId: string) => Promise<T>
	): Promise<T> {
		const result = await op(organizationId);
		if (result || !this.hierarchyEnabled) return result;

		const childOrgIds = await this.getChildOrganizations(organizationId);
		const found = await this.documentAdapter.findDocByIdInOrgs(
			[organizationId, ...childOrgIds],
			id
		);
		return found ? op(found.organizationId) : result;
	}

	// Document operations - delegate to document adapter with RLS context
	async createDocument(data: any) {
		return this.withOrgContext(data.organizationId, () =>
			this.documentAdapter.createDocument(data)
		);
	}

	async updateDocDraft(
		organizationId: string,
		id: string,
		data: any,
		updatedBy?: string,
		expectedRevision?: number
	) {
		return this.withOrgContext(organizationId, () =>
			this.withHierarchyFallback(organizationId, id, (orgId) =>
				this.documentAdapter.updateDocDraft(orgId, id, data, updatedBy, expectedRevision)
			)
		);
	}

	async deleteDocById(organizationId: string, id: string) {
		return this.withOrgContext(organizationId, () =>
			this.withHierarchyFallback(organizationId, id, (orgId) =>
				this.documentAdapter.deleteDocById(orgId, id)
			)
		);
	}

	async publishDoc(organizationId: string, id: string, expectedRevision?: number) {
		return this.withOrgContext(organizationId, () =>
			this.withHierarchyFallback(organizationId, id, (orgId) =>
				this.documentAdapter.publishDoc(orgId, id, expectedRevision)
			)
		);
	}

	async unpublishDoc(organizationId: string, id: string, expectedRevision?: number) {
		return this.withOrgContext(organizationId, () =>
			this.withHierarchyFallback(organizationId, id, (orgId) =>
				this.documentAdapter.unpublishDoc(orgId, id, expectedRevision)
			)
		);
	}

	async countDocsByType(organizationId: string, type: string) {
		return this.withOrgContext(organizationId, async () => {
			if (this.hierarchyEnabled) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				return this.documentAdapter.countDocsByTypeMultiOrg([organizationId, ...childOrgIds], type);
			}
			return this.documentAdapter.countDocsByType(organizationId, type);
		});
	}

	async getDocCountsByType(organizationId: string) {
		return this.withOrgContext(organizationId, async () => {
			if (this.hierarchyEnabled) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				return this.documentAdapter.getDocCountsByTypeMultiOrg([organizationId, ...childOrgIds]);
			}
			return this.documentAdapter.getDocCountsByType(organizationId);
		});
	}

	// Asset operations - delegate to asset adapter with RLS context
	async createAsset(data: any) {
		return this.withOrgContext(data.organizationId, () => this.assetAdapter.createAsset(data));
	}

	async findAssetById(organizationId: string, id: string) {
		return this.withOrgContext(organizationId, async () => {
			// If hierarchy is enabled, search across parent + child orgs in single query
			if (this.hierarchyEnabled) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				const allOrgIds = [organizationId, ...childOrgIds];
				return this.assetAdapter.findAssetByIdInOrgs(allOrgIds, id);
			}

			// Otherwise just search in current org
			return this.assetAdapter.findAssetById(organizationId, id);
		});
	}

	async findAssetByIdGlobal(id: string) {
		// Bypass RLS - call adapter directly without org context
		return this.assetAdapter.findAssetByIdGlobal(id);
	}

	async findAssets(organizationId: string, filters?: any) {
		return this.withOrgContext(organizationId, async () => {
			// Only include child organizations if explicitly requested via includeChildOrganizations filter
			if (
				this.hierarchyEnabled &&
				filters?.includeChildOrganizations &&
				!filters?.filterOrganizationIds
			) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
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
		return this.withOrgContext(organizationId, async () => {
			// Try to update in current org first
			let asset = await this.assetAdapter.updateAsset(organizationId, id, data);

			// If not found and hierarchy is enabled, try child organizations
			if (!asset && this.hierarchyEnabled) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				for (const childOrgId of childOrgIds) {
					asset = await this.assetAdapter.updateAsset(childOrgId, id, data);
					if (asset) break;
				}
			}

			return asset;
		});
	}

	async deleteAsset(organizationId: string, id: string) {
		return this.withOrgContext(organizationId, async () => {
			// Try to delete in current org first
			let deleted = await this.assetAdapter.deleteAsset(organizationId, id);

			// If not found and hierarchy is enabled, try child organizations
			if (!deleted && this.hierarchyEnabled) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				for (const childOrgId of childOrgIds) {
					deleted = await this.assetAdapter.deleteAsset(childOrgId, id);
					if (deleted) break;
				}
			}

			return deleted;
		});
	}

	async countAssets(organizationId: string, filters?: AssetFilters) {
		return this.withOrgContext(organizationId, () =>
			this.assetAdapter.countAssets(organizationId, filters)
		);
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
	async findManyDocAdvanced(organizationId: string, collectionName: string, options?: FindOptions) {
		// If filterOrganizationIds is already provided (by CollectionAPI via HierarchyService),
		// skip the RLS transaction — org filtering is handled in the WHERE clause.
		//
		// Pooled Postgres connects as the table owner, which bypasses RLS, so skipping is safe there.
		// pglite (singleConnection) runs as a non-superuser role with RLS *enforced*, and the policy
		// reads current_setting('app.organization_id') — which is left as '' after any prior
		// SET LOCAL and makes the policy's ::uuid subquery throw. So on pglite we must still set the
		// org context; the app-level WHERE filter narrows within it.
		if (options?.filterOrganizationIds && !this.singleConnection) {
			return this.documentAdapter.findManyDocAdvanced(organizationId, collectionName, options);
		}

		return this.withOrgContext(organizationId, async () => {
			if (this.hierarchyEnabled && options?.includeChildOrganizations) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				if (childOrgIds.length > 0) {
					const orgIds = [organizationId, ...childOrgIds];
					return this.documentAdapter.findManyDocAdvanced(organizationId, collectionName, {
						...options,
						filterOrganizationIds: orgIds
					});
				}
			}

			return this.documentAdapter.findManyDocAdvanced(organizationId, collectionName, options);
		});
	}

	async findByDocIdAdvanced(organizationId: string, id: string, options?: Partial<FindOptions>) {
		// See findManyDocAdvanced: skip is only safe on RLS-bypassing pooled Postgres, not on the
		// RLS-enforced single pglite connection (where the org GUC must be set).
		if (options?.filterOrganizationIds && !this.singleConnection) {
			return this.documentAdapter.findByDocIdAdvanced(organizationId, id, options);
		}

		return this.withOrgContext(organizationId, async () => {
			if (this.hierarchyEnabled) {
				const childOrgIds = await this.getChildOrganizations(organizationId);
				if (childOrgIds.length > 0) {
					const orgIds = [organizationId, ...childOrgIds];
					return this.documentAdapter.findByDocIdAdvanced(organizationId, id, {
						...options,
						filterOrganizationIds: orgIds
					});
				}
			}

			return this.documentAdapter.findByDocIdAdvanced(organizationId, id, options);
		});
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

	async findAssetByIdAdvanced(organizationId: string, id: string) {
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

	async findAllOrganizations() {
		return this.organizationAdapter.findAllOrganizations();
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

	async updateMemberRole(organizationId: string, userId: string, role: string) {
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

	async deleteInvitation(id: string, organizationId?: string) {
		return this.organizationAdapter.deleteInvitation(id, organizationId);
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

	async updateUserPreferences(
		userId: string,
		preferences: { includeChildOrganizations?: boolean }
	) {
		return this.userProfileAdapter.updateUserPreferences(userId, preferences);
	}

	// Instance settings operations
	async getInstanceSettings() {
		const result = await this.db
			.select()
			.from(this.tables.instanceSettings)
			.where(eq(this.tables.instanceSettings.id, 'default'))
			.limit(1);

		const defaults = { allowUserOrgCreation: false };

		if (result.length === 0 || !result[0]) {
			return defaults;
		}

		return (result[0].settings ?? defaults) as Record<string, any>;
	}

	async updateInstanceSettings(settings: Record<string, any>) {
		const existing = await this.db
			.select()
			.from(this.tables.instanceSettings)
			.where(eq(this.tables.instanceSettings.id, 'default'))
			.limit(1);

		if (existing.length === 0) {
			// Insert new row
			const rows = await this.db
				.insert(this.tables.instanceSettings)
				.values({
					id: 'default',
					settings,
					updatedAt: new Date()
				})
				.returning();
			return (rows[0]?.settings ?? settings) as Record<string, any>;
		}

		// Merge with existing settings
		const merged = { ...((existing[0]?.settings as Record<string, any>) ?? {}), ...settings };
		const rows = await this.db
			.update(this.tables.instanceSettings)
			.set({ settings: merged, updatedAt: new Date() })
			.where(eq(this.tables.instanceSettings.id, 'default'))
			.returning();
		return (rows[0]?.settings ?? merged) as Record<string, any>;
	}

	// Plugin settings operations — the generic per-(org, plugin) config store.
	// Wrapped in withOrgContext so the RLS policy (pglite / RLS-enforced Postgres)
	// admits the row; on SQLite/pooled-owner Postgres it's a passthrough and the
	// WHERE clause below does the isolation.
	async getPluginSettings(
		organizationId: string,
		pluginId: string
	): Promise<Record<string, unknown> | null> {
		return this.withOrgContext(organizationId, async () => {
			const result = await this.db
				.select()
				.from(this.tables.pluginSettings)
				.where(
					and(
						eq(this.tables.pluginSettings.organizationId, organizationId),
						eq(this.tables.pluginSettings.pluginId, pluginId)
					)
				)
				.limit(1);

			if (result.length === 0 || !result[0]) return null;
			return result[0].values ?? {};
		});
	}

	async setPluginSettings(
		organizationId: string,
		pluginId: string,
		values: Record<string, unknown>
	): Promise<void> {
		await this.withOrgContext(organizationId, async () => {
			await this.db
				.insert(this.tables.pluginSettings)
				.values({ organizationId, pluginId, values, updatedAt: new Date() })
				.onConflictDoUpdate({
					target: [this.tables.pluginSettings.organizationId, this.tables.pluginSettings.pluginId],
					set: { values, updatedAt: new Date() }
				});
		});
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
			await this.db.execute(
				sql.raw(`ALTER TABLE cms_plugin_settings ${action} ROW LEVEL SECURITY`)
			);
		} catch (error) {
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

		// Single-connection drivers (pglite) need a different strategy — see runOrgContextSingle.
		if (this.singleConnection) {
			return this.runOrgContextSingle(organizationId, fn, options);
		}

		// If overrideAccess is true, bypass RLS but still use transaction for consistency
		if (options?.overrideAccess) {
			return this.db.transaction(async (tx) => {
				// Pin a valid zero-UUID sentinel for app.organization_id even though override
				// bypasses the org check. The RLS policy still casts
				// current_setting('app.organization_id')::uuid inside its subquery, and after a
				// prior SET LOCAL commits the GUC is left as '' (empty) rather than NULL — so
				// '' ::uuid would throw. The zero UUID is a valid, no-match value. (Latent on
				// pooled Postgres where NULL is common; deterministic on single-connection pglite.)
				await tx.execute(
					sql.raw(`SET LOCAL app.organization_id = '00000000-0000-0000-0000-000000000000'`)
				);
				// Set override flag - RLS policies will check this
				await tx.execute(sql.raw(`SET LOCAL app.override_access = 'true'`));
				return fn();
			});
		}

		// Validate organizationId is a valid UUID to prevent SQL injection
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!organizationId || !uuidRegex.test(organizationId)) {
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
	 * withOrgContext for single-connection drivers (pglite).
	 *
	 * The pooled-Postgres path opens a transaction and runs `fn()` on the *main* `this.db` — that
	 * works because the pool hands the inner queries a second physical connection. pglite has ONE
	 * connection: once `db.transaction()` holds it, any query issued on `this.db` waits for a
	 * connection that will never free up → deadlock (and an aborted-signal timeout upstream).
	 *
	 * Fix: rebind `this.db` and every sub-adapter to the transaction handle `tx` for the duration
	 * of `fn()`, so all work runs *on* the held connection. Because the rebind mutates shared
	 * instance state, calls are serialized through a mutex (`opQueue`). Nested withOrgContext calls
	 * (sub-adapters that re-enter) reuse the already-bound tx and just re-issue SET LOCAL.
	 */
	private async runOrgContextSingle<T>(
		organizationId: string,
		fn: () => Promise<T>,
		options?: { overrideAccess?: boolean; userId?: string; userRole?: string }
	): Promise<T> {
		const applyContext = async (exec: (q: ReturnType<typeof sql.raw>) => Promise<unknown>) => {
			if (options?.overrideAccess) {
				// Zero-UUID sentinel — see the pooled override path for the rationale.
				await exec(
					sql.raw(`SET LOCAL app.organization_id = '00000000-0000-0000-0000-000000000000'`)
				);
				await exec(sql.raw(`SET LOCAL app.override_access = 'true'`));
				return;
			}
			const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			if (!organizationId || !uuidRegex.test(organizationId)) {
				throw new Error('Invalid organization ID format');
			}
			await exec(sql.raw(`SET LOCAL app.organization_id = '${organizationId}'`));
			if (options?.userId) await exec(sql.raw(`SET LOCAL app.user_id = '${options.userId}'`));
			if (options?.userRole) await exec(sql.raw(`SET LOCAL app.user_role = '${options.userRole}'`));
		};

		// Already inside a single-connection transaction (a sub-adapter re-entered withOrgContext):
		// `this.db` is the tx handle, so just re-apply the context and run inline. No new tx, no
		// mutex (we already hold it).
		if (this.inSingleConnTx) {
			await applyContext((q) => this.db.execute(q));
			return fn();
		}

		return this.runExclusive(() =>
			this.db.transaction(async (tx) => {
				const restore = this.bindToTx(tx);
				try {
					await applyContext((q) => tx.execute(q));
					return await fn();
				} finally {
					restore();
				}
			})
		);
	}

	/** Serialize work on the single shared connection so tx-rebinds can't interleave. */
	private runExclusive<T>(task: () => Promise<T>): Promise<T> {
		const run = this.opQueue.then(task, task);
		// Keep the chain alive regardless of this task's outcome; swallow to avoid unhandled rejections.
		this.opQueue = run.then(
			() => undefined,
			() => undefined
		);
		return run;
	}

	/**
	 * Point `this.db` and all sub-adapters at the transaction handle `tx`, returning a restore
	 * closure that puts them back. Used only in single-connection mode, under the mutex.
	 *
	 * `tx` is a `PgTransaction`, which exposes the same query surface the adapter uses but is not
	 * structurally the full `drizzle` db (it lacks `$client`). Treating it as the db for the
	 * duration of the callback is the same boundary `withTransaction` crosses; we cross it once,
	 * here, rather than scattering casts through every sub-adapter assignment.
	 */
	private bindToTx(tx: DrizzleTx): () => void {
		const txDb = tx as unknown as ReturnType<typeof drizzle>;
		const prevDb = this.db;
		const prev = {
			documentAdapter: this.documentAdapter,
			assetAdapter: this.assetAdapter,
			userProfileAdapter: this.userProfileAdapter,
			schemaAdapter: this.schemaAdapter,
			organizationAdapter: this.organizationAdapter,
			rolesAdapter: this.rolesAdapter,
			referenceAdapter: this.referenceAdapter,
			eventJobAdapter: this.eventJobAdapter,
			pluginStorageAdapter: this.pluginStorageAdapter
		};
		this.db = txDb;
		this.documentAdapter = new (prev.documentAdapter.constructor as any)(txDb, this.tables);
		this.assetAdapter = new (prev.assetAdapter.constructor as any)(txDb, this.tables);
		this.userProfileAdapter = new (prev.userProfileAdapter.constructor as any)(txDb, this.tables);
		this.schemaAdapter = new (prev.schemaAdapter.constructor as any)(txDb, this.tables);
		this.organizationAdapter = new (prev.organizationAdapter.constructor as any)(txDb, this.tables);
		this.rolesAdapter = new (prev.rolesAdapter.constructor as any)(txDb, this.tables);
		this.referenceAdapter = new (prev.referenceAdapter.constructor as any)(txDb, this.tables);
		this.eventJobAdapter = new (prev.eventJobAdapter.constructor as any)(txDb, this.tables);
		this.pluginStorageAdapter = new (prev.pluginStorageAdapter.constructor as any)(
			txDb,
			this.tables
		);
		this.inSingleConnTx = true;
		return () => {
			this.db = prevDb;
			this.documentAdapter = prev.documentAdapter;
			this.assetAdapter = prev.assetAdapter;
			this.userProfileAdapter = prev.userProfileAdapter;
			this.schemaAdapter = prev.schemaAdapter;
			this.organizationAdapter = prev.organizationAdapter;
			this.rolesAdapter = prev.rolesAdapter;
			this.referenceAdapter = prev.referenceAdapter;
			this.eventJobAdapter = prev.eventJobAdapter;
			this.pluginStorageAdapter = prev.pluginStorageAdapter;
			this.inSingleConnTx = false;
		};
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
			throw error;
		}
	}

	// Asset reference methods
	async findDocumentsReferencingAsset(
		organizationId: string,
		assetId: string,
		knownTypes?: string[]
	) {
		return this.withOrgContext(organizationId, () =>
			this.documentAdapter.findDocumentsReferencingAsset(organizationId, assetId, knownTypes)
		);
	}

	async countDocumentReferencesForAssets(
		organizationId: string,
		assetIds: string[],
		knownTypes?: string[]
	) {
		return this.withOrgContext(organizationId, () =>
			this.documentAdapter.countDocumentReferencesForAssets(organizationId, assetIds, knownTypes)
		);
	}

	async clearAssetFromPublishedData(organizationId: string, assetId: string) {
		return this.withOrgContext(organizationId, () =>
			this.documentAdapter.clearAssetFromPublishedData(organizationId, assetId)
		);
	}

	// Version history — wrapped with org context for RLS
	async createDocumentVersion(data: {
		documentId: string;
		organizationId: string;
		eventType: 'draft' | 'publish';
		data: any;
		createdBy?: string | null;
	}) {
		return this.withOrgContext(data.organizationId, () =>
			this.documentAdapter.createDocumentVersion(data)
		);
	}

	async listDocumentVersions(
		organizationId: string,
		documentId: string,
		options?: { limit?: number; offset?: number }
	) {
		return this.withOrgContext(organizationId, () =>
			this.documentAdapter.listDocumentVersions(organizationId, documentId, options)
		);
	}

	async getDocumentVersion(organizationId: string, documentId: string, versionNumber: number) {
		return this.withOrgContext(organizationId, () =>
			this.documentAdapter.getDocumentVersion(organizationId, documentId, versionNumber)
		);
	}

	async deleteDocumentVersions(documentId: string, versionIds: string[]) {
		// No org param here; on the RLS-enforced single connection run with overrideAccess so the
		// version-table policy doesn't block the delete (and its GUC cast doesn't throw on '').
		return this.maybeOrgContext(
			'',
			() => this.documentAdapter.deleteDocumentVersions(documentId, versionIds),
			{ overrideAccess: true }
		);
	}

	// Event log + job queue — org context set for RLS, same as every other write.
	// Inside withTransaction the eventJobAdapter is rebound to the tx handle, so an
	// appendEvent alongside a state change commits atomically with it (transactional outbox).
	async appendEvent(input: AppendEventInput) {
		return this.withOrgContext(input.organizationId, () => this.eventJobAdapter.appendEvent(input));
	}

	async getEvent(organizationId: string, id: string) {
		return this.withOrgContext(organizationId, () =>
			this.eventJobAdapter.getEvent(organizationId, id)
		);
	}

	async listEvents(options: ListEventsOptions) {
		return this.withOrgContext(options.organizationId, () =>
			this.eventJobAdapter.listEvents(options)
		);
	}

	async listUnprocessedOutbox(options: ListUnprocessedOutboxOptions) {
		// Worker-wide read (no org) runs with override access, mirroring claimDueJobs; an
		// org-scoped relay sets the GUC so RLS filters to that tenant's outbox.
		return options.organizationId
			? this.withOrgContext(options.organizationId, () =>
					this.eventJobAdapter.listUnprocessedOutbox(options)
				)
			: this.withOrgContext('', () => this.eventJobAdapter.listUnprocessedOutbox(options), {
					overrideAccess: true
				});
	}

	async markOutboxProcessed(organizationId: string, id: string) {
		return this.withOrgContext(organizationId, () =>
			this.eventJobAdapter.markOutboxProcessed(organizationId, id)
		);
	}

	// --- Plugin storage ---
	async createPluginRecord(input: CreatePluginRecordInput) {
		return this.withOrgContext(input.organizationId, () =>
			this.pluginStorageAdapter.createPluginRecord(input)
		);
	}

	async getPluginRecord(organizationId: string, id: string) {
		return this.withOrgContext(organizationId, () =>
			this.pluginStorageAdapter.getPluginRecord(organizationId, id)
		);
	}

	async listPluginRecords(options: ListPluginRecordsOptions) {
		return this.withOrgContext(options.organizationId, () =>
			this.pluginStorageAdapter.listPluginRecords(options)
		);
	}

	async scheduleJob(input: ScheduleJobInput) {
		return this.withOrgContext(input.organizationId, () => this.eventJobAdapter.scheduleJob(input));
	}

	async claimDueJobs(options: ClaimJobsOptions) {
		// Worker-wide claim (no org) runs with override access; org-scoped claim sets the GUC.
		return options.organizationId
			? this.withOrgContext(options.organizationId, () =>
					this.eventJobAdapter.claimDueJobs(options)
				)
			: this.withOrgContext('', () => this.eventJobAdapter.claimDueJobs(options), {
					overrideAccess: true
				});
	}

	async completeJob(organizationId: string, id: string) {
		return this.withOrgContext(organizationId, () =>
			this.eventJobAdapter.completeJob(organizationId, id)
		);
	}

	async retryJob(organizationId: string, id: string, options: { runAt: Date; error: string }) {
		return this.withOrgContext(organizationId, () =>
			this.eventJobAdapter.retryJob(organizationId, id, options)
		);
	}

	async failJob(organizationId: string, id: string, options: { error: string }) {
		return this.withOrgContext(organizationId, () =>
			this.eventJobAdapter.failJob(organizationId, id, options)
		);
	}

	async cancelJob(organizationId: string, id: string) {
		return this.withOrgContext(organizationId, () =>
			this.eventJobAdapter.cancelJob(organizationId, id)
		);
	}

	async listJobs(options: ListJobsOptions) {
		return this.withOrgContext(options.organizationId, () =>
			this.eventJobAdapter.listJobs(options)
		);
	}

	// Transaction support
	async withTransaction<T>(fn: (adapter: any) => Promise<T>): Promise<T> {
		return this.db.transaction(async (tx) => {
			// Create a transactional adapter where all operations use tx
			const txAdapter = Object.create(this);
			txAdapter.db = tx;
			txAdapter.documentAdapter = new (this.documentAdapter.constructor as any)(tx, this.tables);
			// Rebind the event/job adapter too so appendEvent/scheduleJob issued inside the
			// callback run on the transaction (the outbox guarantee).
			txAdapter.eventJobAdapter = new (this.eventJobAdapter.constructor as any)(tx, this.tables);
			txAdapter.pluginStorageAdapter = new (this.pluginStorageAdapter.constructor as any)(
				tx,
				this.tables
			);
			// Override withOrgContext to use SET LOCAL within the existing transaction
			// instead of opening a new one
			txAdapter.withOrgContext = async <U>(
				organizationId: string,
				innerFn: () => Promise<U>,
				options?: { overrideAccess?: boolean }
			): Promise<U> => {
				if (!this.rlsEnabled) return innerFn();
				if (options?.overrideAccess) {
					await tx.execute(sql.raw(`SET LOCAL app.override_access = 'true'`));
					return innerFn();
				}
				const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
				if (organizationId && !uuidRegex.test(organizationId)) {
					throw new Error('Invalid organization ID format');
				}
				await tx.execute(sql.raw(`SET LOCAL app.organization_id = '${organizationId}'`));
				return innerFn();
			};
			return fn(txAdapter);
		});
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
		} catch {
			// health check failed
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
export {
	documents,
	assets,
	schemaTypes,
	instanceSettings,
	documentStatusEnum,
	schemaTypeEnum
} from './schema';

// Export PostgreSQL connection URL utility
export { pgConnectionUrl } from './utils/pg-connection';

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
