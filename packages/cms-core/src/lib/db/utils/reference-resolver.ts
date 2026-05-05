// Reference resolution utility for resolving nested document references
import type { Document } from '../../types/index';
import type { DocumentAdapter } from '../interfaces/document';

interface ResolveOptions {
	depth: number;
	currentDepth?: number;
	visited?: Set<string>; // Track visited documents to prevent circular references
}

/**
 * Recursively resolves reference fields in a document. Both singular and
 * array refs share the on-disk shape `{ _type: 'reference', _ref }`, so the
 * resolver finds them by that marker and replaces the entire object with
 * the fetched document.
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

function isReference(value: unknown): value is { _type: 'reference'; _ref: string } {
	return (
		!!value &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		(value as Record<string, unknown>)._type === 'reference' &&
		typeof (value as Record<string, unknown>)._ref === 'string'
	);
}

/**
 * Resolves references within document data (recursive). Refs are spotted
 * by their `_type === 'reference'` marker — no string heuristics — and
 * replaced with the fetched target. Other fields recurse so refs nested
 * inside objects/arrays still get caught.
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

	// Reference object — fetch and recurse for deeper resolution
	if (isReference(data)) {
		const refId = data._ref;
		try {
			const referencedDoc = await adapter.findByDocIdAdvanced(organizationId, refId);
			if (referencedDoc) {
				return await resolveReferences(referencedDoc, adapter, organizationId, options);
			}
		} catch {
			// Swallow and fall through — return the unresolved ref so callers
			// can still see it exists.
		}
		return data;
	}

	// Arrays
	if (Array.isArray(data)) {
		return Promise.all(
			data.map((item) => resolveDataReferences(item, adapter, organizationId, options))
		);
	}

	// Objects — recurse into each field
	const resolved: any = {};
	for (const [key, value] of Object.entries(data)) {
		if (value && typeof value === 'object') {
			resolved[key] = await resolveDataReferences(value, adapter, organizationId, options);
		} else {
			resolved[key] = value;
		}
	}
	return resolved;
}
