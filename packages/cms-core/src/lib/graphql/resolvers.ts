import type { CMSInstances } from '../hooks';
import type { SchemaType, Field } from '../types/schemas';
import { GraphQLError } from 'graphql';
import { authToContext } from '../local-api/auth-helpers';
import { getDefaultValueForFieldType } from '../utils/field-defaults';
import { cmsLogger } from '../utils/logger';
import { toPascalCase, toCamelCase } from '../utils/string-case';

// Normalize null/undefined field values to type-appropriate defaults (recursive)
function normalizeDocumentFields(
	data: any,
	schemaType: SchemaType,
	allSchemaTypes: SchemaType[]
): any {
	if (!data) return data;

	const normalized = { ...data };

	schemaType.fields.forEach((field: Field) => {
		const fieldValue = normalized[field.name];

		// Normalize null/undefined values to defaults based on field type
		if (fieldValue === null || fieldValue === undefined) {
			normalized[field.name] = getDefaultValueForFieldType(field.type);
		}

		// Recursively normalize nested objects
		if (field.type === 'object' && normalized[field.name] && (field as any).fields) {
			const syntheticSchema: SchemaType = {
				name: `${schemaType.name}_${field.name}`,
				type: 'object',
				fields: (field as any).fields,
				title: field.title || field.name
			};
			normalized[field.name] = normalizeDocumentFields(
				normalized[field.name],
				syntheticSchema,
				allSchemaTypes
			);
		}

		// Recursively normalize arrays of objects
		if (field.type === 'array' && Array.isArray(normalized[field.name]) && (field as any).of) {
			normalized[field.name] = normalized[field.name].map((item: any) => {
				if (item && typeof item === 'object' && item._type) {
					const itemSchema = allSchemaTypes.find((s) => s.name === item._type);
					if (itemSchema) {
						return normalizeDocumentFields(item, itemSchema, allSchemaTypes);
					}
				}
				return item;
			});
		}
	});

	return normalized;
}

function toISOString(value: unknown): string | null {
	if (!value) return null;
	if (value instanceof Date) return value.toISOString();
	if (typeof value === 'string') return value;
	return null;
}

/**
 * Resolve reference targets through the Local API rather than the database adapter.
 *
 * The reference resolvers used to call `databaseAdapter.findByDocIdAdvanced` directly,
 * which is the one path into the document graph that skips both `permissions.canRead`
 * and field-level read access. Two things followed from that. A caller authorised for
 * one collection could read a document in a collection it has no access to, provided
 * something it *can* read holds a reference to it. And whatever came back was the
 * unfiltered projection — a field the schema marks read-restricted was returned in
 * full, as long as it was reached through a reference instead of queried directly.
 *
 * `findDocumentsByIds` is the access-controlled equivalent: it does the cheap type
 * lookup, then routes each ID through its own collection's `findByID`, which applies
 * the permission check and the hidden-field projection. Denied and missing IDs are
 * dropped rather than thrown, so results are matched back to the requested IDs by ID
 * — never by assuming the arrays line up.
 */
async function resolveReferencedDocs(
	cms: CMSInstances,
	schemaTypes: SchemaType[],
	context: any,
	ids: string[],
	perspective: 'draft' | 'published'
): Promise<Array<Record<string, unknown> | null>> {
	if (ids.length === 0) return [];

	const apiContext = authToContext(context?.auth);
	const docs = await cms.localAPI.findDocumentsByIds<Record<string, unknown>>(apiContext, ids, {
		perspective
	});

	const byId = new Map<string, Record<string, unknown>>();
	for (const doc of docs) {
		const id = doc?.id;
		if (typeof id === 'string') byId.set(id, doc);
	}

	return ids.map((id) => {
		const doc = byId.get(id);
		if (!doc) return null;

		const meta = (doc._meta ?? {}) as Record<string, unknown>;
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { id: _id, _meta, ...data } = doc;

		const refSchemaType = schemaTypes.find((s) => s.name === meta.type);
		const normalized = refSchemaType
			? normalizeDocumentFields(data, refSchemaType, schemaTypes)
			: data;

		return {
			id,
			type: meta.type,
			status: perspective,
			createdAt: toISOString(meta.createdAt),
			updatedAt: toISOString(meta.updatedAt),
			// Deliberately left as null to match the previous behaviour of these
			// resolvers; `_meta.publishedAt` now carries the real value if this is
			// ever changed on purpose.
			publishedAt: null,
			...normalized
		};
	});
}

