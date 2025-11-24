import { defineConfig } from 'drizzle-kit';
import { pgConnectionUrl } from '@aphexcms/postgresql-adapter';

// Note: Ideally we'd use pgConnectionUrl from @aphexcms/postgresql-adapter,
// but drizzle-kit has issues resolving workspace dependencies in monorepos.
// Inlining the connection URL logic as a workaround.
// const databaseUrl =
// 	process.env.DATABASE_URL ||
// 	`postgresql://${process.env.POSTGRES_USER || 'root'}:${process.env.POSTGRES_PASSWORD || 'mysecretpassword'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'local'}`;

const databaseUrl = pgConnectionUrl(process.env);

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: databaseUrl },
	verbose: true,
	strict: true
});
