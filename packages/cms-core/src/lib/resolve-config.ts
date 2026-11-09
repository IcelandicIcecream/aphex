// Turns what the host declared in `aphex.config.ts` into what the engine runs on.
import type {
	CMSConfig,
	CMSConfigInput,
	DatabaseConnectOptions,
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
function connectOnce(
	descriptor: DatabaseDescriptor,
	options: DatabaseConnectOptions
): Promise<ResolvedDatabase> {
	const connections = (globalThis.__aphexDatabaseConnections ??= new Map());
	const existing = connections.get(descriptor.key);
	if (existing) return existing;

	const connection = descriptor.connect(options);
	connections.set(descriptor.key, connection);
	connection.catch(() => {
		if (connections.get(descriptor.key) === connection) connections.delete(descriptor.key);
	});
	return connection;
}

/**
 * Whether this is SvelteKit's build pass. Imported dynamically because `$app/*` only
 * exists under Vite, and `@aphexcms/cms-core/server` also loads in plain scripts.
 */
export async function isBuilding(): Promise<boolean> {
	try {
		return (await import('$app/environment')).building;
	} catch {
		return false;
	}
}

/** A declared config after resolution, with the raw database handle when there is one. */
export interface ResolvedAphex<
	TDatabase extends ResolvedDatabase | null = ResolvedDatabase | null
> {
	config: CMSConfig;
	/**
	 * Null when `database` was passed as an already-built adapter. For a database
	 * declared inline, `drizzleDb` has that adapter's Drizzle type, for your own tables.
	 */
	database: TDatabase;
}

// Per declared config object, so a script or test calling `getAphex(config)` shares
// the auth provider and connection the request hook uses. Hot reload produces a new
// config object, which is how an edit to the auth factory takes effect.
const resolutions = new WeakMap<CMSConfigInput, Promise<ResolvedAphex>>();

/**
 * The resolved CMS for code outside a request, such as scripts and tests. Inside a
 * request, use `event.locals.aphexCMS`.
 */
export function getAphex<TDrizzle, TClient>(
	input: Omit<CMSConfigInput, 'database'> & { database: DatabaseDescriptor<TDrizzle, TClient> }
): Promise<ResolvedAphex<ResolvedDatabase<TDrizzle, TClient>>>;
export function getAphex(input: CMSConfigInput): Promise<ResolvedAphex>;
export function getAphex(input: CMSConfigInput): Promise<ResolvedAphex> {
	const existing = resolutions.get(input);
	if (existing) return existing;

	const resolution = resolve(input);
	resolutions.set(input, resolution);
	resolution.catch(() => resolutions.delete(input));
	return resolution;
}

export async function resolveCMSConfig(input: CMSConfigInput): Promise<CMSConfig> {
	return (await getAphex(input)).config;
}

/**
 * Resolve deferred adapters, in dependency order: the database first, then auth,
 * which is handed the database, cache and email it needs. That is what lets all of
 * them be declared inline in one file with no shared singleton modules.
 */
async function resolve(input: CMSConfigInput): Promise<ResolvedAphex> {
	const building = await isBuilding();
	let database: DatabaseAdapter;
	let connected: ResolvedDatabase | null = null;
	if (isDatabaseDescriptor(input.database)) {
		connected = await connectOnce(input.database, {
			tables: input.auth?.tables?.[input.database.dialect],
			building
		});
		database = connected.adapter;
	} else {
		database = input.database;
	}

	if (!input.auth) return { config: { ...input, database, auth: undefined }, database: connected };

	const { provider, tables: _tables, ...auth } = input.auth;
	if (typeof provider !== 'function') {
		return {
			config: { ...input, database, auth: { ...auth, provider } },
			database: connected
		};
	}
	if (!connected) {
		throw new Error(
			'[CMS] `auth.provider` is a function, but `database` is an already-built adapter, so ' +
				'there is no Drizzle instance to give it. Declare `database` with a descriptor, or ' +
				'build the auth provider yourself and pass the result.'
		);
	}

	return {
		config: {
			...input,
			database,
			auth: {
				...auth,
				provider: await provider({
					database,
					drizzleDb: connected.drizzleDb,
					dialect: connected.dialect,
					cache: input.cache ?? null,
					email: input.email ?? null,
					building
				})
			}
		},
		database: connected
	};
}
