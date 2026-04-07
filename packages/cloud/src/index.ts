import type {
	DatabaseAdapter,
	StorageAdapter,
	EmailAdapter,
	CacheAdapter
} from '@aphexcms/cms-core/server';
import { CloudClient } from './client.js';
import { createCloudDatabaseAdapter } from './adapters/database.js';
import { createCloudStorageAdapter } from './adapters/storage.js';
import { createCloudEmailAdapter } from './adapters/email.js';

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

export interface CloudConfig {
	/** Project ID from Aphex Cloud dashboard. */
	projectId: string;
	/** Project API token from Aphex Cloud dashboard. */
	token: string;
	/** Override the control plane API URL (for self-hosted control planes). */
	apiUrl?: string;
	/** Enable in-memory caching (default: true). */
	cache?: boolean;
}

export interface PresetResult {
	database: DatabaseAdapter;
	storage: StorageAdapter;
	email: EmailAdapter;
	cache: CacheAdapter | null;
	auth: {
		loginUrl: string;
	};
}

// ---------------------------------------------------------------------------
// Main preset function
// ---------------------------------------------------------------------------

/**
 * Cloud preset for Aphex CMS.
 *
 * Connects to Aphex Cloud managed infrastructure using your project credentials.
 * All adapters (database, storage, email, cache) are provisioned and managed
 * for you — just provide your `projectId` and `token`.
 *
 * @example
 * ```typescript
 * import { cloud } from '@aphexcms/cloud';
 *
 * export default createCMSConfig({
 *   schemaTypes,
 *   ...await cloud({
 *     projectId: env.APHEX_PROJECT_ID,
 *     token: env.APHEX_TOKEN,
 *   }),
 * });
 * ```
 *
 * To eject to self-hosted, replace the cloud preset with `@aphexcms/self-hosted`
 * and provide your own infrastructure credentials. Your schemas and application
 * code remain unchanged.
 */
export async function cloud(config: CloudConfig): Promise<PresetResult> {
	if (!config.projectId || !config.token) {
		throw new Error(
			'@aphexcms/cloud: projectId and token are required. ' +
				'Get these from your Aphex Cloud dashboard at https://cloud.getaphex.com'
		);
	}

	// Fetch provisioned credentials from the control plane
	const client = new CloudClient({
		projectId: config.projectId,
		token: config.token,
		apiUrl: config.apiUrl
	});

	const credentials = await client.getCredentials();

	// Create all adapters from provisioned credentials
	const database = createCloudDatabaseAdapter(credentials.database);
	const storage = createCloudStorageAdapter(credentials.storage);
	const email = createCloudEmailAdapter(credentials.email);

	// Cache — enabled by default for cloud
	let cache: CacheAdapter | null = null;
	if (config.cache !== false) {
		const { InMemoryCacheAdapter } = await import('@aphexcms/cms-core/server');
		cache = new InMemoryCacheAdapter({ maxSize: 5000 });
	}

	// Report health asynchronously (best-effort, non-blocking)
	client.reportHealth({ healthy: true }).catch(() => {});

	return {
		database,
		storage,
		email,
		cache,
		auth: {
			loginUrl: credentials.auth.loginUrl
		}
	};
}

// Re-export for advanced usage
export { CloudClient } from './client.js';
export type { CloudCredentials, CloudClientConfig } from './client.js';
export { CloudEmailAdapter } from './adapters/email.js';
