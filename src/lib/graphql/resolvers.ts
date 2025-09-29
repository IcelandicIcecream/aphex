import type { CMSEngine } from '../cms/engine.js';
import type { SchemaType } from '../cms/types.js';

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function createResolvers(cms: CMSEngine, schemaTypes: SchemaType[]) {
  const resolvers: Record<string, any> = {
    Query: {}
  };

  // Generate reference field resolvers for all types
  function generateReferenceFieldResolvers() {
    schemaTypes.forEach(schemaType => {
      const typeName = capitalizeFirst(schemaType.name);

      function processFields(fields: any[], currentTypeName: string) {
        fields.forEach((field: any) => {
          // Handle reference fields
          if (field.type === 'reference' && field.to && field.to.length > 0) {
            const targetType = field.to[0].type;

            // Create resolver for this reference field
            if (!resolvers[currentTypeName]) {
              resolvers[currentTypeName] = {};
            }

            resolvers[currentTypeName][field.name] = async (parent: any, args: any, context: any) => {
              const referenceId = parent[field.name];
              if (!referenceId || typeof referenceId !== 'string') {
                return null;
              }

              try {
                // Use the same perspective as the parent document (default to published)
                const perspective = parent.status || 'published';

                // Get the referenced document
                const referencedDoc = await cms.getDocument(referenceId, perspective);
                if (!referencedDoc) {
                  return null;
                }

                return {
                  id: referencedDoc.id,
                  type: referencedDoc.type,
                  status: perspective,
                  createdAt: referencedDoc.createdAt.toISOString(),
                  updatedAt: referencedDoc.updatedAt.toISOString(),
                  publishedAt: null,
                  ...referencedDoc.data
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
    schemaTypes.forEach(schemaType => {
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
  const documentTypes = schemaTypes.filter(type => type.type === 'document');

  documentTypes.forEach(schemaType => {
    const typeName = capitalizeFirst(schemaType.name);

    // Single document resolver: page(id: "123", perspective: "draft")
    resolvers.Query[schemaType.name] = async (_: any, args: { id: string, perspective?: 'draft' | 'published' }) => {
      const perspective = args.perspective || 'published'; // Default to published for public API
      const document = await cms.getDocument(args.id, perspective);
      if (!document) return null;

      return {
        id: document.id,
        type: document.type,
        status: perspective, // Reflect the requested perspective
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
        publishedAt: null, // TODO: Get from raw DB record if needed
        ...document.data
      };
    };

    // Collection resolver: allPages(perspective: "published", status: "published")
    resolvers.Query[`all${typeName}`] = async (_: any, args: { perspective?: 'draft' | 'published', status?: string }) => {
      const perspective = args.perspective || 'published';
      const options: any = {};

      // Filter by document status if provided
      if (args.status) {
        options.status = args.status;
      }

      const result = await cms.listDocuments(schemaType.name, options);

      // Get each document with the correct perspective
      const documents = [];
      for (const doc of result.docs) {
        const fullDoc = await cms.getDocument(doc.id, perspective);
        if (fullDoc) {
          documents.push({
            id: fullDoc.id,
            type: fullDoc.type,
            status: perspective, // Reflect the requested perspective
            createdAt: fullDoc.createdAt.toISOString(),
            updatedAt: fullDoc.updatedAt.toISOString(),
            publishedAt: null, // TODO: Add if needed from raw DB
            ...fullDoc.data
          });
        }
      }

      return documents;
    };
  });

  return resolvers;
}