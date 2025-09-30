import { json } from '@sveltejs/kit';
import { schemaTypes } from '$lib/schemaTypes/index.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const { type } = params;

  if (!type) {
    return json({ error: 'Schema type is required' }, { status: 400 });
  }

  // Find the schema by name
  const schema = schemaTypes.find(s => s.name === type);

  if (!schema) {
    return json({ error: `Schema type '${type}' not found` }, { status: 404 });
  }

  // Return the schema definition
  return json({
    success: true,
    data: schema
  });
};