// SQLite adapter - combines document and asset adapters
// Runs on libsql: plain `file:` databases locally, `libsql://` for Turso-hosted SQLite.
//
// Tenancy note: SQLite has no row-level security. Org isolation relies on the explicit
// organization_id WHERE clauses every sub-adapter query applies — which is the same
// mechanism that actually isolates tenants on pooled Postgres (where the owner connection
// bypasses RLS anyway). withOrgContext is therefore a passthrough here.
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import type {
	DatabaseAdapter,
	DatabaseProvider,
	FindOptions,
	AssetFilters,
	NewOrganizationMember,
	SchemaType
} from '@aphexcms/cms-core/server';
import type { Capability, NewRole } from '@aphexcms/cms-core';
import { SQLiteDocumentAdapter } from './document-adapter';
import { SQLiteAssetAdapter } from './asset-adapter';
import { SQLiteUserProfileAdapter } from './user-adapter';
import { SQLiteSchemaAdapter } from './schema-adapter';
import { SQLiteOrganizationAdapter } from './organization-adapter';
import { SQLiteRolesAdapter } from './roles-adapter';
import { SQLiteReferenceAdapter } from './reference-adapter';
import type { CMSSchema } from './schema';
import { cmsSchema } from './schema';

/**
 * Combined SQLite adapter that implements the full DatabaseAdapter interface
 * Composes document, asset, user profile, schema, and organization adapters
 */
export class SQLiteAdapter implements DatabaseAdapter {
	private db: ReturnType<typeof drizzle>;
	private tables: CMSSchema;
	private documentAdapter: SQLiteDocumentAdapter;
	private assetAdapter: SQLiteAssetAdapter;
	private userProfileAdapter: SQLiteUserProfileAdapter;
	private schemaAdapter: SQLiteSchemaAdapter;
	private organizationAdapter: SQLiteOrganizationAdapter;
	private rolesAdapter: SQLiteRolesAdapter;
	private referenceAdapter: SQLiteReferenceAdapter;
	public readonly hierarchyEnabled: boolean;

	constructor(config: {
		db: ReturnType<typeof drizzle>; // Drizzle client with full schema (CMS + Auth)
		tables: CMSSchema; // CMS-specific tables for adapter to use
		multiTenancy?: {
			enableHierarchy?: boolean;
		};
	}) {
		this.db = config.db;
		this.tables = config.tables;

		// Application-level security comes from LocalAPI's PermissionChecker plus the
		// organization_id WHERE clauses in every query below.
		this.hierarchyEnabled = config.multiTenancy?.enableHierarchy ?? true;

		// Pass the Drizzle instance and tables to all adapters
		this.documentAdapter = new SQLiteDocumentAdapter(this.db, this.tables);
		this.assetAdapter = new SQLiteAssetAdapter(this.db, this.tables);
		this.userProfileAdapter = new SQLiteUserProfileAdapter(this.db, this.tables);
		this.schemaAdapter = new SQLiteSchemaAdapter(this.db, this.tables);
		this.organizationAdapter = new SQLiteOrganizationAdapter(this.db, this.tables);
		this.rolesAdapter = new SQLiteRolesAdapter(this.db, this.tables);
		this.referenceAdapter = new SQLiteReferenceAdapter(this.db as any, this.tables);
	}

	// Reference operations - delegate to reference adapter
	async replaceReferencesFor(organizationId: string, referencerId: string, refIds: string[]) {
		return this.referenceAdapter.replaceReferencesFor(organizationId, referencerId, refIds);
	}

	async findBackReferences(organizationId: string, refId: string) {
		return this.referenceAdapter.findBackReferences(organizationId, refId);
	}

	async findBackReferencesForMany(organizationId: string, refIds: string[]) {
		return this.referenceAdapter.findBackReferencesForMany(organizationId, refIds);
	}

	async hasAnyReferences(organizationId: string) {
		return this.referenceAdapter.hasAnyReferences(organizationId);
	}

