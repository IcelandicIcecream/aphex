// local-api/collection-api.ts
//
// Collection API - provides type-safe CRUD operations for a single collection

import type { DocumentCache } from '../cache/index';
import type { DatabaseAdapter } from '../db/index';
import type { HierarchyService } from '../services/hierarchy-service';
import type { VersionService } from '../services/version-service';
import type { ReferencesService } from '../services/references-service';
import type { Where, WhereTyped, FindOptions, FindResult } from '../types/filters';
import type { Document } from '../types/document';
import type { LocalAPIContext } from './types';
import type { SchemaType } from '../types/schemas';
import { PermissionChecker } from './permissions';
import { singletonId } from '../schema-utils/singleton';
import { validateDocumentData, type DocumentValidationResult } from '../field-validation/utils';
import { collectReferenceIds } from '../utils/reference-walk';
import {
	hiddenReadFields,
	hiddenWriteFields,
	dropLockedWrites,
	stripHiddenFields
} from '../field-access';

/**
 * Result from create/update operations that includes validation
 */
export interface DocumentResult<T> {
	document: T;
	validation: DocumentValidationResult;
}

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

/**
 * Re-project a FindResult through a hidden-fields filter without mutating
 * the shared (potentially cached) original.
 */
function applyHiddenToResult<T>(result: FindResult<T>, hidden: ReadonlySet<string>): FindResult<T> {
	if (hidden.size === 0) return result;
	return {
		...result,
		docs: result.docs.map((d) => applyHiddenToDoc(d, hidden))
	};
}

function applyHiddenToDoc<T>(doc: T, hidden: ReadonlySet<string>): T {
	if (!doc || typeof doc !== 'object') return doc;
	const copy: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(doc as Record<string, unknown>)) {
		if (hidden.has(key)) continue;
		copy[key] = value;
	}
	return copy as T;
}

/**
 * Transform a raw database document into a typed document with data extracted
 * based on perspective (draft or published). Optionally strips field-level
 * read-restricted fields from the data payload.
 */
function transformDocument<T>(
	doc: Document,
	perspective: 'draft' | 'published' = 'draft',
	hiddenFields?: ReadonlySet<string>
): T {
	const raw = perspective === 'draft' ? doc.draftData : doc.publishedData;
	const data =
		hiddenFields && hiddenFields.size > 0
			? stripHiddenFields(raw as Record<string, unknown> | null | undefined, hiddenFields)
			: raw;

	// Merge document metadata with the content data
	return {
		id: doc.id,
		...data,
		// Include metadata fields
		_meta: {
			type: doc.type,
			status: doc.status,
			organizationId: doc.organizationId,
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt,
			createdBy: doc.createdBy,
			updatedBy: doc.updatedBy,
			publishedAt: doc.publishedAt,
			publishedHash: doc.publishedHash
		}
	} as T;
}

/**
 * Thrown when a caller tries to perform an operation that's invalid for a
 * singleton schema (e.g. delete the canonical row, or call `get()` on a
 * non-singleton collection). Route handlers translate this to HTTP 400.
 */
export class SingletonOperationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SingletonOperationError';
	}
}

/**
 * Subset of CollectionAPI methods that are valid on a singleton schema.
 * Codegen emits this type for singleton entries in the Collections interface
 * so consumers can't accidentally call list/findByID/create/delete on them.
 *
 * The runtime is still a regular CollectionAPI — this is purely a TS narrow.
 */
export type SingletonCollection<T = Document> = Pick<
	CollectionAPI<T>,
	'get' | 'getSingletonId' | 'update' | 'publish' | 'unpublish' | 'schema'
>;

/**
 * Collection API - provides type-safe operations for a single collection
 * Generic type T represents the document type for this collection
 */
export class CollectionAPI<T = Document> {
	constructor(
		private collectionName: string,
		private databaseAdapter: DatabaseAdapter,
		private _schema: SchemaType,
		private permissions: PermissionChecker,
		private documentCache?: DocumentCache | null,
		private hierarchyService?: HierarchyService,
		private versionService?: VersionService,
		private referencesService?: ReferencesService,
		private schemaRegistry?: SchemaType[]
	) {
		// Validate collection exists
		this.permissions.validateCollection(collectionName);
	}