/** Pull the target ID off a reference value, tolerating un-migrated bare strings. */
function referenceIdOf(raw: unknown): string | null {
	if (raw && typeof raw === 'object' && (raw as any)._type === 'reference') {
		const ref = (raw as any)._ref;
		return typeof ref === 'string' ? ref : null;
	}
	return typeof raw === 'string' ? raw : null;
}

// Sanitize GraphQL input data - remove null values and convert to undefined
function sanitizeInputData(data: any): any {
	if (data === null) return undefined;
	if (typeof data !== 'object') return data;
	if (Array.isArray(data)) {
		return data.map((item) => sanitizeInputData(item));
	}

	const sanitized: any = {};
	for (const [key, value] of Object.entries(data)) {
		if (value !== null) {
			sanitized[key] = sanitizeInputData(value);
		}
	}
	return sanitized;
}

// Parse GraphQL where input into LocalAPI where clause
function parseWhereInput(where: any): any {
	if (!where) return undefined;

	const parsed: any = {};

	Object.keys(where).forEach((key) => {
		const value = where[key];

		// Handle logical operators
		if (key === 'AND' && Array.isArray(value)) {
			parsed.and = value.map((w) => parseWhereInput(w));
			return;
		}

		if (key === 'OR' && Array.isArray(value)) {
			parsed.or = value.map((w) => parseWhereInput(w));
			return;
		}

		// Handle field filters
		if (value && typeof value === 'object') {
			parsed[key] = {};

			// Map GraphQL operators to LocalAPI operators
			if ('equals' in value) parsed[key].equals = value.equals;
			if ('not_equals' in value) parsed[key].not_equals = value.not_equals;
			if ('in' in value) parsed[key].in = value.in;
			if ('not_in' in value) parsed[key].not_in = value.not_in;
			if ('contains' in value) parsed[key].contains = value.contains;
			if ('starts_with' in value) parsed[key].starts_with = value.starts_with;
			if ('ends_with' in value) parsed[key].ends_with = value.ends_with;
			if ('like' in value) parsed[key].like = value.like;
			if ('greater_than' in value) parsed[key].greater_than = value.greater_than;
			if ('greater_than_equal' in value) parsed[key].greater_than_equal = value.greater_than_equal;
			if ('less_than' in value) parsed[key].less_than = value.less_than;
			if ('less_than_equal' in value) parsed[key].less_than_equal = value.less_than_equal;
			if ('exists' in value) parsed[key].exists = value.exists;
		} else {
			// Direct value (shorthand for equals)
			parsed[key] = { equals: value };
		}
	});

	return parsed;
}

