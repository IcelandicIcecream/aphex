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

    return {
      initialized: true,
      documentTypes,
      objectTypes
    };

  } catch (error) {
    console.error('Failed to initialize CMS:', error);
    return {
      initialized: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      documentTypes: [],
      objectTypes: []
    };
  }
}
