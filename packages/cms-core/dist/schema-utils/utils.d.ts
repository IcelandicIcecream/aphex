import type { SchemaType } from '../types.js';
/**
 * Schema utility functions that work with a schema registry
 * These functions accept schemas as parameters to avoid package-level dependencies
 */
/**
 * Get a schema type by name from a collection of schemas
 */
export declare function getSchemaByName(schemas: SchemaType[], name: string): SchemaType | null;
/**
 * Get all available object types (for array field dropdowns)
 */
export declare function getObjectTypes(schemas: SchemaType[]): SchemaType[];
/**
 * Get all available document types
 */
export declare function getDocumentTypes(schemas: SchemaType[]): SchemaType[];
/**
 * Check if a schema type exists
 */
export declare function schemaExists(schemas: SchemaType[], name: string): boolean;
/**
 * Get the available types for an array field
 */
export declare function getArrayTypes(schemas: SchemaType[], arrayField: {
    of?: Array<{
        type: string;
    }>;
}): SchemaType[];
//# sourceMappingURL=utils.d.ts.map