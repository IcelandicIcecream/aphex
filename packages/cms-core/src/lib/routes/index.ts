// Aphex CMS API Route Handlers
// These will be imported and re-exported by your app's API routes

// Document management routes
export * as documents from './documents';
export * as documentsById from './documents-by-id';
export * as documentsQuery from './documents-query';
export * as documentsPublish from './documents-publish';

// Asset management routes
export * as assets from './assets';

// Schema information routes
export * as schemas from './schemas';
export * as schemasByType from './schemas-by-type';

// User management routes
export * as userPreferences from './user-preferences';
