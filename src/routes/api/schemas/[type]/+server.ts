// Re-export from Aphex CMS Core (server-side)
import { createSchemaByTypeHandler } from '@aphex/cms-core/server';
import { schemaTypes } from '$lib/schemaTypes/index.js';

export const GET = createSchemaByTypeHandler(schemaTypes);