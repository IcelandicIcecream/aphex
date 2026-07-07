import { defineConfig } from 'drizzle-kit';

// SQLite via libsql: local file database by default, Turso-hosted via DATABASE_URL.
const databaseUrl = process.env.DATABASE_URL || 'file:.aphex/blog.db';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: { url: databaseUrl },
	verbose: true,
	strict: true
});
