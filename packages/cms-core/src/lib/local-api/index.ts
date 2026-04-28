// local-api/index.ts
//
// Main Local API singleton and factory function

import type { CMSConfig } from '../types/config';
import { DocumentCache } from '../cache/index';
import type { DatabaseAdapter } from '../db/index';
import { HierarchyService } from '../services/hierarchy-service';
import { VersionService } from '../services/version-service';
import type { FindOptions } from '../types/filters';
import type { SchemaType } from '../types/schemas';
import { CollectionAPI } from './collection-api';
import { PermissionChecker } from './permissions';
import type { LocalAPIContext } from './types';

/**
 * Collections map - provides type-safe access to all collections
 * This interface is meant to be augmented by generated types
 */
export interface Collections {
	// Index signature to allow dynamic collection assignment
	[collectionName: string]: CollectionAPI<unknown>;
	// This will be extended by module augmentation in generated-types.ts
	// e.g., page: CollectionAPI<Page>, catalog: CollectionAPI<Catalog>, etc.
}

/**
 * Local API - provides a unified, type-safe interface for all CMS operations
 *
 * This is the single source of truth for data operations in Aphex CMS.
 * GraphQL and REST APIs should be thin wrappers around this Local API.
 *
 * @example
 * ```typescript
 * // Initialize
 * const api = await getLocalAPI(config);
 *
 * // Query documents
 * const pages = await api.collections.pages.find(
 *   { organizationId: 'org_123', user },
 *   { where: { status: { equals: 'published' } } }
 * );
 *
 * // Create document
 * const newPage = await api.collections.pages.create(
 *   { organizationId: 'org_123', user },
 *   { title: 'Hello', slug: 'hello' }
 * );
 *
 * // System operation (bypasses RLS)
 * const allPages = await api.collections.pages.find(
 *   { organizationId: 'org_123', overrideAccess: true },
 *   { limit: 100 }
 * );
 * ```
 */
export class LocalAPI {
	public collections: Collections = {} as Collections;
	private userAdapter: DatabaseAdapter;
	private systemAdapter: DatabaseAdapter | null;
	private documentCache: DocumentCache | null;
	private hierarchyService: HierarchyService;
	public versionService: VersionService;
	private permissions: PermissionChecker;
	private schemas: Map<string, SchemaType>;

	constructor(
		private config: CMSConfig,
		userAdapter: DatabaseAdapter,
		systemAdapter?: DatabaseAdapter
	) {
		this.userAdapter = userAdapter;
		this.systemAdapter = systemAdapter || null;
		this.documentCache = config.cache ? new DocumentCache(config.cache) : null;
		this.hierarchyService = new HierarchyService(userAdapter, config.cache);
		this.versionService = new VersionService({
			maxVersions: config.versioning?.maxVersions ?? 25
		});

		// Build schema map for quick lookups
		this.schemas = new Map(
			config.schemaTypes
				.filter((schema) => schema.type === 'document')
				.map((schema) => [schema.name, schema])
		);

		// Initialize permission checker
		this.permissions = new PermissionChecker(config, this.schemas);

		// Initialize collection APIs for all document types
		this.initializeCollections();
	}

	/**
	 * Initialize collection APIs for all document schema types
	 */
	private initializeCollections(): void {
		const documentSchemas = this.config.schemaTypes.filter((s) => s.type === 'document');

		for (const schema of documentSchemas) {
			// Create a proxy that selects the correct adapter based on context
			const collectionAPI = new Proxy(
				new CollectionAPI(
					schema.name,
					this.userAdapter,
					schema,
					this.permissions,
					this.documentCache,
					this.hierarchyService,
					this.versionService
				),
				{
					get: (target, prop) => {
						const method = target[prop as keyof CollectionAPI];
						if (typeof method === 'function') {
							// Wrap method to dynamically select adapter
							return async (...args: unknown[]) => {
								const context = args[0] as LocalAPIContext;
								const adapter = this.getAdapter(context);

								// Create new CollectionAPI with the correct adapter
								const api = new CollectionAPI(
									schema.name,
									adapter,
									schema,
									this.permissions,
									this.documentCache,
									this.hierarchyService,
									this.versionService
								);

								// Call the method on the new instance
								return (api[prop as keyof CollectionAPI] as Function).apply(api, args);
							};
						}
						return method;
					}
				}
			);

			this.collections[schema.name] = collectionAPI as CollectionAPI<unknown>;
		}
	}

