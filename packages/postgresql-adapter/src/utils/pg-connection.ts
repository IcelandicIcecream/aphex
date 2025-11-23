interface DatabaseEnvironment {
	DATABASE_URL?: string;
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