	/**
	 * Refresh the back-reference index for this doc using the freshly-saved
	 * draftData. Best-effort: failures are logged inside the service and
	 * never thrown — a stale ref index doesn't block the user's save.
	 */
	private async syncReferences(
		organizationId: string,
		documentId: string,
		data: unknown
	): Promise<void> {
		if (!this.referencesService) return;
		await this.referencesService.syncReferencesFor(
			organizationId,
			documentId,
			data,
			this._schema,
			this.schemaRegistry ?? []
		);
	}

	/**
	 * Get the schema for this collection
	 */
	get schema(): SchemaType {
		return this._schema;
	}

	/**
	 * Compute the deterministic id of the canonical row for this singleton
	 * collection within a specific organization. Returns `undefined` for
	 * regular (non-singleton) schemas. Surfaced for migrations and tests;
	 * normal usage should prefer `get()`.
	 */
	getSingletonId(context: LocalAPIContext): string | undefined {
		return this._schema.singleton
			? singletonId(this._schema.name, context.organizationId)
			: undefined;
	}

	/**
	 * Resolve the singleton document. Lazy-creates an empty draft on first
	 * call so callers always get a row back. Only valid for schemas marked
	 * `singleton: true`; throws on regular collections.
	 */
	async get(context: LocalAPIContext, options?: Partial<FindOptions<T>>): Promise<T> {
		if (!this._schema.singleton) {
			throw new SingletonOperationError(
				`get() is only valid on singleton schemas. '${this.collectionName}' is not a singleton.`
			);
		}
		const id = singletonId(this._schema.name, context.organizationId);
		const existing = await this.findByID(context, id, options);
		if (existing) return existing;
		const created = await this.create(context, {} as Omit<T, 'id' | '_meta'>, { id });
		return created.document;
	}

	/**
	 * Find multiple documents with advanced filtering and pagination
	 *
	 * @example
	 * ```typescript
	 * const result = await api.collections.pages.find(
	 *   { organizationId: 'org_123', user },
	 *   {
	 *     where: {
	 *       status: { equals: 'published' },
	 *       'author.name': { contains: 'John' }
	 *     },
	 *     limit: 20,
	 *     sort: '-publishedAt'
	 *   }
	 * );
	 * ```
	 */
	async find(context: LocalAPIContext, options: FindOptions<T> = {}): Promise<FindResult<T>> {
		// Singleton schemas always resolve to a single canonical row regardless
		// of the supplied filters/pagination. Lazy-create on first access so
		// callers always get one document back. Filters are intentionally
		// ignored — there is at most one row by definition.
		if (this._schema.singleton) {
			const doc = await this.get(context, {
				perspective: options.perspective,
				depth: options.depth
			});
			return {
				docs: [doc],
				totalDocs: 1,
				limit: 1,
				offset: 0,
				page: 1,
				totalPages: 1,
				hasNextPage: false,
				hasPrevPage: false
			};
		}

		// Permission check (unless overrideAccess)
		await this.permissions.canRead(context, this.collectionName);

		// Call option wins; else the context's default perspective; else 'draft'.
		const perspective = options.perspective || context.perspective || 'draft';
		// Field-level access: compute per-request so two users with different
		// roles see different projections even when the underlying cache hit
		// is shared. Cached payloads are stored unfiltered for this reason.
		const hidden = this.resolveHiddenReadFields(context);

		// Check cache for published queries
		if (perspective === 'published' && this.documentCache) {
			const cached = await this.documentCache.getQuery<FindResult<T>>(
				context.organizationId,
				this.collectionName,
				options
			);
			if (cached) return applyHiddenToResult(cached, hidden);
		}

		// Resolve org IDs via hierarchy service (cached) and pass directly —
		// this avoids the adapter opening a transaction just to set RLS context
		const findOptions = { ...options };
		if (this.hierarchyService && !findOptions.filterOrganizationIds) {
			const orgIds = await this.hierarchyService.getOrgIdsWithChildren(context.organizationId);
			findOptions.filterOrganizationIds = orgIds;
		}

		const result = await this.databaseAdapter.findManyDocAdvanced(
			context.organizationId,
			this.collectionName,
			findOptions
		);

		// Transform documents to extract data based on perspective.
		// Cache the unfiltered version; return the filtered one.
		const unfilteredDocs = result.docs.map((doc) => transformDocument<T>(doc, perspective));

		const unfilteredResult: FindResult<T> = {
			...result,
			docs: unfilteredDocs
		};

		// Populate cache for published queries (unfiltered payload)
		if (perspective === 'published' && this.documentCache) {
			await this.documentCache.setQuery(
				context.organizationId,
				this.collectionName,
				options,
				unfilteredResult
			);
		}

		return applyHiddenToResult(unfilteredResult, hidden);
	}

