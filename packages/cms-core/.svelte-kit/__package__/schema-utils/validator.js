/**
 * Validate all schema references to ensure they exist
 */
export function validateSchemaReferences(schemas) {
    const schemaNames = new Set(schemas.map(schema => schema.name));
    const errors = [];
    function validateField(field, parentSchema) {
        // Check array field references
        if (field.type === 'array' && field.of) {
            for (const arrayType of field.of) {
                if (!schemaNames.has(arrayType.type)) {
                    errors.push(`Schema "${parentSchema}" field "${field.name}" references unknown type "${arrayType.type}"`);
                }
            }
        }
        // Check object field references (if they reference external types)
        if (field.type === 'object' && typeof field.fields === 'string') {
            if (!schemaNames.has(field.fields)) {
                errors.push(`Schema "${parentSchema}" field "${field.name}" references unknown object type "${field.fields}"`);
            }
        }
        // Recursively check nested fields
        if (field.fields && Array.isArray(field.fields)) {
            for (const nestedField of field.fields) {
                validateField(nestedField, parentSchema);
            }
        }
    }
    // Validate each schema
    for (const schema of schemas) {
        if (schema.fields) {
            for (const field of schema.fields) {
                validateField(field, schema.name);
            }
        }
    }
    // Throw error if any validation issues found
    if (errors.length > 0) {
        console.error('\nSchema Validation Errors:');
        errors.forEach(error => console.error(error));
        // Just throw the errors directly
        throw new Error(errors.join('\n'));
    }
    console.log('✅ Schema validation passed - all references are valid');
}
