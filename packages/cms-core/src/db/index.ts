// Aphex CMS Database Layer
// Ports and adapters for database operations

// Interfaces
export * from './interfaces/index.js';

// Adapters  
export * from './adapters/index.js';

// Factory for creating database adapters based on configuration
export { createDatabaseAdapter } from './factory.js';