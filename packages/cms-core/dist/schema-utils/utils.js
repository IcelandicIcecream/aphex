/**
 * Schema utility functions that work with a schema registry
 * These functions accept schemas as parameters to avoid package-level dependencies
 */
/**
 * Get a schema type by name from a collection of schemas
 */
export function getSchemaByName(schemas, name) {
    return schemas.find(schema => schema.name === name) || null;
}
/**
 * Get all available object types (for array field dropdowns)
 */
export function getObjectTypes(schemas) {
    return schemas.filter(schema => schema.type === 'object');
}
/**
 * Get all available document types
 */
export function getDocumentTypes(schemas) {
    return schemas.filter(schema => schema.type === 'document');
}
/**
 * Check if a schema type exists
 */
export function schemaExists(schemas, name) {
    return schemas.some(schema => schema.name === name);
}
/**
 * Get the available types for an array field
 */
export function getArrayTypes(schemas, arrayField) {
    if (!arrayField.of)
        return [];
    const typeNames = arrayField.of.map(item => item.type);
    return schemas.filter(schema => typeNames.includes(schema.name));
}
