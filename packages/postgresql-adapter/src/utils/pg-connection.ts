interface DatabaseEnvironment {
	DATABASE_URL?: string;
	DATABASE_URL_UNPOOLED?: string;
	PG_HOST?: string;
	PG_PORT?: string;
	PG_USER?: string;
	PG_PASSWORD?: string;
	PG_DATABASE?: string;
}

/**
 * Construct database connection url from environment variables, PostgreSQL specific, First looks for full DATABASE_URL, otherwise constructs from parts.
 * Used by Drizzle ORM and database connection setup.
 * @param {DatabaseEnvironment} env - Environment variables object
 * @returns {string} Database connection URL
 */
export function pgConnectionUrl(env: NodeJS.ProcessEnv | DatabaseEnvironment): string {
	const { DATABASE_URL, PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE } = env;

	if (DATABASE_URL) return DATABASE_URL;

	if (PG_HOST && PG_PORT && PG_USER && PG_PASSWORD && PG_DATABASE) {
		return `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}`;
	}

	throw new Error(
		'DATABASE_URL is not set, you can alternatively set PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, and PG_DATABASE environment variables.'
	);
}

/**
 * Connection url for operations that need real session semantics — specifically the
 * boot-migration's `pg_advisory_lock`. Prefers `DATABASE_URL_UNPOOLED` (set alongside
 * `DATABASE_URL` by Neon's Vercel integration) over the regular pooled URL.
 *
 * `DATABASE_URL` from that integration goes through PgBouncer in transaction-pooling
 * mode by default: it can hand different statements sent over what looks like one
 * client connection to different physical Postgres backends between transactions.
 * Session-scoped state — an advisory lock, a `SET lock_timeout` — doesn't reliably
 * survive that, which undermines the entire "one session holds the lock for the
 * duration of the migration" design. Falls back to `pgConnectionUrl` when there's no
 * separate unpooled URL (self-hosted Postgres, Docker, other providers) — there, the
 * one connection string given is already a direct session connection.
 */
export function pgMigrationConnectionUrl(env: NodeJS.ProcessEnv | DatabaseEnvironment): string {
	return env.DATABASE_URL_UNPOOLED || pgConnectionUrl(env);
}
