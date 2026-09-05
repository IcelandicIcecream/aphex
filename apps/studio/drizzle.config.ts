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
				// SQLite has no migration history, by design: the adapter provisions
				// its schema at startup with `pushSQLiteSchema` (see
				// `db/adapters/sqlite.ts`), so `db:push` is the command here and
				// generate/migrate are pinned to Postgres in package.json.
				//
				// `out` is still set away from './drizzle' as a guard. That folder holds
				// the PostgreSQL migration history, and it is the default — so a
				// drizzle-kit command run in SQLite mode used to read Postgres snapshots
				// and fail with "snapshot is of unsupported version", which reads like a
				// version problem and isn't one. Pointing elsewhere keeps the two
				// dialects from ever sharing a folder.
				out: './.drizzle-sqlite-unused',
				dbCredentials: {
					url: process.env.APHEX_SQLITE_URL || 'file:.aphex/studio.db',
					authToken: process.env.DATABASE_AUTH_TOKEN || undefined
				},
				// The full-text search index (cms_documents_fts + its FTS5 shadow
				// tables) is raw DDL the sqlite adapter self-provisions at startup —
				// invisible to Drizzle's schema object, so introspection-based `push`
				// would otherwise see them as "extra" and offer to drop them.
				tablesFilter: ['!cms_documents_fts*'],
				verbose: true,
				strict: true
			}
		: {
				schema: './src/lib/server/db/schema.ts',
				dialect: 'postgresql',
				// Explicit, though it matches the default — the SQLite branch above
				// relies on these two never being the same folder.
				out: './drizzle',
				dbCredentials: { url: databaseUrl },
				verbose: true,
				strict: true
			}
);
