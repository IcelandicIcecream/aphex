// Turns what the host declared in `aphex.config.ts` into what the engine runs on.
import type {
	CMSConfig,
	CMSConfigInput,
	DatabaseDescriptor,
	ResolvedDatabase
} from './types/config';
import type { DatabaseAdapter } from './db/index';

declare global {
	// On globalThis because Vite can re-evaluate this module, and the connection has
	// to outlive that the same way it outlives a re-evaluated `aphex.config.ts`.
	var __aphexDatabaseConnections: Map<string, Promise<ResolvedDatabase>> | undefined;
}

function isDatabaseDescriptor(
	database: DatabaseAdapter | DatabaseDescriptor
): database is DatabaseDescriptor {
	return 'kind' in database && database.kind === 'aphex/database';
}

/**
 * Connect once per `descriptor.key`. Schema hot reload re-evaluates the config and
 * so produces a new descriptor each time; without this every edit would open
 * another connection pool and re-run boot migrations. A failed attempt isn't kept,
 * so the next request can retry once the database is reachable.
 */
function connectOnce(descriptor: DatabaseDescriptor): Promise<ResolvedDatabase> {
	const connections = (globalThis.__aphexDatabaseConnections ??= new Map());
	const existing = connections.get(descriptor.key);
	if (existing) return existing;

	const connection = descriptor.connect();
	connections.set(descriptor.key, connection);
	connection.catch(() => {
		if (connections.get(descriptor.key) === connection) connections.delete(descriptor.key);
	});
	return connection;
}

/**
 * Resolve deferred adapters, in dependency order: the database first, then auth,
 * which is handed the database, cache and email it needs. That is what lets all of
 * them be declared inline in one file with no shared singleton modules.
 *
 * An auth factory is rebuilt on every call, so an edit to it applies on hot reload.
 */
export async function resolveCMSConfig(input: CMSConfigInput): Promise<CMSConfig> {
	let database: DatabaseAdapter;
	let connected: ResolvedDatabase | null = null;
	if (isDatabaseDescriptor(input.database)) {
		connected = await connectOnce(input.database);
		database = connected.adapter;
	} else {
		database = input.database;
	}

	if (!input.auth) return { ...input, database, auth: undefined };

	const { provider } = input.auth;
	if (typeof provider !== 'function') {
		return { ...input, database, auth: { ...input.auth, provider } };
	}
	if (!connected) {
		throw new Error(
			'[CMS] `auth.provider` is a function, but `database` is an already-built adapter, so ' +
				'there is no Drizzle instance to give it. Declare `database` with a descriptor, or ' +
				'build the auth provider yourself and pass the result.'
		);
	}

	return {
		...input,
		database,
		auth: {
			...input.auth,
			provider: await provider({
				database,
				drizzleDb: connected.drizzleDb,
				dialect: connected.dialect,
				cache: input.cache ?? null,
				email: input.email ?? null
			})
		}
	};
}
