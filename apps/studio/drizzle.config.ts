import { defineConfig } from 'drizzle-kit';
import { pgConnectionUrl } from '@aphexcms/postgresql-adapter';

const databaseUrl = pgConnectionUrl(process.env);

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: databaseUrl },
	verbose: true,
	strict: true
});
