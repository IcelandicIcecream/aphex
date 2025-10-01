import type { SchemaType } from '../types.js';
export interface OrphanedField {
    path: string;
    key: string;
    value: any;
    level: 'document' | 'nested';
}
export interface SchemaCleanupResult {
    hasOrphanedFields: boolean;
    orphanedFields: OrphanedField[];
    cleanedData: Record<string, any>;
}
/**
 * Find orphaned fields in document data that no longer exist in the schema
 */
export declare function findOrphanedFields(documentData: Record<string, any>, schema: SchemaType): SchemaCleanupResult;
/**
 * Apply cleanup by removing orphaned fields from document data
 */
export declare function applySchemaCleanup(documentData: Record<string, any>, schema: SchemaType): Record<string, any>;
/**
 * Format orphaned fields for display to user
 */
export declare function formatOrphanedFieldsMessage(orphanedFields: OrphanedField[]): string;
//# sourceMappingURL=cleanup.d.ts.map