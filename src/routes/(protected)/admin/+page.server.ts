// Minimal server-side data loading - Sanity Studio style
import { schemaTypes } from '$lib/schemaTypes/index.js';

export async function load() {
  try {
    // Just return the basic document types for initial render
    const documentTypes = schemaTypes
      .filter(schema => schema.type === 'document')
      .map(schema => ({
        name: schema.name,
        title: schema.title,
        description: schema.description
      }));

    return {
      documentTypes
    };
  } catch (error) {
    console.error('Failed to load schema types:', error);
    return {
      documentTypes: []
    };
  }
}
