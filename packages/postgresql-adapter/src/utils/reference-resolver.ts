// Reference resolution utility for resolving nested document references
import type { Document, DocumentAdapter } from '@aphexcms/cms-core/server';

interface ResolveOptions {
	depth: number;
	currentDepth?: number;
	visited?: Set<string>; // Track visited documents to prevent circular references
}

/**
 * Recursively resolves reference fields in a document
 * @param document - The document to resolve references for
 * @param adapter - Document adapter for fetching referenced documents
 * @param organizationId - Organization ID for filtering referenced documents
 * @param options - Resolution options (depth, tracking)
 * @returns Document with resolved references
 */
export async function resolveReferences(
	document: Document,
	adapter: DocumentAdapter,
	organizationId: string,
	options: ResolveOptions
): Promise<Document> {
	const { depth, currentDepth = 0, visited = new Set() } = options;

	// Base case: no more depth to resolve or already visited (circular reference)
	if (currentDepth >= depth || visited.has(document.id)) {
		return document;
	}

	// Mark as visited
	visited.add(document.id);

	// Clone the document to avoid mutations
	const resolvedDocument = { ...document };

	// Resolve references in draftData
	if (document.draftData) {
		resolvedDocument.draftData = await resolveDataReferences(
			document.draftData,
			adapter,
			organizationId,
			{
				depth,
				currentDepth: currentDepth + 1,
				visited
			}
		);
	}

	// Resolve references in publishedData
	if (document.publishedData) {
		resolvedDocument.publishedData = await resolveDataReferences(
			document.publishedData,
			adapter,
			organizationId,
			{
				depth,
				currentDepth: currentDepth + 1,
				visited
			}
		);
	}

	return resolvedDocument;
}

/**
 * Resolves references within document data (recursive)
 */
async function resolveDataReferences(
	data: any,
	adapter: DocumentAdapter,
	organizationId: string,
	options: ResolveOptions
): Promise<any> {
	if (!data || typeof data !== 'object') {
		return data;
	}

	// Handle arrays
	if (Array.isArray(data)) {
		return Promise.all(
			data.map((item) => resolveDataReferences(item, adapter, organizationId, options))
		);
	}

	// Clone object
	const resolved: any = {};

	for (const [key, value] of Object.entries(data)) {
		// Check if this looks like a reference field (string ID)
		if (typeof value === 'string' && key !== '_type' && key !== '_key') {
			// Try to fetch the referenced document
			try {
				const referencedDoc = await adapter.findByDocId(organizationId, value);
				if (referencedDoc) {
					// Recursively resolve nested references
					resolved[key] = await resolveReferences(referencedDoc, adapter, organizationId, options);
				} else {
					// Reference not found, keep the ID
					resolved[key] = value;
				}
			} catch (error) {
				// On error, keep the original value
				resolved[key] = value;
			}
		} else if (value && typeof value === 'object') {
			// Recursively resolve nested objects/arrays
			resolved[key] = await resolveDataReferences(value, adapter, organizationId, options);
		} else {
			// Primitive value, keep as is
			resolved[key] = value;
		}
	}

	return resolved;
}
