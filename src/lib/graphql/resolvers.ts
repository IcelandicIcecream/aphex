import type { CMSEngine } from '../cms/engine.js';
import type { SchemaType } from '../cms/types.js';

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function createResolvers(cms: CMSEngine, schemaTypes: SchemaType[]) {
  const resolvers: Record<string, any> = {
    Query: {}
  };

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