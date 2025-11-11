import type { CMSInstances, SchemaType, Field } from '@aphexcms/cms-core/server';
import { GraphQLError } from 'graphql';
import { authToContext } from '@aphexcms/cms-core/local-api/auth-helpers';

function capitalizeFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

// Convert null arrays to empty arrays based on schema definition (recursive)
function normalizeArrayFields(
	data: any,
	schemaType: SchemaType,
	allSchemaTypes: SchemaType[]
): any {
	if (!data) return data;

	const normalized = { ...data };

	schemaType.fields.forEach((field: Field) => {
		const fieldValue = normalized[field.name];

		// Normalize null arrays to empty arrays
		if (field.type === 'array' && fieldValue === null) {
			normalized[field.name] = [];
		}

		// Recursively normalize nested objects
		if (field.type === 'object' && fieldValue && (field as any).fields) {
			// For inline objects, we need to create a synthetic schema type
			const syntheticSchema: SchemaType = {
				name: `${schemaType.name}_${field.name}`,
				type: 'object',
				fields: (field as any).fields,
				title: field.title || field.name
			};
			normalized[field.name] = normalizeArrayFields(fieldValue, syntheticSchema, allSchemaTypes);
		}

		// Recursively normalize arrays of objects
		if (field.type === 'array' && Array.isArray(fieldValue) && (field as any).of) {
			normalized[field.name] = fieldValue.map((item: any) => {
				if (item && typeof item === 'object' && item._type) {
					// Find the schema type for this array item
					const itemSchema = allSchemaTypes.find((s) => s.name === item._type);
					if (itemSchema) {
						return normalizeArrayFields(item, itemSchema, allSchemaTypes);
					}
				}
				return item;
			});
		}
	});

	return normalized;
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
			if ('greater_than_equal' in value)
				parsed[key].greater_than_equal = value.greater_than_equal;
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
			const typeName = capitalizeFirst(schemaType.name);

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
							const referenceId = parent[field.name];
							if (!referenceId || typeof referenceId !== 'string') {
								return null;
							}

							try {
								// Use LocalAPI to fetch referenced document
								const { auth } = context;
								const apiContext = authToContext(auth);

								// Use the same perspective as the parent document
								const perspective = parent.status || context?.perspective || defaultPerspective;

								// Get referenced document - need to determine the collection type
								// For now, we'll try to find it by ID across all collections
								const referencedDoc = await cms.databaseAdapter.findByDocId(
									apiContext.organizationId,
									referenceId
								);

								if (!referencedDoc) {
									return null;
								}

								// Select the correct data based on perspective
								const data =
									perspective === 'published'
										? referencedDoc.publishedData
										: referencedDoc.draftData;

								// If the referenced document has no data for this perspective, return null
								if (!data) return null;

								// Find the schema type for normalization
								const refSchemaType = schemaTypes.find((s) => s.name === referencedDoc.type);
								const normalizedData = refSchemaType
									? normalizeArrayFields(data, refSchemaType, schemaTypes)
									: data;

								return {
									id: referencedDoc.id,
									type: referencedDoc.type,
									status: perspective,
									createdAt: referencedDoc.createdAt?.toISOString() || null,
									updatedAt: referencedDoc.updatedAt?.toISOString() || null,
									publishedAt: null,
									...normalizedData
								};
							} catch (error) {
								console.error(`Failed to resolve reference ${field.name}:`, error);
								return null;
							}
						};
					}

					// Handle nested objects
					if (field.type === 'object' && field.fields) {
						const nestedTypeName = capitalizeFirst(`${schemaType.name}${field.name}Object`);
						processFields(field.fields, nestedTypeName);
					}
				});
			}

			processFields(schemaType.fields, typeName);
		});
	}

	generateReferenceFieldResolvers();

	// Generate union type resolvers for array fields
	function generateUnionResolvers() {
		schemaTypes.forEach((schemaType) => {
			function processFields(fields: any[], parentName: string) {
				fields.forEach((field: any) => {
					if (field.type === 'array' && field.of && field.of.length > 1) {
						// Create resolver for union types
						const unionName = `${capitalizeFirst(parentName)}${capitalizeFirst(field.name)}Item`;

						resolvers[unionName] = {
							__resolveType(obj: any) {
								// Use the _type field to determine GraphQL type
								if (obj._type) {
									return capitalizeFirst(obj._type);
								}
								return null;
							}
						};
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
		const typeName = capitalizeFirst(schemaType.name);

		// Single document resolver: page(id: "123", perspective: "draft")
		resolvers.Query[schemaType.name] = async (
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
				const normalizedData = normalizeArrayFields(data, schemaType, schemaTypes);

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
					sort: args.sort || undefined,
					depth: args.depth || 0
				});

				// Map documents to GraphQL format
				return result.docs.map((doc: any) => {
					const data = { ...doc };
					const meta = data._meta || {};
					delete data._meta;

					// Normalize array fields
					const normalizedData = normalizeArrayFields(data, schemaType, schemaTypes);

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

				// Create document via LocalAPI
				const doc = await collection.create(apiContext, args.data, {
					publish: args.publish || false
				});

				const perspective = args.publish ? 'published' : 'draft';
				const data = { ...doc };
				const meta = data._meta || {};
				delete data._meta;

				// Normalize array fields
				const normalizedData = normalizeArrayFields(data, schemaType, schemaTypes);

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

				// Update document via LocalAPI
				const doc = await collection.update(apiContext, args.id, args.data, {
					publish: args.publish || false
				});

				if (!doc) {
					throw new GraphQLError('Document not found', {
						extensions: { code: 'NOT_FOUND' }
					});
				}

				const perspective = args.publish ? 'published' : 'draft';
				const data = { ...doc };
				const meta = data._meta || {};
				delete data._meta;

				// Normalize array fields
				const normalizedData = normalizeArrayFields(data, schemaType, schemaTypes);

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
				const normalizedData = normalizeArrayFields(data, schemaType, schemaTypes);

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
				const normalizedData = normalizeArrayFields(data, schemaType, schemaTypes);

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
				throw new GraphQLError((error as Error).message, {
					extensions: { code: 'BAD_REQUEST' }
				});
			}
		};
	});

	return resolvers;
}
