// Aphex CMS Storage Layer
// Ports and adapters for file storage operations
// Interfaces
export * from './interfaces/index.js';
// Adapters
export * from './adapters/index.js';
// Factory for creating storage adapters based on configuration
export { createStorageAdapter } from './factory.js';