	private resolveHiddenReadFields(context: LocalAPIContext): ReadonlySet<string> {
		if (context.overrideAccess) return EMPTY_SET;
		return hiddenReadFields(this._schema, context.auth);
	}

	private resolveHiddenWriteFields(context: LocalAPIContext): ReadonlySet<string> {
		if (context.overrideAccess) return EMPTY_SET;
		return hiddenWriteFields(this._schema, context.auth);
	}

	/**
	 * Find a single document by ID
	 *
	 * @example
	 * ```typescript
	 * const page = await api.collections.pages.findByID(
	 *   { organizationId: 'org_123', user },
	 *   'doc_123',
	 *   { depth: 1, perspective: 'published' }
	 * );
	 * ```
	 */
	async findByID(
		context: LocalAPIContext,
		id: string,
		options?: Partial<FindOptions<T>>
	): Promise<T | null> {
		// Permission check (unless overrideAccess)
		await this.permissions.canRead(context, this.collectionName);

		// Call option wins; else the context's default perspective; else 'draft'.
		const perspective = options?.perspective || context.perspective || 'draft';
		const hidden = this.resolveHiddenReadFields(context);

		// Check cache for published lookups
		if (perspective === 'published' && this.documentCache) {
			const cached = await this.documentCache.getDocument<T>(context.organizationId, id);
			if (cached) return applyHiddenToDoc(cached, hidden);
		}

		// Resolve org IDs via hierarchy service (cached) — avoids RLS transaction
		const findOptions: Partial<FindOptions<T>> = { ...options };
		if (this.hierarchyService && !findOptions.filterOrganizationIds) {
			const orgIds = await this.hierarchyService.getOrgIdsWithChildren(context.organizationId);
			findOptions.filterOrganizationIds = orgIds;
		}

		const result = await this.databaseAdapter.findByDocIdAdvanced(
			context.organizationId,
			id,
			findOptions
		);

		if (!result) {
			return null;
		}

		// Cache the unfiltered projection; apply hidden fields per-caller.
		const unfiltered = transformDocument<T>(result, perspective);

		// Populate cache for published lookups (unfiltered payload)
		if (perspective === 'published' && this.documentCache) {
			await this.documentCache.setDocument(context.organizationId, id, unfiltered);
		}

		const transformed = applyHiddenToDoc(unfiltered, hidden);

		return transformed;
	}

	/**
	 * Count documents matching a where clause
	 *
	 * @example
	 * ```typescript
	 * const count = await api.collections.pages.count(
	 *   { organizationId: 'org_123', user },
	 *   { where: { status: { equals: 'published' } } }
	 * );
	 * ```
	 */
	async count(
		context: LocalAPIContext,
		options?: { where?: WhereTyped<T> | Where }
	): Promise<number> {
		// Permission check (unless overrideAccess)
		await this.permissions.canRead(context, this.collectionName);

		return this.databaseAdapter.countDocuments(
			context.organizationId,
			this.collectionName,
			options?.where
		);
	}

