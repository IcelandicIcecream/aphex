// Database layer exports - composable DB operations
export { DocumentsDB } from './documents.js';

// Re-export types for convenience
export type { Document, NewDocument } from '$lib/server/db/schema.js';
export type { DocumentFilters } from './documents.js';