	/**
	 * Get the appropriate database adapter based on context
	 * Uses system adapter if overrideAccess is true, otherwise uses user adapter
	 */
	private getAdapter(context: LocalAPIContext): DatabaseAdapter {
		if (context.overrideAccess && this.systemAdapter) {
			return this.systemAdapter;
		}
		return this.userAdapter;
	}

	/**
	 * Get list of available collection names
	 */
	getCollectionNames(): string[] {
		return Array.from(this.schemas.keys());
	}

	/**
	 * Check if a collection exists
	 */
	hasCollection(name: string): boolean {
		return this.schemas.has(name);
	}

	/**
	 * Get schema for a collection
	 */
	getCollectionSchema(name: string): SchemaType | undefined {
		return this.schemas.get(name);
	}

	/**
	 * Find a document by ID without knowing its collection type.
	 * Resolves org hierarchy and passes filterOrganizationIds to avoid RLS transactions.
	 * Returns the raw document with its type, or null if not found.
	 */
	async findDocumentById(
		context: LocalAPIContext,
		id: string,
		options?: Partial<FindOptions<unknown>>
	): Promise<{ type: string; document: unknown } | null> {
		const adapter = this.getAdapter(context);
		const findOptions: Partial<FindOptions<unknown>> = { ...options };

		// Resolve org IDs via hierarchy service to avoid withOrgContext transaction
		if (this.hierarchyService) {
			const orgIds = await this.hierarchyService.getOrgIdsWithChildren(context.organizationId);
			findOptions.filterOrganizationIds = orgIds;
		}

		const rawDoc = await adapter.findByDocIdAdvanced(context.organizationId, id, findOptions);
		if (!rawDoc) return null;

		return { type: rawDoc.type, document: rawDoc };
	}
}

// Global Local API instance
let localAPIInstance: LocalAPI | null = null;

/**
 * Create and initialize the Local API
 *
 * @param config - CMS configuration
 * @param userAdapter - Standard database adapter (respects RLS)
 * @param systemAdapter - Optional system adapter (bypasses RLS) for system operations
 * @returns LocalAPI instance
 *
 * @example
 * ```typescript
 * // Basic usage (single adapter)
 * const api = createLocalAPI(config, userDb);
 *
 * // With system adapter for RLS bypass
 * const api = createLocalAPI(config, userDb, systemDb);
 * ```
 */
export function createLocalAPI(
	config: CMSConfig,
	userAdapter: DatabaseAdapter,
	systemAdapter?: DatabaseAdapter
): LocalAPI {
	localAPIInstance = new LocalAPI(config, userAdapter, systemAdapter);
	return localAPIInstance;
}

/**
 * Get the Local API instance
 * Throws if Local API hasn't been initialized yet
 *
 * @returns LocalAPI instance
 * @throws Error if Local API not initialized
 *
 * @example
 * ```typescript
 * const api = getLocalAPI();
 * const pages = await api.collections.pages.find(...);
 * ```
 */
export function getLocalAPI(): LocalAPI {
	if (!localAPIInstance) {
		throw new Error('Local API not initialized. Call createLocalAPI() first.');
	}
	return localAPIInstance;
}

// Re-export types and classes for convenience
export {
	CollectionAPI,
	SingletonOperationError,
	type DocumentResult,
	type SingletonCollection
} from './collection-api';
export { PermissionChecker, PermissionError } from './permissions';
export type { LocalAPIContext, CreateOptions, UpdateOptions } from './types';
export { authToContext, requireAuth, systemContext } from './auth-helpers';
