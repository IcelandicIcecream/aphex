import type {
	DatabaseAdapter,
	StorageAdapter,
	EmailAdapter,
	CacheAdapter,
	AuthProvider,
	StorageConfig
} from '@aphexcms/cms-core/server';

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

export interface SelfHostedDatabaseConfig {
	/** A pre-created DatabaseAdapter (takes priority over everything else). */
	adapter?: DatabaseAdapter;
	/**
	 * PostgreSQL connection URL.
	 * When provided (without `adapter`), the preset creates a PostgreSQL
	 * adapter via `@aphexcms/postgresql-adapter` automatically.
	 */
	url?: string;
	/** postgres.js pool options (only used with `url`). */
	poolOptions?: {
		max?: number;
		idle_timeout?: number;
		connect_timeout?: number;
		max_lifetime?: number;
	};
	/** Multi-tenancy configuration (only used with `url`). */
	multiTenancy?: {
		enableRLS?: boolean;
		enableHierarchy?: boolean;
	};
}

export interface SelfHostedStorageS3Config {
	type: 's3';
	bucket: string;
	endpoint: string;
	accessKeyId: string;
	secretAccessKey: string;
	region?: string;
	publicUrl?: string;
	basePath?: string;
	maxFileSize?: number;
}

export interface SelfHostedStorageLocalConfig {
	type: 'local';
	basePath?: string;
	baseUrl?: string;
}

export type SelfHostedStorageConfig =
	| SelfHostedStorageS3Config
	| SelfHostedStorageLocalConfig
	| StorageAdapter;

export interface SelfHostedEmailResendConfig {
	type: 'resend';
	apiKey: string;
}

export interface SelfHostedEmailNodemailerConfig {
	type: 'nodemailer';
	host: string;
	port: number;
	secure?: boolean;
	auth?: { user: string; pass: string };
}

export interface SelfHostedEmailMailpitConfig {
	type: 'mailpit';
	host?: string;
	port?: number;
}

export type SelfHostedEmailConfig =
	| SelfHostedEmailResendConfig
	| SelfHostedEmailNodemailerConfig
	| SelfHostedEmailMailpitConfig
	| EmailAdapter;

export interface SelfHostedConfig {
	database: SelfHostedDatabaseConfig | DatabaseAdapter;
	storage?: SelfHostedStorageConfig | null;
	email?: SelfHostedEmailConfig | null;
	cache?: boolean | CacheAdapter | null;
	auth?: {
		provider: AuthProvider;
		loginUrl?: string;
	};
}

// ---------------------------------------------------------------------------
// Preset result — the shape that spreads into createCMSConfig
// ---------------------------------------------------------------------------

