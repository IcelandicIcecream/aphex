import { schemaTypes } from '$lib/schemaTypes/index.js';
import type { SchemaType } from './types';

/**
 * Get a schema type by name
 */
export function getSchemaByName(name: string): SchemaType | null {
  return schemaTypes.find(schema => schema.name === name) || null;
}

/**
 * Get all available object types (for array field dropdowns)
 */
export function getObjectTypes(): SchemaType[] {
  return schemaTypes.filter(schema => schema.type === 'object');
}

/**
 * Get all available document types
 */
export function getDocumentTypes(): SchemaType[] {
  return schemaTypes.filter(schema => schema.type === 'document');
}

/**
 * Check if a schema type exists
 */
export function schemaExists(name: string): boolean {
  return schemaTypes.some(schema => schema.name === name);
}

/**
 * Get the available types for an array field
 */
export function getArrayTypes(arrayField: { of?: Array<{ type: string }> }): SchemaType[] {
  if (!arrayField.of) return [];

  const typeNames = arrayField.of.map(item => item.type);
  return schemaTypes.filter(schema => typeNames.includes(schema.name));
}