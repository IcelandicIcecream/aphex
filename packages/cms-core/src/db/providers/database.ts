// Database provider factory for creating different database adapters
import type { DatabaseAdapter, DatabaseProvider, DatabaseConfig } from '../interfaces/index.js';

/**
 * Database provider registry
 * Apps register their database adapters (e.g., @aphex/postgresql-adapter) here
 */
class DatabaseProviderRegistry {
	private providers = new Map<string, DatabaseProvider>();

	constructor() {
		// No built-in providers - apps register their own
		// This keeps cms-core database-agnostic
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
 * Helper to register a database provider
 * Apps should call this before creating the CMS hook
 */
export function registerDatabaseProvider(provider: DatabaseProvider): void {
	databaseProviders.register(provider);
}
