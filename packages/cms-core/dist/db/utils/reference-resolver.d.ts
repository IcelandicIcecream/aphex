import type { Document } from '../schema.js';
import type { DocumentAdapter } from '../interfaces/document.js';
interface ResolveOptions {
    depth: number;
    currentDepth?: number;
    visited?: Set<string>;
}
/**
 * Recursively resolves reference fields in a document
 * @param document - The document to resolve references for
 * @param adapter - Document adapter for fetching referenced documents
 * @param options - Resolution options (depth, tracking)
 * @returns Document with resolved references
 */
export declare function resolveReferences(document: Document, adapter: DocumentAdapter, options: ResolveOptions): Promise<Document>;
export {};
//# sourceMappingURL=reference-resolver.d.ts.map