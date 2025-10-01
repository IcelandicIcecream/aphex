import type { DatabaseAdapter, DatabaseProvider, DatabaseConfig } from '../interfaces/index.js';
/**
 * PostgreSQL provider using Drizzle ORM
 */
export declare class PostgreSQLProvider implements DatabaseProvider {
    name: string;
    createAdapter(config: DatabaseConfig): DatabaseAdapter;
}
/**
 * Database provider registry
 */
declare class DatabaseProviderRegistry {
    private providers;
    constructor();
    register(provider: DatabaseProvider): void;
    get(name: string): DatabaseProvider | undefined;
    list(): string[];
}
export declare const databaseProviders: DatabaseProviderRegistry;
/**
 * Factory function to create database adapters
 */
export declare function createDatabaseAdapter(providerName: string, config: DatabaseConfig): DatabaseAdapter;
/**
 * Connection pool options for PostgreSQL
 */
export interface PostgreSQLPoolOptions {
    max?: number;
    idle_timeout?: number;
    connect_timeout?: number;
    [key: string]: any;
}
/**
 * Convenience function for PostgreSQL with connection pooling support
 */
export declare function createPostgreSQLAdapter(connectionString: string, options?: PostgreSQLPoolOptions): DatabaseAdapter;
export {};
//# sourceMappingURL=database.d.ts.map