	/**
	 * Create a new document
	 *
	 * @example
	 * ```typescript
	 * const result = await api.collections.pages.create(
	 *   { organizationId: 'org_123', user },
	 *   {
	 *     title: 'New Page',
	 *     slug: 'new-page',
	 *     content: []
	 *   }
	 * );
	 * // result.document - the created document
	 * // result.validation - validation results
	 * ```
	 */
	async create(
		context: LocalAPIContext,
		data: Omit<T, 'id' | '_meta'>,
		options?: { publish?: boolean; skipVersioning?: boolean; id?: string }
	): Promise<DocumentResult<T>> {
		// Singleton schemas: create is idempotent — if the canonical row
		// already exists, return it; otherwise create with the deterministic
		// id. Caller-supplied `options.id` is ignored to keep the contract.
		if (this._schema.singleton) {
			const id = singletonId(this._schema.name, context.organizationId);
			const existing = await this.findByID(context, id, { perspective: 'draft' });
			if (existing) {
				return {
					document: existing,
					validation: {
						isValid: true,
						errors: [],
						normalizedData: existing as Record<string, any>
					}
				};
			}
			options = { ...options, id };
		}

		// Permission check (unless overrideAccess)
		await this.permissions.canCreate(context, this.collectionName);

		// Drop any writes targeting field-locked names before validation.
		// A caller with collection-level update may still lack write access on
		// a specific field; silently dropping keeps the server authoritative.
		const locked = this.resolveHiddenWriteFields(context);
		const filteredData = dropLockedWrites(
			data as unknown as Record<string, unknown>,
			locked
		) as Omit<T, 'id' | '_meta'>;

		// Validate and normalize data (dates converted to ISO)
		const validationResult = await validateDocumentData(this._schema, filteredData, {
			context: filteredData
		});

		if (options?.publish) {
			await this.permissions.canPublish(context, this.collectionName);

			// Block publish if validation fails
			if (!validationResult.isValid) {
				const errorMessage = validationResult.errors
					.map((e) => `${e.field}: ${e.errors.join(', ')}`)
					.join('; ');
				throw new Error(`Cannot publish: validation errors - ${errorMessage}`);
			}
		}

		// Create document with normalized data (dates in ISO format)
		const document = await this.databaseAdapter.createDocument({
			organizationId: context.organizationId,
			type: this.collectionName,
			draftData: validationResult.normalizedData,
			createdBy: context.user?.id,
			id: options?.id
		});

		await this.syncReferences(context.organizationId, document.id, validationResult.normalizedData);

		// Create initial draft version
		if (this.versionService && !options?.skipVersioning) {
			await this.versionService.createVersion(
				this.databaseAdapter,
				context.organizationId,
				document.id,
				'draft',
				validationResult.normalizedData,
				context.user?.id
			);
		}

		// Publish immediately if requested (validation already done above)
		if (options?.publish) {
			const published =
				this.versionService && !options?.skipVersioning
					? await this.versionService.publishWithVersion(
							this.databaseAdapter,
							context.organizationId,
							document.id
						)
					: await this.databaseAdapter.publishDoc(context.organizationId, document.id);
			if (published) {
				if (this.documentCache) {
					await this.documentCache.invalidateDocument(context.organizationId, document.id);
					await this.documentCache.invalidateCollection(
						context.organizationId,
						this.collectionName
					);
				}
				return {
					document: transformDocument<T>(published, 'published'),
					validation: validationResult
				};
			}
		}

		if (this.documentCache) {
			await this.documentCache.invalidateCollection(context.organizationId, this.collectionName);
		}

		return {
			document: transformDocument<T>(document, 'draft'),
			validation: validationResult
		};
	}

