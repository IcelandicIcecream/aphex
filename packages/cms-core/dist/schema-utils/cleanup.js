/**
 * Find orphaned fields in document data that no longer exist in the schema
 */
export function findOrphanedFields(documentData, schema) {
    const orphanedFields = [];
    const validFieldNames = new Set(schema.fields.map(field => field.name));
    function checkObject(obj, fields, pathPrefix = '') {
        const cleaned = {};
        const fieldMap = new Map(fields.map(field => [field.name, field]));
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
            const field = fieldMap.get(key);
            if (!field) {
                // Orphaned field found
                orphanedFields.push({
                    path: currentPath,
                    key,
                    value,
                    level: pathPrefix ? 'nested' : 'document'
                });
                continue; // Skip this field in cleaned data
            }
            // Recursively check nested objects and arrays
            if (field.type === 'object' && field.fields && value && typeof value === 'object') {
                cleaned[key] = checkObject(value, field.fields, currentPath);
            }
            else if (field.type === 'array' && Array.isArray(value)) {
                cleaned[key] = checkArray(value, field, currentPath);
            }
            else {
                cleaned[key] = value;
            }
        }
        return cleaned;
    }
    function checkArray(array, arrayField, pathPrefix) {
        if (arrayField.type !== 'array' || !arrayField.of) {
            return array;
        }
        return array.map((item, index) => {
            const itemPath = `${pathPrefix}[${index}]`;
            if (item && typeof item === 'object' && item._type) {
                // Find the schema for this array item type
                const itemTypeSchema = getSchemaForArrayItem(item._type, arrayField);
                if (itemTypeSchema && itemTypeSchema.fields) {
                    return checkObject(item, itemTypeSchema.fields, itemPath);
                }
            }
            return item;
        });
    }
    const cleanedData = checkObject(documentData, schema.fields);
    return {
        hasOrphanedFields: orphanedFields.length > 0,
        orphanedFields,
        cleanedData
    };
}
/**
 * Get the schema for an array item type (helper function)
 * This would need to be integrated with your schema registry
 */
function getSchemaForArrayItem(typeName, arrayField) {
    // This is a placeholder - you'd need to integrate with your actual schema registry
    // For now, we'll assume inline object schemas
    if (arrayField.of) {
        const typeRef = arrayField.of.find(ref => ref.type === typeName);
        if (typeRef && typeof typeRef !== 'string') {
            // Handle inline schema definitions if needed
            return null;
        }
    }
    return null;
}
/**
 * Apply cleanup by removing orphaned fields from document data
 */
export function applySchemaCleanup(documentData, schema) {
    const result = findOrphanedFields(documentData, schema);
    return result.cleanedData;
}
/**
 * Format orphaned fields for display to user
 */
export function formatOrphanedFieldsMessage(orphanedFields) {
    if (orphanedFields.length === 0)
        return '';
    const documentFields = orphanedFields.filter(f => f.level === 'document');
    const nestedFields = orphanedFields.filter(f => f.level === 'nested');
    let message = 'The following fields exist in your document data but are no longer defined in the schema:\n\n';
    if (documentFields.length > 0) {
        message += '**Document-level fields:**\n';
        documentFields.forEach(field => {
            message += `• ${field.key} (value: ${JSON.stringify(field.value)})\n`;
        });
        message += '\n';
    }
    if (nestedFields.length > 0) {
        message += '**Nested fields:**\n';
        nestedFields.forEach(field => {
            message += `• ${field.path} (value: ${JSON.stringify(field.value)})\n`;
        });
        message += '\n';
    }
    message += 'Would you like to remove these orphaned fields from your document?';
    return message;
}
