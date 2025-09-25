// API client exports - main entry point
export { ApiClient, ApiError, apiClient } from './client.js';
export { DocumentsApi, documents } from './documents.js';
export type * from './types.js';

// Convenience re-exports for common use cases
export { documents as api } from './documents.js';