	async bulkInsertReferences(
		rows: Array<{ organizationId: string; referencerId: string; refId: string }>
	) {
		return this.referenceAdapter.bulkInsertReferences(rows);
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
		const rows = await this.db
			.select({
				id: this.tables.documents.id,
				type: this.tables.documents.type,
				draftData: this.tables.documents.draftData
			})
			.from(this.tables.documents)
			.where(eq(this.tables.documents.organizationId, organizationId));
		return rows.map((r) => ({ id: r.id, type: r.type, data: r.draftData }));
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

	async seedBuiltinRoles(organizationId: string) {
		return this.rolesAdapter.seedBuiltinRoles(organizationId);
	}

	// Document operations - delegate to document adapter
	async createDocument(data: any) {
		return this.documentAdapter.createDocument(data);
	}

	async updateDocDraft(organizationId: string, id: string, data: any, updatedBy?: string) {
		let document = await this.documentAdapter.updateDocDraft(organizationId, id, data, updatedBy);

		if (!document && this.hierarchyEnabled) {
			const childOrgIds = await this.getChildOrganizations(organizationId);
			const found = await this.documentAdapter.findDocByIdInOrgs(
				[organizationId, ...childOrgIds],
				id
			);
			if (found) {
				document = await this.documentAdapter.updateDocDraft(
					found.organizationId,
					id,
					data,
					updatedBy
				);
			}
		}

		return document;
	}

	async deleteDocById(organizationId: string, id: string) {
		let deleted = await this.documentAdapter.deleteDocById(organizationId, id);

		if (!deleted && this.hierarchyEnabled) {
			const childOrgIds = await this.getChildOrganizations(organizationId);
			const found = await this.documentAdapter.findDocByIdInOrgs(
				[organizationId, ...childOrgIds],
				id
			);
			if (found) {
				deleted = await this.documentAdapter.deleteDocById(found.organizationId, id);
			}
		}

		return deleted;
	}

	async publishDoc(organizationId: string, id: string) {
		let document = await this.documentAdapter.publishDoc(organizationId, id);

		if (!document && this.hierarchyEnabled) {
			const childOrgIds = await this.getChildOrganizations(organizationId);
			const found = await this.documentAdapter.findDocByIdInOrgs(
				[organizationId, ...childOrgIds],
				id
			);
			if (found) {
				document = await this.documentAdapter.publishDoc(found.organizationId, id);
			}
		}

		return document;
	}

	async unpublishDoc(organizationId: string, id: string) {
		let document = await this.documentAdapter.unpublishDoc(organizationId, id);

		if (!document && this.hierarchyEnabled) {
			const childOrgIds = await this.getChildOrganizations(organizationId);
			const found = await this.documentAdapter.findDocByIdInOrgs(
				[organizationId, ...childOrgIds],
				id
			);
			if (found) {
				document = await this.documentAdapter.unpublishDoc(found.organizationId, id);
			}
		}

		return document;
	}

	async countDocsByType(organizationId: string, type: string) {
		if (this.hierarchyEnabled) {
			const childOrgIds = await this.getChildOrganizations(organizationId);
			return this.documentAdapter.countDocsByTypeMultiOrg([organizationId, ...childOrgIds], type);
		}
		return this.documentAdapter.countDocsByType(organizationId, type);
	}

	async getDocCountsByType(organizationId: string) {
		if (this.hierarchyEnabled) {
			const childOrgIds = await this.getChildOrganizations(organizationId);
			return this.documentAdapter.getDocCountsByTypeMultiOrg([organizationId, ...childOrgIds]);
		}
		return this.documentAdapter.getDocCountsByType(organizationId);
	}

	// Asset operations - delegate to asset adapter
	async createAsset(data: any) {
		return this.assetAdapter.createAsset(data);
	}

	async findAssetById(organizationId: string, id: string) {
		// If hierarchy is enabled, search across parent + child orgs in single query
		if (this.hierarchyEnabled) {
			const childOrgIds = await this.getChildOrganizations(organizationId);
			const allOrgIds = [organizationId, ...childOrgIds];
			return this.assetAdapter.findAssetByIdInOrgs(allOrgIds, id);
		}

		// Otherwise just search in current org
		return this.assetAdapter.findAssetById(organizationId, id);
	}

	async findAssetByIdGlobal(id: string) {
		// Deliberately unscoped — public asset serving
		return this.assetAdapter.findAssetByIdGlobal(id);
	}

	async findAssets(organizationId: string, filters?: any) {
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
	}

	async updateAsset(organizationId: string, id: string, data: any) {
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
	}

	async deleteAsset(organizationId: string, id: string) {
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
	}

	async countAssets(organizationId: string, filters?: AssetFilters) {
		return this.assetAdapter.countAssets(organizationId, filters);
	}

	async countAssetsByType(organizationId: string) {
		return this.assetAdapter.countAssetsByType(organizationId);
	}

	async getTotalAssetsSize(organizationId: string) {
		return this.assetAdapter.getTotalAssetsSize(organizationId);
	}

	// Advanced filtering methods (for unified Local API)
	async findManyDocAdvanced(organizationId: string, collectionName: string, options?: FindOptions) {
		// If filterOrganizationIds is already provided (by CollectionAPI via HierarchyService),
		// org filtering is handled in the WHERE clause.
		if (options?.filterOrganizationIds) {
			return this.documentAdapter.findManyDocAdvanced(organizationId, collectionName, options);
		}

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
	}

	async findByDocIdAdvanced(organizationId: string, id: string, options?: Partial<FindOptions>) {
		if (options?.filterOrganizationIds) {
			return this.documentAdapter.findByDocIdAdvanced(organizationId, id, options);
		}

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
	}

	async countDocuments(organizationId: string, collectionName: string, where?: any) {
		return this.documentAdapter.countDocuments(organizationId, collectionName, where);
	}

	async findManyAssetsAdvanced(organizationId: string, options?: any) {
		return this.assetAdapter.findManyAssetsAdvanced(organizationId, options);
	}

	async findAssetByIdAdvanced(organizationId: string, id: string) {
		return this.assetAdapter.findAssetByIdAdvanced(organizationId, id);
	}

	async countAssetsAdvanced(organizationId: string, where?: any) {
		return this.assetAdapter.countAssetsAdvanced(organizationId, where);
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

	/**
	 * Execute a function within organization context.
	 *
	 * SQLite has no RLS, so there is no database-level context to set — org isolation
	 * comes from the WHERE clauses in every query (the same mechanism that isolates
	 * tenants on pooled Postgres, where the owner connection bypasses RLS). This is a
	 * passthrough kept for interface compatibility.
	 */
	async withOrgContext<T>(
		_organizationId: string,
		fn: () => Promise<T>,
		_options?: {
			overrideAccess?: boolean;
			userId?: string;
			userRole?: string;
		}
	): Promise<T> {
		return fn();
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

		const children = await this.db
			.select({ id: this.tables.organizations.id })
			.from(this.tables.organizations)
			.where(eq(this.tables.organizations.parentOrganizationId, parentOrganizationId));

		return children.map((child) => child.id);
	}

	// Asset reference methods
	async findDocumentsReferencingAsset(
		organizationId: string,
		assetId: string,
		knownTypes?: string[]
	) {
		return this.documentAdapter.findDocumentsReferencingAsset(organizationId, assetId, knownTypes);
	}

	async countDocumentReferencesForAssets(
		organizationId: string,
		assetIds: string[],
		knownTypes?: string[]
	) {
		return this.documentAdapter.countDocumentReferencesForAssets(
			organizationId,
			assetIds,
			knownTypes
		);
	}

	async clearAssetFromPublishedData(organizationId: string, assetId: string) {
		return this.documentAdapter.clearAssetFromPublishedData(organizationId, assetId);
	}

	// Version history
	async createDocumentVersion(data: {
		documentId: string;
		organizationId: string;
		eventType: 'draft' | 'publish';
		data: any;
		createdBy?: string | null;
	}) {
		return this.documentAdapter.createDocumentVersion(data);
	}

	async listDocumentVersions(
		organizationId: string,
		documentId: string,
		options?: { limit?: number; offset?: number }
	) {
		return this.documentAdapter.listDocumentVersions(organizationId, documentId, options);
	}

	async getDocumentVersion(organizationId: string, documentId: string, versionNumber: number) {
		return this.documentAdapter.getDocumentVersion(organizationId, documentId, versionNumber);
	}

	async deleteDocumentVersions(documentId: string, versionIds: string[]) {
		return this.documentAdapter.deleteDocumentVersions(documentId, versionIds);
	}

	// Transaction support
	async withTransaction<T>(fn: (adapter: any) => Promise<T>): Promise<T> {
		return this.db.transaction(async (tx) => {
			// Create a transactional adapter where all operations use tx
			const txAdapter = Object.create(this);
			txAdapter.db = tx;
			txAdapter.documentAdapter = new (this.documentAdapter.constructor as any)(tx, this.tables);
			// withOrgContext is already a passthrough; inherited via the prototype chain.
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
export { SQLiteDocumentAdapter } from './document-adapter';
export { SQLiteAssetAdapter } from './asset-adapter';

// Export schema (table definitions for Drizzle)
export { cmsSchema } from './schema';
export type { CMSSchema } from './schema';

// Export individual schema tables for app usage
export {
	documents,
	assets,
	schemaTypes,
	instanceSettings,
	documentStatuses,
	schemaTypeKinds
} from './schema';

// Re-export universal types from cms-core for convenience
// Apps can import from either @aphexcms/cms-core or @aphexcms/sqlite-adapter
export type {
	Document,
	NewDocument,
	Asset,
	NewAsset,
	SchemaType,
	NewSchemaType
} from '@aphexcms/cms-core/server';

/**
 * Tuning knobs for a local SQLite file. The defaults suit a web workload: WAL lets
 * reads proceed while a write is in flight (the default journal mode blocks them),
 * synchronous=NORMAL is the safe pairing with WAL, and busy_timeout waits instead of
 * throwing SQLITE_BUSY under concurrent requests. libsql enables foreign_keys itself.
 *
 * Note: except journal_mode=WAL (persisted in the database file), these are
 * per-connection settings applied to the client's main connection. libsql opens a
 * fresh connection per interactive transaction, which gets SQLite defaults.
 */
export interface SQLitePragmaOptions {
	/** PRAGMA journal_mode (default: 'WAL') */
	journalMode?: 'WAL' | 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY';
	/** PRAGMA synchronous (default: 'NORMAL') */
	synchronous?: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
	/** PRAGMA busy_timeout in milliseconds (default: 5000) */
	busyTimeout?: number;
	/** PRAGMA cache_size — positive: pages; negative: KiB (e.g. -65536 = 64MiB page cache). SQLite default is ~2MiB. Unset: left at default. */
	cacheSize?: number;
	/** PRAGMA mmap_size in bytes — memory-mapped I/O for faster reads. Unset: left at 0 (off). */
	mmapSize?: number;
	/** PRAGMA temp_store — where temp tables/indices live during sorts. Unset: left at default. */
	tempStore?: 'DEFAULT' | 'FILE' | 'MEMORY';
}

function buildPragmaStatements(options: SQLitePragmaOptions = {}): string {
	const statements = [
		`PRAGMA journal_mode=${options.journalMode ?? 'WAL'};`,
		`PRAGMA synchronous=${options.synchronous ?? 'NORMAL'};`,
		`PRAGMA busy_timeout=${options.busyTimeout ?? 5000};`
	];
	if (options.cacheSize !== undefined) statements.push(`PRAGMA cache_size=${options.cacheSize};`);
	if (options.mmapSize !== undefined) statements.push(`PRAGMA mmap_size=${options.mmapSize};`);
	if (options.tempStore !== undefined) statements.push(`PRAGMA temp_store=${options.tempStore};`);
	return statements.join(' ');
}

/**
 * Local file databases only: WAL/busy_timeout are meaningless for in-memory
 * databases, and remote (Turso) servers manage their own journaling.
 */
function isLocalFileDb(url: string): boolean {
	return url.startsWith('file:') && !url.startsWith('file::memory:');
}

/**
 * Apply the recommended SQLite pragmas (WAL, synchronous=NORMAL, busy_timeout) to a
 * client you created yourself, with optional overrides/additions via `options`.
 * Pass the database `url` so non-file targets (in-memory, Turso) are skipped
 * automatically; omit it to apply unconditionally.
 *
 * The `url` path of `createSQLiteProvider` does this for you — this helper is for the
 * `client` path, where the adapter won't touch a connection it didn't create.
 */
export async function applyRecommendedPragmas(
	client: Client,
	url?: string,
	options?: SQLitePragmaOptions
): Promise<void> {
	if (url !== undefined && !isLocalFileDb(url)) return;
	await client.executeMultiple(buildPragmaStatements(options));
}

/**
 * SQLite-specific configuration options
 */
export interface SQLiteConfig {
	/** Pre-initialized libsql client (recommended — lets the app share it with better-auth/drizzle) */
	client?: Client;
	/** Database URL if not providing a client: `file:path/to.db`, `file::memory:`, or `libsql://...` (Turso) */
	url?: string;
	/** Auth token for remote (Turso) databases */
	authToken?: string;
	/**
	 * Pragmas to apply when the adapter creates the client from `url`.
	 * - `true` / omitted — the recommended set (WAL, synchronous=NORMAL, busy_timeout=5000),
	 *   local `file:` databases only.
	 * - an options object — the recommended set with overrides/additions, e.g.
	 *   `{ cacheSize: -65536, mmapSize: 268435456, tempStore: 'MEMORY' }`; local `file:` only.
	 * - `false` — none; manage pragmas yourself.
	 * - a string — your own pragma statements (e.g. `'PRAGMA busy_timeout=10000;'`),
	 *   run verbatim instead of the recommended set, regardless of url.
	 * Ignored on the `client` path — the adapter doesn't touch a connection it didn't
	 * create; use `applyRecommendedPragmas` there.
	 */
	pragmas?: boolean | string | SQLitePragmaOptions;
	/** Multi-tenancy configuration */
	multiTenancy?: {
		/** Enable parent-child organization hierarchy (default: true) */
		enableHierarchy?: boolean;
	};
}

/**
 * SQLite database provider (libsql)
 */
class SQLiteProvider implements DatabaseProvider {
	name = 'sqlite';
	private config: SQLiteConfig;

	constructor(config: SQLiteConfig) {
		this.config = config;
	}

	createAdapter(): DatabaseAdapter {
		const client =
			this.config.client ??
			(() => {
				if (!this.config.url) {
					throw new Error('SQLite adapter requires either a client or url');
				}
				const created = createClient({ url: this.config.url, authToken: this.config.authToken });
				if (this.config.pragmas !== false) {
					// Fire-and-forget: createAdapter is sync. The pragmas are tuning, not
					// correctness — WAL persists in the file once set, and a first query
					// racing busy_timeout is benign — so a failure only warrants a warning.
					const pragmas = this.config.pragmas;
					const apply =
						typeof pragmas === 'string'
							? created.executeMultiple(pragmas)
							: applyRecommendedPragmas(
									created,
									this.config.url,
									typeof pragmas === 'object' ? pragmas : undefined
								);
					void apply.catch((err) => {
						console.warn('[sqlite-adapter] Failed to apply pragmas:', err);
					});
				}
				return created;
			})();

		const db = drizzle(client, { schema: cmsSchema });
		return new SQLiteAdapter({
			db,
			tables: cmsSchema,
			multiTenancy: this.config.multiTenancy
		});
	}
}

/**
 * Create a SQLite database provider with type-safe configuration
 *
 * @example
 * // With pre-initialized client (recommended)
 * const provider = createSQLiteProvider({ client: myLibsqlClient });
 *
 * @example
 * // Local file database
 * const provider = createSQLiteProvider({ url: 'file:.aphex/data.db' });
 *
 * @example
 * // Turso-hosted
 * const provider = createSQLiteProvider({
 *   url: 'libsql://mydb-me.turso.io',
 *   authToken: process.env.DATABASE_AUTH_TOKEN
 * });
 */
export function createSQLiteProvider(config: SQLiteConfig): DatabaseProvider {
	return new SQLiteProvider(config);
}
