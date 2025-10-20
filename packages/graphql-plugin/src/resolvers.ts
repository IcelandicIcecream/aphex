import type { CMSInstances, SchemaType, Field } from '@aphex/cms-core/server';

function capitalizeFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

// Convert null arrays to empty arrays based on schema definition (recursive)
function normalizeArrayFields(data: any, schemaType: SchemaType, allSchemaTypes: SchemaType[]): any {
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

export function createResolvers(
	cms: CMSInstances,
	schemaTypes: SchemaType[],
	defaultPerspective: 'draft' | 'published' = 'published'
) {
	const resolvers: Record<string, any> = {
		Query: {}
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

						resolvers[currentTypeName][field.name] = async (parent: any, _args: any, context: any) => {
							const referenceId = parent[field.name];
							if (!referenceId || typeof referenceId !== 'string') {
								return null;
							}

							try {
								// Use the same perspective as the parent document
								// Check parent.status first, then fall back to context perspective, then default
								const perspective = parent.status || context?.perspective || defaultPerspective;

								// Get organizationId from context (set by GraphQL server)
								const organizationId = context?.organizationId;
								if (!organizationId) {
									console.error('organizationId not found in GraphQL context');
									return null;
								}

								// Get the referenced document
								const referencedDoc = await cms.databaseAdapter.findByDocId(organizationId, referenceId);
								if (!referencedDoc) {
									return null;
								}

								// Select the correct data based on perspective
								const data = perspective === 'published'
									? referencedDoc.publishedData
									: referencedDoc.draftData;

							     // If the referenced document has no data for this perspective, return null
								if (!data) return null;

								// Find the schema type for normalization
								const refSchemaType = schemaTypes.find((s) => s.name === referencedDoc.type);
								const normalizedData = refSchemaType ? normalizeArrayFields(data, refSchemaType, schemaTypes) : data;

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
			args: { id: string; perspective?: 'draft' | 'published' },
			context: any
		) => {
			const perspective = args.perspective || defaultPerspective;

			// Store perspective in context for nested resolvers
			context.perspective = perspective;

			// Get organizationId from context (set by GraphQL server)
			const organizationId = context?.organizationId;
			if (!organizationId) {
				throw new Error('organizationId not found in GraphQL context');
			}

			const document = await cms.databaseAdapter.findByDocId(organizationId, args.id);
			if (!document) return null;

			// Select the correct data based on perspective
			const data = perspective === 'published' ? document.publishedData : document.draftData;

			// If the requested perspective has no data, return null
			if (!data) return null;

			// Normalize array fields (convert null arrays to empty arrays)
			const normalizedData = normalizeArrayFields(data, schemaType, schemaTypes);

			return {
				id: document.id,
				type: document.type,
				status: perspective, // Reflect the requested perspective
				createdAt: document.createdAt?.toISOString() || null,
				updatedAt: document.updatedAt?.toISOString() || null,
				publishedAt: null, // TODO: Get from raw DB record if needed
				...normalizedData
			};
		};

		// Collection resolver: allPages(perspective: "published", status: "published")
		resolvers.Query[`all${typeName}`] = async (
			_: any,
			args: { perspective?: 'draft' | 'published'; status?: string },
			context: any
		) => {
			const perspective = args.perspective || defaultPerspective;

			// Store perspective in context for nested resolvers
			context.perspective = perspective;

			// Get organizationId from context (set by GraphQL server)
			const organizationId = context?.organizationId;
			if (!organizationId) {
				throw new Error('organizationId not found in GraphQL context');
			}

			const options: any = { type: schemaType.name };

			// Filter by document status if provided
			if (args.status) {
				options.status = args.status;
			}

			const documents = await cms.databaseAdapter.findManyDoc(organizationId, options);

			// Map documents to GraphQL format with the correct perspective
			// Filter out documents where the requested perspective has no data
			return documents
				.map((doc) => {
					const data = perspective === 'published' ? doc.publishedData : doc.draftData;

					// Skip documents with no data for the requested perspective
					if (!data) return null;

					// Normalize array fields (convert null arrays to empty arrays)
					const normalizedData = normalizeArrayFields(data, schemaType, schemaTypes);

					return {
						id: doc.id,
						type: doc.type,
						status: perspective, // Reflect the requested perspective
						createdAt: doc.createdAt?.toISOString() || null,
						updatedAt: doc.updatedAt?.toISOString() || null,
						publishedAt: null, // TODO: Add if needed from raw DB
						...normalizedData
					};
				})
				.filter((doc) => doc !== null);
		};
	});

	return resolvers;
}