export function createResolvers(
	cms: CMSInstances,
	schemaTypes: SchemaType[],
	defaultPerspective: 'draft' | 'published' = 'published'
) {
	const resolvers: Record<string, any> = {
		Query: {},
		Mutation: {},
		Image: {
			// Return the image object as-is for frontend urlFor() usage
			_type: (parent: any) => parent?._type || 'image',
			asset: (parent: any) => parent?.asset || null,
			url: (parent: any) => {
				// Optional: provide a convenience URL field
				const assetRef = parent?.asset?._ref;
				return assetRef ? `/media/${assetRef}/image` : null;
			}
		}
	};

	// Generate reference field resolvers for all types
	function generateReferenceFieldResolvers() {
		schemaTypes.forEach((schemaType) => {
			const typeName = toPascalCase(schemaType.name);

			function processFields(fields: any[], currentTypeName: string) {
				fields.forEach((field: any) => {
					// Handle reference fields
					if (field.type === 'reference' && field.to && field.to.length > 0) {
						// Create resolver for this reference field
						if (!resolvers[currentTypeName]) {
							resolvers[currentTypeName] = {};
						}

						resolvers[currentTypeName][field.name] = async (
							parent: any,
							_args: any,
							context: any
						) => {
							// Singular refs are stored as { _type: 'reference', _ref } —
							// pull the target ID off the wrapper. Also accept a bare
							// string for back-compat with un-migrated docs.
							const referenceId = referenceIdOf(parent[field.name]);
							if (!referenceId) {
								return null;
							}

							try {
								// Use the same perspective as the parent document
								const perspective = parent.status || context?.perspective || defaultPerspective;
								const [resolved] = await resolveReferencedDocs(
									cms,
									schemaTypes,
									context,
									[referenceId],
									perspective
								);
								return resolved ?? null;
							} catch (error) {
								cmsLogger.error(`Failed to resolve reference ${field.name}:`, error);
								return null;
							}
						};
					}

					// Handle array-of-reference fields
					if (field.type === 'array' && field.of) {
						const refOf = field.of.find((o: any) => o.type === 'reference');
						if (refOf) {
							if (!resolvers[currentTypeName]) {
								resolvers[currentTypeName] = {};
							}
							resolvers[currentTypeName][field.name] = async (
								parent: any,
								_args: any,
								context: any
							) => {
								const items = parent[field.name];
								if (!Array.isArray(items)) return [];
								const perspective = parent.status || context?.perspective || defaultPerspective;

								// Resolve the whole array in one call rather than per item: the
								// Local API resolves org hierarchy once for the batch, so an
								// array of N references costs one hierarchy lookup instead of N.
								// Unresolvable entries (missing, or denied by access control)
								// stay in place as nulls so the array keeps its original length
								// and indices — a caller pairing this against the raw field
								// would otherwise silently misalign.
								const ids = items.map(referenceIdOf);
								const presentIds = ids.filter((id): id is string => id !== null);
								try {
									const resolved = await resolveReferencedDocs(
										cms,
										schemaTypes,
										context,
										presentIds,
										perspective
									);
									const byId = new Map<string, unknown>(
										presentIds.map((id, i) => [id, resolved[i] ?? null])
									);
									return ids.map((id) => (id ? (byId.get(id) ?? null) : null));
								} catch (error) {
									cmsLogger.error(`Failed to resolve references ${field.name}:`, error);
									return items.map(() => null);
								}
							};
						}
					}

					// Handle nested objects
					if (field.type === 'object' && field.fields) {
						const nestedTypeName = toPascalCase(`${schemaType.name}${field.name}Object`);
						processFields(field.fields, nestedTypeName);
					}
				});
			}

			processFields(schemaType.fields, typeName);
		});
	}

	generateReferenceFieldResolvers();

	// Generate union type resolvers for array fields — must match the logic in
	// schema.ts which only emits a union when 2+ types exist in schemaTypes.
	function generateUnionResolvers() {
		schemaTypes.forEach((schemaType) => {
			function processFields(fields: any[], parentName: string) {
				fields.forEach((field: any) => {
					if (field.type === 'array' && field.of && field.of.length > 1) {
						const validTypes = field.of.filter((item: any) =>
							schemaTypes.find((s: any) => s.name === item.type)
						);
						if (validTypes.length > 1) {
							const unionName = `${toPascalCase(parentName)}${toPascalCase(field.name)}Item`;
							resolvers[unionName] = {
								__resolveType(obj: any) {
									if (obj._type) {
										return toPascalCase(obj._type);
									}
									return null;
								}
							};
						}
					}

					// Handle nested objects
					if (field.type === 'object' && field.fields) {
						processFields(field.fields, `${parentName}${field.name}`);
					}
				});
			}

			processFields(schemaType.fields, schemaType.name);
		});
	}

	generateUnionResolvers();

	// Generate resolvers for each document type
	const documentTypes = schemaTypes.filter((type) => type.type === 'document');

	documentTypes.forEach((schemaType) => {
		const typeName = toPascalCase(schemaType.name);
		const fieldName = toCamelCase(schemaType.name);

		// Singleton resolvers: no-arg query, no-id mutations.
		// Schema/codegen already differs for singletons (see schema.ts) — the
		// resolver just delegates to the singleton-aware CollectionAPI methods.
		if (schemaType.singleton) {
			const formatDoc = (doc: any, perspective: 'draft' | 'published') => {
				const data = { ...doc };
				const meta = data._meta || {};
				delete data._meta;
				const normalizedData = normalizeDocumentFields(data, schemaType, schemaTypes);
				return {
					id: meta.id || doc.id,
					type: meta.type || schemaType.name,
					status: perspective,
					createdAt: meta.createdAt?.toISOString() || null,
					updatedAt: meta.updatedAt?.toISOString() || null,
					publishedAt: meta.publishedAt?.toISOString() || null,
					...normalizedData
				};
			};

			resolvers.Query[fieldName] = async (
				_: any,
				args: { perspective?: 'draft' | 'published'; depth?: number },
				context: any
			) => {
				try {
					const { localAPI, auth } = context;
					const apiContext = authToContext(auth);
					const perspective = args.perspective || defaultPerspective;
					context.perspective = perspective;
					const collection = localAPI.collections[schemaType.name];
					if (!collection) {
						throw new GraphQLError(`Collection '${schemaType.name}' not found`, {
							extensions: { code: 'NOT_FOUND' }
						});
					}
					const doc = await collection.get(apiContext, { perspective, depth: args.depth || 0 });
					return formatDoc(doc, perspective);
				} catch (error) {
					if (error instanceof GraphQLError) throw error;
					throw new GraphQLError((error as Error).message, {
						extensions: { code: 'INTERNAL_SERVER_ERROR' }
					});
				}
			};

			resolvers.Mutation[`update${typeName}`] = async (
				_: any,
				args: { data: any; publish?: boolean },
				context: any
			) => {
				try {
					const { localAPI, auth } = context;
					const apiContext = authToContext(auth);
					const collection = localAPI.collections[schemaType.name];
					if (!collection) {
						throw new GraphQLError(`Collection '${schemaType.name}' not found`, {
							extensions: { code: 'NOT_FOUND' }
						});
					}
					const sanitizedData = sanitizeInputData(args.data);
					// Make sure the row exists, then update through the regular path.
					await collection.get(apiContext);
					const result = await collection.update(
						apiContext,
						collection.getSingletonId(apiContext)!,
						sanitizedData,
						{
							publish: args.publish || false
						}
					);
					if (!result) {
						throw new GraphQLError('Singleton not found', { extensions: { code: 'NOT_FOUND' } });
					}
					return formatDoc(result.document, args.publish ? 'published' : 'draft');
				} catch (error) {
					if (error instanceof GraphQLError) throw error;
					cmsLogger.error(`GraphQL mutation error:`, error);
					throw new GraphQLError((error as Error).message, {
						extensions: { code: 'BAD_REQUEST' }
					});
				}
			};

			resolvers.Mutation[`publish${typeName}`] = async (_: any, __: any, context: any) => {
				try {
					const { localAPI, auth } = context;
					const apiContext = authToContext(auth);
					const collection = localAPI.collections[schemaType.name];
					await collection.get(apiContext);
					const doc = await collection.publish(apiContext, collection.getSingletonId(apiContext)!);
					if (!doc) {
						throw new GraphQLError('Singleton not found', { extensions: { code: 'NOT_FOUND' } });
					}
					return formatDoc(doc, 'published');
				} catch (error) {
					if (error instanceof GraphQLError) throw error;
					cmsLogger.error(`GraphQL mutation error:`, error);
					throw new GraphQLError((error as Error).message, {
						extensions: { code: 'BAD_REQUEST' }
					});
				}
			};

			resolvers.Mutation[`unpublish${typeName}`] = async (_: any, __: any, context: any) => {
				try {
					const { localAPI, auth } = context;
					const apiContext = authToContext(auth);
					const collection = localAPI.collections[schemaType.name];
					await collection.get(apiContext);
					const doc = await collection.unpublish(
						apiContext,
						collection.getSingletonId(apiContext)!
					);
					if (!doc) {
						throw new GraphQLError('Singleton not found', { extensions: { code: 'NOT_FOUND' } });
					}
					return formatDoc(doc, 'draft');
				} catch (error) {
					if (error instanceof GraphQLError) throw error;
					cmsLogger.error(`GraphQL mutation error:`, error);
					throw new GraphQLError((error as Error).message, {
						extensions: { code: 'BAD_REQUEST' }
					});
				}
			};

			return; // skip the regular per-type resolvers below for singletons
		}

		// Single document resolver: page(id: "123", perspective: "draft")
		resolvers.Query[fieldName] = async (
			_: any,
			args: { id: string; perspective?: 'draft' | 'published'; depth?: number },
			context: any
		) => {
			try {
				const { localAPI, auth } = context;
				const apiContext = authToContext(auth);
				const perspective = args.perspective || defaultPerspective;

				// Store perspective in context for nested resolvers
				context.perspective = perspective;

				// Get collection from LocalAPI
				const collection = localAPI.collections[schemaType.name];
				if (!collection) {
					throw new GraphQLError(`Collection '${schemaType.name}' not found`, {
						extensions: { code: 'NOT_FOUND' }
					});
				}

				// Use LocalAPI to fetch document
				const doc = await collection.findByID(apiContext, args.id, {
					perspective,
					depth: args.depth || 0
				});

				if (!doc) {
					return null;
				}

				// Extract data from _meta
				const data = { ...doc };
				const meta = data._meta || {};
				delete data._meta;

				// Normalize array fields
				const normalizedData = normalizeDocumentFields(data, schemaType, schemaTypes);

				return {
					id: meta.id || args.id,
					type: meta.type || schemaType.name,
					status: perspective,
					createdAt: meta.createdAt?.toISOString() || null,
					updatedAt: meta.updatedAt?.toISOString() || null,
					publishedAt: meta.publishedAt?.toISOString() || null,
					...normalizedData
				};
			} catch (error) {
				if (error instanceof GraphQLError) {
					throw error;
				}
				throw new GraphQLError((error as Error).message, {
					extensions: { code: 'INTERNAL_SERVER_ERROR' }
				});
			}
		};

		// Collection resolver with advanced filtering: allPages(where: {...}, limit: 20, offset: 0, sort: "-publishedAt")
		resolvers.Query[`all${typeName}`] = async (
			_: any,
			args: {
				where?: any;
				perspective?: 'draft' | 'published';
				limit?: number;
				offset?: number;
				sort?: string;
				depth?: number;
			},
			context: any
		) => {
			try {
				const { localAPI, auth } = context;
				const apiContext = authToContext(auth);
				const perspective = args.perspective || defaultPerspective;

				// Store perspective in context for nested resolvers
				context.perspective = perspective;

				// Get collection from LocalAPI
				const collection = localAPI.collections[schemaType.name];
				if (!collection) {
					throw new GraphQLError(`Collection '${schemaType.name}' not found`, {
						extensions: { code: 'NOT_FOUND' }
					});
				}

				// Parse where clause
				const where = parseWhereInput(args.where);

				// Use LocalAPI to fetch documents
				const result = await collection.find(apiContext, {
					where,
					perspective,
					limit: args.limit || 50,
					offset: args.offset || 0,
					sort: args.sort || '-createdAt',
					depth: args.depth || 0
				});

				// Map documents to GraphQL format
				return result.docs.map((doc: any) => {
					const data = { ...doc };
					const meta = data._meta || {};
					delete data._meta;

					// Normalize array fields
					const normalizedData = normalizeDocumentFields(data, schemaType, schemaTypes);

					return {
						id: meta.id || doc.id,
						type: meta.type || schemaType.name,
						status: perspective,
						createdAt: meta.createdAt?.toISOString() || null,
						updatedAt: meta.updatedAt?.toISOString() || null,
						publishedAt: meta.publishedAt?.toISOString() || null,
						...normalizedData
					};
				});
			} catch (error) {
				if (error instanceof GraphQLError) {
					throw error;
				}
				throw new GraphQLError((error as Error).message, {
					extensions: { code: 'INTERNAL_SERVER_ERROR' }
				});
			}
		};

		// Mutation: createDocument
		resolvers.Mutation[`create${typeName}`] = async (
			_: any,
			args: { data: any; publish?: boolean },
			context: any
		) => {
			try {
				const { localAPI, auth } = context;
				const apiContext = authToContext(auth);

				// Get collection from LocalAPI
				const collection = localAPI.collections[schemaType.name];
				if (!collection) {
					throw new GraphQLError(`Collection '${schemaType.name}' not found`, {
						extensions: { code: 'NOT_FOUND' }
					});
				}

				// Sanitize input data (convert null to undefined)
				const sanitizedData = sanitizeInputData(args.data);

				// Create document via LocalAPI
				const result = await collection.create(apiContext, sanitizedData, {
					publish: args.publish || false
				});
				const doc = result.document;

				const perspective = args.publish ? 'published' : 'draft';
				const data = { ...doc };
				const meta = data._meta || {};
				delete data._meta;

				// Normalize document fields
				const normalizedData = normalizeDocumentFields(data, schemaType, schemaTypes);

				return {
					id: meta.id || doc.id,
					type: meta.type || schemaType.name,
					status: perspective,
					createdAt: meta.createdAt?.toISOString() || null,
					updatedAt: meta.updatedAt?.toISOString() || null,
					publishedAt: meta.publishedAt?.toISOString() || null,
					...normalizedData
				};
			} catch (error) {
				if (error instanceof GraphQLError) {
					throw error;
				}
				cmsLogger.error(`GraphQL mutation error:`, error);
				throw new GraphQLError((error as Error).message, {
					extensions: { code: 'BAD_REQUEST' }
				});
			}
		};

		// Mutation: updateDocument
		resolvers.Mutation[`update${typeName}`] = async (
			_: any,
			args: { id: string; data: any; publish?: boolean },
			context: any
		) => {
			try {
				const { localAPI, auth } = context;
				const apiContext = authToContext(auth);

				// Get collection from LocalAPI
				const collection = localAPI.collections[schemaType.name];
				if (!collection) {
					throw new GraphQLError(`Collection '${schemaType.name}' not found`, {
						extensions: { code: 'NOT_FOUND' }
					});
				}

				// Sanitize input data (convert null to undefined)
				const sanitizedData = sanitizeInputData(args.data);

				// Update document via LocalAPI
				const result = await collection.update(apiContext, args.id, sanitizedData, {
					publish: args.publish || false
				});

				if (!result) {
					throw new GraphQLError('Document not found', {
						extensions: { code: 'NOT_FOUND' }
					});
				}
				const doc = result.document;

				const perspective = args.publish ? 'published' : 'draft';
				const data = { ...doc };
				const meta = data._meta || {};
				delete data._meta;

				// Normalize document fields
				const normalizedData = normalizeDocumentFields(data, schemaType, schemaTypes);

				return {
					id: meta.id || args.id,
					type: meta.type || schemaType.name,
					status: perspective,
					createdAt: meta.createdAt?.toISOString() || null,
					updatedAt: meta.updatedAt?.toISOString() || null,
					publishedAt: meta.publishedAt?.toISOString() || null,
					...normalizedData
				};
			} catch (error) {
				if (error instanceof GraphQLError) {
					throw error;
				}
				cmsLogger.error(`GraphQL mutation error:`, error);
				throw new GraphQLError((error as Error).message, {
					extensions: { code: 'BAD_REQUEST' }
				});
			}
		};

		// Mutation: deleteDocument
		resolvers.Mutation[`delete${typeName}`] = async (
			_: any,
			args: { id: string },
			context: any
		) => {
			try {
				const { localAPI, auth } = context;
				const apiContext = authToContext(auth);

				// Get collection from LocalAPI
				const collection = localAPI.collections[schemaType.name];
				if (!collection) {
					throw new GraphQLError(`Collection '${schemaType.name}' not found`, {
						extensions: { code: 'NOT_FOUND' }
					});
				}

				// Delete document via LocalAPI
				const success = await collection.delete(apiContext, args.id);

				return { success };
			} catch (error) {
				if (error instanceof GraphQLError) {
					throw error;
				}
				cmsLogger.error(`GraphQL mutation error:`, error);
				throw new GraphQLError((error as Error).message, {
					extensions: { code: 'BAD_REQUEST' }
				});
			}
		};

		// Mutation: publishDocument
		resolvers.Mutation[`publish${typeName}`] = async (
			_: any,
			args: { id: string },
			context: any
		) => {
			try {
				const { localAPI, auth } = context;
				const apiContext = authToContext(auth);

				// Get collection from LocalAPI
				const collection = localAPI.collections[schemaType.name];
				if (!collection) {
					throw new GraphQLError(`Collection '${schemaType.name}' not found`, {
						extensions: { code: 'NOT_FOUND' }
					});
				}

				// Publish document via LocalAPI
				const doc = await collection.publish(apiContext, args.id);

				if (!doc) {
					throw new GraphQLError('Document not found', {
						extensions: { code: 'NOT_FOUND' }
					});
				}

				const data = { ...doc };
				const meta = data._meta || {};
				delete data._meta;

				// Normalize array fields
				const normalizedData = normalizeDocumentFields(data, schemaType, schemaTypes);

				return {
					id: meta.id || args.id,
					type: meta.type || schemaType.name,
					status: 'published',
					createdAt: meta.createdAt?.toISOString() || null,
					updatedAt: meta.updatedAt?.toISOString() || null,
					publishedAt: meta.publishedAt?.toISOString() || null,
					...normalizedData
				};
			} catch (error) {
				if (error instanceof GraphQLError) {
					throw error;
				}
				cmsLogger.error(`GraphQL mutation error:`, error);
				throw new GraphQLError((error as Error).message, {
					extensions: { code: 'BAD_REQUEST' }
				});
			}
		};

		// Mutation: unpublishDocument
		resolvers.Mutation[`unpublish${typeName}`] = async (
			_: any,
			args: { id: string },
			context: any
		) => {
			try {
				const { localAPI, auth } = context;
				const apiContext = authToContext(auth);

				// Get collection from LocalAPI
				const collection = localAPI.collections[schemaType.name];
				if (!collection) {
					throw new GraphQLError(`Collection '${schemaType.name}' not found`, {
						extensions: { code: 'NOT_FOUND' }
					});
				}

				// Unpublish document via LocalAPI
				const doc = await collection.unpublish(apiContext, args.id);

				if (!doc) {
					throw new GraphQLError('Document not found', {
						extensions: { code: 'NOT_FOUND' }
					});
				}

				const data = { ...doc };
				const meta = data._meta || {};
				delete data._meta;

				// Normalize array fields
				const normalizedData = normalizeDocumentFields(data, schemaType, schemaTypes);

				return {
					id: meta.id || args.id,
					type: meta.type || schemaType.name,
					status: 'draft',
					createdAt: meta.createdAt?.toISOString() || null,
					updatedAt: meta.updatedAt?.toISOString() || null,
					publishedAt: null,
					...normalizedData
				};
			} catch (error) {
				if (error instanceof GraphQLError) {
					throw error;
				}
				cmsLogger.error(`GraphQL mutation error:`, error);
				throw new GraphQLError((error as Error).message, {
					extensions: { code: 'BAD_REQUEST' }
				});
			}
		};
	});

	return resolvers;
}