	/**
	 * Update an existing document
	 *
	 * @example
	 * ```typescript
	 * const result = await api.collections.pages.update(
	 *   { organizationId: 'org_123', user },
	 *   'doc_123',
	 *   { title: 'Updated Title' },
	 *   { publish: true }
	 * );
	 * // result.document - the updated document
	 * // result.validation - validation results
	 * ```
	 */
	async update(
		context: LocalAPIContext,
		id: string,
		data: Partial<Omit<T, 'id' | '_meta'>>,
		options?: { publish?: boolean; skipVersioning?: boolean }
	): Promise<DocumentResult<T> | null> {
		// Fetch the doc first so ownership policies have access to the target.
		// A missing doc still returns null below; capability/role rules stay
		// unaffected by the reorder.
		const existingDoc = await this.databaseAdapter.findByDocIdAdvanced(context.organizationId, id);
		if (!existingDoc) {
			return null;
		}

		await this.permissions.canUpdate(context, this.collectionName, existingDoc);

		// Drop writes targeting field-locked names so a caller with
		// collection-level update can't bypass field-level restrictions.
		// Field-locked values stay at their existing stored value via the merge.
		const locked = this.resolveHiddenWriteFields(context);
		const filteredData = dropLockedWrites(data as unknown as Record<string, unknown>, locked);

		// Merge existing data with updates, but only keep fields defined in schema
		// This prevents orphaned fields from persisting when schema changes
		const schemaFieldNames = new Set(this._schema.fields.map((f) => f.name));
		const cleanedExisting: Record<string, any> = {};

		// Only copy fields from existing doc that are still in the schema
		for (const [key, value] of Object.entries(existingDoc.draftData || {})) {
			if (schemaFieldNames.has(key)) {
				cleanedExisting[key] = value;
			}
		}

		// Merge cleaned existing data with filtered updates
		const mergedData = { ...cleanedExisting, ...filteredData };

		// Validate and normalize the merged data
		const validationResult = await validateDocumentData(this._schema, mergedData, mergedData);

		// Update draft with normalized data (dates in ISO format)
		// Use VersionService for atomic save + version creation if available
		const document =
			this.versionService && !options?.skipVersioning
				? await this.versionService.saveWithVersion(
						this.databaseAdapter,
						context.organizationId,
						id,
						validationResult.normalizedData,
						context.user?.id
					)
				: await this.databaseAdapter.updateDocDraft(
						context.organizationId,
						id,
						validationResult.normalizedData,
						context.user?.id
					);

		if (!document) {
			return null;
		}

		await this.syncReferences(context.organizationId, id, validationResult.normalizedData);

		if (options?.publish) {
			await this.permissions.canPublish(context, this.collectionName, document);

			// Block publish if validation fails
			if (!validationResult.isValid) {
				const errorMessage = validationResult.errors
					.map((e) => `${e.field}: ${e.errors.join(', ')}`)
					.join('; ');
				throw new Error(`Cannot publish: validation errors - ${errorMessage}`);
			}

			const published =
				this.versionService && !options?.skipVersioning
					? await this.versionService.publishWithVersion(
							this.databaseAdapter,
							context.organizationId,
							document.id
						)
					: await this.databaseAdapter.publishDoc(context.organizationId, document.id);
			if (published) {
				// Invalidate cache
				if (this.documentCache) {
					await this.documentCache.invalidateDocument(context.organizationId, id);
					await this.documentCache.invalidateCollection(
						context.organizationId,
						this.collectionName
					);
				}
				return {
					document: transformDocument<T>(published, 'published'),
					validation: validationResult
				};
			}
		}

		return {
			document: transformDocument<T>(document, 'draft'),
			validation: validationResult
		};
	}

	/**
	 * Delete a document
	 *
	 * @example
	 * ```typescript
	 * const deleted = await api.collections.pages.delete(
	 *   { organizationId: 'org_123', user },
	 *   'doc_123'
	 * );
	 * ```
	 */
	async delete(context: LocalAPIContext, id: string): Promise<boolean> {
		// Protect the canonical singleton row. In-limbo random-uuid docs of
		// the same type (left over from before the schema was flipped to
		// singleton) remain deletable — only the deterministic id is locked.
		if (this._schema.singleton && id === singletonId(this._schema.name, context.organizationId)) {
			throw new SingletonOperationError(
				`Cannot delete the singleton document for '${this._schema.name}'. Remove the singleton flag from the schema first.`
			);
		}

		// Fetch the target so ownership policies have a doc to inspect. For
		// role/capability rules this extra read is a small cost; ergonomic
		// wins outweigh it for operations that are rare by nature.
		const existing = await this.databaseAdapter.findByDocIdAdvanced(context.organizationId, id);
		if (!existing) return false;

		await this.permissions.canDelete(context, this.collectionName, existing);

		const result = await this.databaseAdapter.deleteDocById(context.organizationId, id);

		// Invalidate cache for deleted document
		if (result && this.documentCache) {
			await this.documentCache.invalidateDocument(context.organizationId, id);
			await this.documentCache.invalidateCollection(context.organizationId, this.collectionName);
		}

		return result;
	}

