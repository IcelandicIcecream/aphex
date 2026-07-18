import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Mirrors the runtime driver-detection rule in src/lib/server/db/index.ts: Postgres
// when DATABASE_URL looks like one (e.g. Neon) or APHEX_DATABASE=postgres is set,
// SQLite via libsql otherwise (local `file:` database by default, Turso-hosted via
// DATABASE_URL). SQLite pushes its schema on boot (no migration files); Postgres
// applies versioned migrations from `drizzle-pg/` (see adapters/postgres.ts for why
// push isn't used for this dialect) — `db:generate` targets that folder here.
const driver = process.env.APHEX_DATABASE?.toLowerCase();
const usesPostgres =
	driver === 'postgres' || (!driver && /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? ''));

export default defineConfig(
	usesPostgres
		? {
				schema: './src/lib/server/db/schema.ts',
				out: './drizzle-pg',
				dialect: 'postgresql',
				dbCredentials: { url: process.env.DATABASE_URL as string },
				verbose: true,
				strict: true
			}
		: {
				schema: './src/lib/server/db/schema.sqlite.ts',
				dialect: 'sqlite',
				dbCredentials: {
					url: process.env.DATABASE_URL || 'file:.aphex/blog.db',
					authToken: process.env.DATABASE_AUTH_TOKEN || undefined
				},
				verbose: true,
				strict: true
			}
);
