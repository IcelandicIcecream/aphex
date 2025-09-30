// Database provider factory for creating different database adapters
import type { DatabaseAdapter, DatabaseProvider, DatabaseConfig } from '../interfaces/index.js';
import { PostgreSQLAdapter } from '../adapters/postgresql/index.js';

/**
 * PostgreSQL provider using Drizzle ORM
 */
export class PostgreSQLProvider implements DatabaseProvider {
  name = 'postgresql';

  createAdapter(config: DatabaseConfig): DatabaseAdapter {
    return new PostgreSQLAdapter(config);
  }
}

/**
 * Database provider registry
 */
class DatabaseProviderRegistry {
  private providers = new Map<string, DatabaseProvider>();

  constructor() {
    // Register built-in providers
    this.register(new PostgreSQLProvider());
  }

  register(provider: DatabaseProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  get(name: string): DatabaseProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Global provider registry
export const databaseProviders = new DatabaseProviderRegistry();

/**
 * Factory function to create database adapters
 */
export function createDatabaseAdapter(
  providerName: string,
  config: DatabaseConfig
): DatabaseAdapter {
  const provider = databaseProviders.get(providerName);

  if (!provider) {
    const available = databaseProviders.list();
    throw new Error(
      `Unknown database provider: ${providerName}. Available providers: ${available.join(', ')}`
    );
  }

  return provider.createAdapter(config);
}

/**
 * Convenience function for PostgreSQL
 */
export function createPostgreSQLAdapter(connectionString: string, options?: any): DatabaseAdapter {
  return createDatabaseAdapter('postgresql', {
    connectionString,
    options
  });
}