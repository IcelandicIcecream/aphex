import type { DatabaseAdapter } from '@aphexcms/cms-core/server';
import { createPostgreSQLProvider } from '@aphexcms/postgresql-adapter';
import type { CloudCredentials } from '../client.js';

/**
 * Create a DatabaseAdapter from cloud-provisioned credentials.
 */
export function createCloudDatabaseAdapter(
	credentials: CloudCredentials['database']
): DatabaseAdapter {
	const provider = createPostgreSQLProvider({
		connectionString: credentials.url,
		options: {
			max: credentials.poolOptions?.max ?? 20,
			idle_timeout: credentials.poolOptions?.idle_timeout ?? 20,
			connect_timeout: credentials.poolOptions?.connect_timeout ?? 10
		},
		multiTenancy: {
			enableRLS: true,
			enableHierarchy: true
		}
	});

	return provider.createAdapter();
}
