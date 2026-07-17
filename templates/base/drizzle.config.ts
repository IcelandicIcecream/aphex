import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
// import { pgConnectionUrl } from '@aphexcms/postgresql-adapter';

// Note: Ideally we'd use pgConnectionUrl from @aphexcms/postgresql-adapter,
// but drizzle-kit has issues resolving workspace dependencies in monorepos.
// Inlining the connection URL logic as a workaround.
const databaseUrl =
	process.env.DATABASE_URL ||
	`postgresql://${process.env.PG_USER || 'root'}:${process.env.PG_PASSWORD || 'my-secret-password'}@${process.env.PG_HOST || 'localhost'}:${process.env.PG_PORT || '5432'}/${process.env.PG_DATABASE || 'local'}`;

const driver = process.env.APHEX_DATABASE?.toLowerCase();

export default defineConfig(
	driver === 'sqlite'
		? {
				schema: './src/lib/server/db/schema.sqlite.ts',
				dialect: 'sqlite',
				dbCredentials: {
					url: process.env.APHEX_SQLITE_URL || 'file:.aphex/studio.db',
					authToken: process.env.DATABASE_AUTH_TOKEN || undefined
				},
				verbose: true,
				strict: true
			}
		: {
				schema: './src/lib/server/db/schema.ts',
				dialect: 'postgresql',
				dbCredentials: { url: databaseUrl },
				verbose: true,
				strict: true
			}
);
