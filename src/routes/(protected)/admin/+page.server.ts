// Server-side data loading for admin dashboard
import { createCMS, getCMS } from '$lib/cms/engine.js';
import { loadCMSConfig } from '$lib/cms/config-loader.js';

export async function load({ depends }) {
  // Mark this function as dependent on schema updates
  depends('schema:update');
  try {
    // Load config and initialize CMS
    const config = await loadCMSConfig();
    let cms;
    try {
      cms = getCMS();
      cms.updateConfig(config);
    } catch {
      cms = createCMS(config);
    }

    await cms.initialize();

    // Get document and object types for SSR
    const documentTypes = config.schemaTypes
      .filter(schema => schema.type === 'document')
      .map(schema => ({
        name: schema.name,
        title: schema.title,
        description: schema.description
      }));

    const objectTypes = config.schemaTypes
      .filter(schema => schema.type === 'object')
      .map(schema => ({
        name: schema.name,
        title: schema.title,
        description: schema.description
      }));

    // Recursively remove validation functions (not serializable)
    function serializeField(field: any): any {
      const { validation, ...serializableField } = field;
      const result = {
        ...serializableField,
        hasValidation: !!validation
      };

      // Handle nested fields in object types
      if (field.fields && Array.isArray(field.fields)) {
        result.fields = field.fields.map(serializeField);
      }

      // Handle array 'of' field (though this should just be type references)
      if (field.of && Array.isArray(field.of)) {
        result.of = field.of.map((item: any) => {
          if (item.fields) {
            return {
              ...item,
              fields: item.fields.map(serializeField)
            };
          }
          return item;
        });
      }

      return result;
    }

    const serializableSchemas = config.schemaTypes.map(schema => ({
      ...schema,
      fields: schema.fields.map(serializeField)
    }));

    return {
      initialized: true,
      documentTypes,
      objectTypes,
      // Full schemas for debug component (without validation functions)
      allSchemas: serializableSchemas
    };

  } catch (error) {
    console.error('Failed to initialize CMS:', error);
    return {
      initialized: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      documentTypes: [],
      objectTypes: [],
      allSchemas: []
    };
  }
}