export interface PresetResult {
	database: DatabaseAdapter;
	storage?: StorageAdapter | null;
	email?: EmailAdapter | null;
	cache?: CacheAdapter | null;
	auth?: {
		provider: AuthProvider;
		loginUrl?: string;
	};
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function isDatabaseAdapter(value: unknown): value is DatabaseAdapter {
	return (
		typeof value === 'object' &&
		value !== null &&
		'isHealthy' in value &&
		typeof (value as DatabaseAdapter).isHealthy === 'function'
	);
}

function isStorageAdapter(value: unknown): value is StorageAdapter {
	return (
		typeof value === 'object' &&
		value !== null &&
		'store' in value &&
		typeof (value as StorageAdapter).store === 'function'
	);
}

function isEmailAdapter(value: unknown): value is EmailAdapter {
	return (
		typeof value === 'object' &&
		value !== null &&
		'send' in value &&
		typeof (value as EmailAdapter).send === 'function'
	);
}

// ---------------------------------------------------------------------------
// Adapter factories (lazy-import to keep optional deps truly optional)
// ---------------------------------------------------------------------------

async function createDatabaseAdapter(config: SelfHostedDatabaseConfig): Promise<DatabaseAdapter> {
	if (config.adapter) return config.adapter;

	if (!config.url) {
		throw new Error(
			'@aphexcms/self-hosted: database config requires either an `adapter` instance or a `url`'
		);
	}

	const { createPostgreSQLProvider } = await import('@aphexcms/postgresql-adapter');
	const provider = createPostgreSQLProvider({
		connectionString: config.url,
		options: config.poolOptions,
		multiTenancy: config.multiTenancy
	});

	return provider.createAdapter();
}

async function createStorageAdapterFromConfig(
	config: SelfHostedStorageConfig
): Promise<StorageAdapter> {
	if (isStorageAdapter(config)) return config;

	if (config.type === 's3') {
		const { s3Storage } = await import('@aphexcms/storage-s3');
		return s3Storage({
			bucket: config.bucket,
			endpoint: config.endpoint,
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
			region: config.region,
			publicUrl: config.publicUrl,
			basePath: config.basePath,
			maxFileSize: config.maxFileSize
		}).adapter;
	}

	// Local storage
	const { createStorageAdapter } = await import('@aphexcms/cms-core/server');
	return createStorageAdapter('local', {
		basePath: config.basePath ?? './static/uploads',
		baseUrl: config.baseUrl ?? '/uploads'
	} as StorageConfig);
}

async function createEmailAdapterFromConfig(
	config: SelfHostedEmailConfig
): Promise<EmailAdapter> {
	if (isEmailAdapter(config)) return config;

	if (config.type === 'resend') {
		const { createResendAdapter } = await import('@aphexcms/resend-adapter');
		return createResendAdapter({ apiKey: config.apiKey });
	}

	if (config.type === 'nodemailer') {
		const { createNodemailerAdapter } = await import('@aphexcms/nodemailer-adapter');
		return createNodemailerAdapter({
			host: config.host,
			port: config.port,
			secure: config.secure,
			auth: config.auth
		});
	}

	// Mailpit
	const { createMailpitAdapter } = await import('@aphexcms/nodemailer-adapter');
	return createMailpitAdapter({
		host: config.host,
		port: config.port
	});
}

async function createCacheAdapterFromConfig(
	config: boolean | CacheAdapter
): Promise<CacheAdapter> {
	if (typeof config !== 'boolean') return config;

	const { InMemoryCacheAdapter } = await import('@aphexcms/cms-core/server');
	return new InMemoryCacheAdapter({ maxSize: 5000 });
}

// ---------------------------------------------------------------------------
// Main preset function
// ---------------------------------------------------------------------------

/**
 * Self-hosted preset for Aphex CMS.
 *
 * Creates all required adapters from a declarative config object.
 * Spread the result into `createCMSConfig` alongside your `schemaTypes`.
 *
 * @example
 * ```typescript
 * import { selfHosted } from '@aphexcms/self-hosted';
 *
 * export default createCMSConfig({
 *   schemaTypes,
 *   ...await selfHosted({
 *     database: { url: env.DATABASE_URL },
 *     storage: { type: 'local' },
 *     email: { type: 'resend', apiKey: env.RESEND_API_KEY },
 *     auth: { provider: authProvider, loginUrl: '/login' },
 *   }),
 * });
 * ```
 *
 * You can also pass pre-created adapter instances directly:
 *
 * ```typescript
 * export default createCMSConfig({
 *   schemaTypes,
 *   ...await selfHosted({
 *     database: myDatabaseAdapter,
 *     storage: myStorageAdapter,
 *     email: myEmailAdapter,
 *     auth: { provider: authProvider },
 *   }),
 * });
 * ```
 */
export async function selfHosted(config: SelfHostedConfig): Promise<PresetResult> {
	// Database (required)
	const database = isDatabaseAdapter(config.database)
		? config.database
		: await createDatabaseAdapter(config.database);

	// Storage (optional, defaults to local)
	let storage: StorageAdapter | null = null;
	if (config.storage !== null && config.storage !== undefined) {
		storage = await createStorageAdapterFromConfig(config.storage);
	}

	// Email (optional)
	let email: EmailAdapter | null = null;
	if (config.email !== null && config.email !== undefined) {
		email = await createEmailAdapterFromConfig(config.email);
	}

	// Cache (optional)
	let cache: CacheAdapter | null = null;
	if (config.cache !== null && config.cache !== undefined) {
		cache = await createCacheAdapterFromConfig(config.cache);
	}

	return {
		database,
		storage,
		email,
		cache,
		auth: config.auth
	};
}
