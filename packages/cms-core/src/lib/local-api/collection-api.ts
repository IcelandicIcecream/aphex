// local-api/collection-api.ts
//
// Collection API - provides type-safe CRUD operations for a single collection

import type { DatabaseAdapter } from '../db/index';
import type { Where, WhereTyped, FindOptions, FindResult } from '../types/filters';
import type { Document } from '../types/document';
import type { LocalAPIContext } from './types';
import type { SchemaType } from '../types/schemas';
import { PermissionChecker } from './permissions';
import { validateDocumentData, type DocumentValidationResult } from '../field-validation/utils';

/**
 * Result from create/update operations that includes validation
 */
export interface DocumentResult<T> {
	document: T;
	validation: DocumentValidationResult;
}

/**
 * Transform a raw database document into a typed document with data extracted
 * based on perspective (draft or published)
 */
function transformDocument<T>(doc: Document, perspective: 'draft' | 'published' = 'draft'): T {
	const data = perspective === 'draft' ? doc.draftData : doc.publishedData;

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
 * Collection API - provides type-safe operations for a single collection
 * Generic type T represents the document type for this collection
 */
export class CollectionAPI<T = Document> {
	constructor(
		private collectionName: string,
		private databaseAdapter: DatabaseAdapter,
		private _schema: SchemaType,
		private permissions: PermissionChecker
	) {
		// Validate collection exists
		this.permissions.validateCollection(collectionName);
	}

	/**
	 * Get the schema for this collection
	 */
	get schema(): SchemaType {
		return this._schema;
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
		// Permission check (unless overrideAccess)
		await this.permissions.canRead(context, this.collectionName);

		// Call adapter's advanced find method
		const result = await this.databaseAdapter.findManyDocAdvanced(
			context.organizationId,
			this.collectionName,
			options
		);

		// Transform documents to extract data based on perspective
		const perspective = options.perspective || 'draft';
		const transformedDocs = result.docs.map((doc) => transformDocument<T>(doc, perspective));

		return {
			...result,
			docs: transformedDocs
		};
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

		const result = await this.databaseAdapter.findByDocIdAdvanced(
			context.organizationId,
			id,
			options
		);

		if (!result) {
			return null;
		}

		// Transform document to extract data based on perspective
		const perspective = options?.perspective || 'draft';
		return transformDocument<T>(result, perspective);
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
		options?: { publish?: boolean }
	): Promise<DocumentResult<T>> {
		// Permission check (unless overrideAccess)
		await this.permissions.canWrite(context, this.collectionName);

		// Validate and normalize data (dates converted to ISO)
		const validationResult = await validateDocumentData(this._schema, data, data);

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
			createdBy: context.user?.id
		});

		// Publish immediately if requested (validation already done above)
		if (options?.publish) {
			const published = await this.databaseAdapter.publishDoc(context.organizationId, document.id);
			if (published) {
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
		options?: { publish?: boolean }
	): Promise<DocumentResult<T> | null> {
		// Permission check (unless overrideAccess)
		await this.permissions.canWrite(context, this.collectionName);

		// Get existing document to merge with updates
		const existingDoc = await this.databaseAdapter.findByDocId(context.organizationId, id);
		if (!existingDoc) {
			return null;
		}

		// Merge existing data with updates
		const mergedData = { ...existingDoc.draftData, ...data };

		// Validate and normalize the merged data
		const validationResult = await validateDocumentData(this._schema, mergedData, mergedData);

		// Update draft with normalized data (dates in ISO format)
		const document = await this.databaseAdapter.updateDocDraft(
			context.organizationId,
			id,
			validationResult.normalizedData,
			context.user?.id
		);

		if (!document) {
			return null;
		}

		if (options?.publish) {
			await this.permissions.canPublish(context, this.collectionName);

			// Block publish if validation fails
			if (!validationResult.isValid) {
				const errorMessage = validationResult.errors
					.map((e) => `${e.field}: ${e.errors.join(', ')}`)
					.join('; ');
				throw new Error(`Cannot publish: validation errors - ${errorMessage}`);
			}

			const published = await this.databaseAdapter.publishDoc(context.organizationId, document.id);
			if (published) {
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
		// Permission check (unless overrideAccess)
		await this.permissions.canDelete(context, this.collectionName);

		return this.databaseAdapter.deleteDocById(context.organizationId, id);
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
		// Permission check (unless overrideAccess)
		await this.permissions.canPublish(context, this.collectionName);

		// Get the document to access draft data for validation
		const document = await this.databaseAdapter.findByDocId(context.organizationId, id);
		if (!document || !document.draftData) {
			throw new Error('Document not found or has no draft content to publish');
		}

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

		// Validation passed - proceed with publish
		const publishedDocument = await this.databaseAdapter.publishDoc(context.organizationId, id);
		if (!publishedDocument) {
			return null;
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
		// Permission check (unless overrideAccess)
		await this.permissions.canPublish(context, this.collectionName);

		const document = await this.databaseAdapter.unpublishDoc(context.organizationId, id);
		if (!document) {
			return null;
		}
		return transformDocument<T>(document, 'draft');
	}
}
