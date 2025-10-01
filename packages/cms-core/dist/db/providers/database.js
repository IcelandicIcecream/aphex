import { PostgreSQLAdapter } from '../adapters/postgresql/index.js';
/**
 * PostgreSQL provider using Drizzle ORM
 */
export class PostgreSQLProvider {
    name = 'postgresql';
    createAdapter(config) {
        return new PostgreSQLAdapter(config);
    }
}
/**
 * Database provider registry
 */
class DatabaseProviderRegistry {
    providers = new Map();
    constructor() {
        // Register built-in providers
        this.register(new PostgreSQLProvider());
    }
    register(provider) {
        this.providers.set(provider.name.toLowerCase(), provider);
    }
    get(name) {
        return this.providers.get(name.toLowerCase());
    }
    list() {
        return Array.from(this.providers.keys());
    }
}
// Global provider registry
export const databaseProviders = new DatabaseProviderRegistry();
/**
 * Factory function to create database adapters
 */
export function createDatabaseAdapter(providerName, config) {
    const provider = databaseProviders.get(providerName);
    if (!provider) {
        const available = databaseProviders.list();
        throw new Error(`Unknown database provider: ${providerName}. Available providers: ${available.join(', ')}`);
    }
    return provider.createAdapter(config);
}
/**
 * Convenience function for PostgreSQL with connection pooling support
 */
export function createPostgreSQLAdapter(connectionString, options) {
    return createDatabaseAdapter('postgresql', {
        connectionString,
        options
    });
}