	/**
	 * Publish a document
	 *
	 * @example
	 * ```typescript
	 * const published = await api.collections.pages.publish(
	 *   { organizationId: 'org_123', user },
	 *   'doc_123'
	 * );
	 * ```
	 */
	async publish(context: LocalAPIContext, id: string): Promise<T | null> {
		// Fetch first so policies can inspect the target. Order matters here:
		// 404s beat 403s for missing docs.
		const document = await this.databaseAdapter.findByDocIdAdvanced(context.organizationId, id);
		if (!document || !document.draftData) {
			throw new Error('Document not found or has no draft content to publish');
		}

		await this.permissions.canPublish(context, this.collectionName, document);

		// Validate draft data (dates already in ISO, will be converted for validation)
		const validationResult = await validateDocumentData(
			this._schema,
			document.draftData,
			document.draftData
		);

		if (!validationResult.isValid) {
			const errorMessage = validationResult.errors
				.map((e) => `${e.field}: ${e.errors.join(', ')}`)
				.join('; ');
			throw new Error(`Cannot publish: validation errors - ${errorMessage}`);
		}

		// Guard: block publish if any referenced document is not published
		const refIds = collectReferenceIds(document.draftData);
		if (refIds.length > 0) {
			const unpublished: Array<{ id: string; type: string; title: string }> = [];
			for (const refId of refIds) {
				const refDoc = await this.databaseAdapter.findByDocIdAdvanced(
					context.organizationId,
					refId
				);
				if (refDoc && !refDoc.publishedData) {
					const data = refDoc.draftData as Record<string, unknown> | null;
					const title = (data?.title as string) || (data?.name as string) || refDoc.id;
					unpublished.push({ id: refDoc.id, type: refDoc.type, title });
				}
			}
			if (unpublished.length > 0) {
				const names = unpublished.map((d) => `"${d.title}" (${d.type})`).join(', ');
				throw new Error(
					`Cannot publish — ${unpublished.length} referenced document(s) are not published: ${names}`
				);
			}
		}

		// Validation passed - proceed with publish (with version if service available)
		const publishedDocument = this.versionService
			? await this.versionService.publishWithVersion(
					this.databaseAdapter,
					context.organizationId,
					id
				)
			: await this.databaseAdapter.publishDoc(context.organizationId, id);
		if (!publishedDocument) {
			return null;
		}

		// Invalidate cache for this document and all collection queries
		if (this.documentCache) {
			await this.documentCache.invalidateDocument(context.organizationId, id);
			await this.documentCache.invalidateCollection(context.organizationId, this.collectionName);
		}

		return transformDocument<T>(publishedDocument, 'published');
	}

	/**
	 * Unpublish a document
	 *
	 * @example
	 * ```typescript
	 * const unpublished = await api.collections.pages.unpublish(
	 *   { organizationId: 'org_123', user },
	 *   'doc_123'
	 * );
	 * ```
	 */
	async unpublish(context: LocalAPIContext, id: string): Promise<T | null> {
		// Fetch target for policy inspection before mutating.
		const existing = await this.databaseAdapter.findByDocIdAdvanced(context.organizationId, id);
		if (!existing) return null;

		await this.permissions.canUnpublish(context, this.collectionName, existing);

		const document = await this.databaseAdapter.unpublishDoc(context.organizationId, id);
		if (!document) {
			return null;
		}

		// Invalidate cache — document is no longer published
		if (this.documentCache) {
			await this.documentCache.invalidateDocument(context.organizationId, id);
			await this.documentCache.invalidateCollection(context.organizationId, this.collectionName);
		}

		return transformDocument<T>(document, 'draft');
	}
}
