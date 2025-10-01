import type { SchemaType } from '../types.js';

/**
 * Schema utility functions that work with a schema registry
 * These functions accept schemas as parameters to avoid package-level dependencies
 */

/**
 * Get a schema type by name from a collection of schemas
 */
export function getSchemaByName(schemas: SchemaType[], name: string): SchemaType | null {
  return schemas.find(schema => schema.name === name) || null;
}

/**
 * Get all available object types (for array field dropdowns)
 */
export function getObjectTypes(schemas: SchemaType[]): SchemaType[] {
  return schemas.filter(schema => schema.type === 'object');
}

/**
 * Get all available document types
 */
export function getDocumentTypes(schemas: SchemaType[]): SchemaType[] {
  return schemas.filter(schema => schema.type === 'document');
}

/**
 * Check if a schema type exists
 */
export function schemaExists(schemas: SchemaType[], name: string): boolean {
  return schemas.some(schema => schema.name === name);
}

/**
 * Get the available types for an array field
 */
export function getArrayTypes(schemas: SchemaType[], arrayField: { of?: Array<{ type: string }> }): SchemaType[] {
  if (!arrayField.of) return [];

  const typeNames = arrayField.of.map(item => item.type);
  return schemas.filter(schema => typeNames.includes(schema.name));
}
