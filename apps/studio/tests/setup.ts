import { config } from 'dotenv';
// Narrow import, not the `/server` barrel: that barrel drags sharp, graphql and
// the engine into the transform graph of *every* test file, which is minutes of
// work per run for one log-level setter.
import { setLogLevel, type LogLevel } from '@aphexcms/cms-core/utils/logger';
import '../src/lib/generated-types';
import { TEST_ORG_ID } from './helpers/test-constants';

// Load environment variables
config();

// The logger defaults to `debug` outside production, and the write path is
// chatty by design — `field-validation` alone logs eleven times per field, per
// document. Across the suite that's tens of thousands of formatted lines, and
// the formatting and stdout writes cost real time on every single write.
//
// `warn` keeps anything that signals a genuine problem; tests report failures
// through assertions, not through the log. Set APHEX_TEST_LOG_LEVEL=debug when
// you actually need the trace for one run.
const TEST_LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error', 'none'];
const requestedLevel = process.env.APHEX_TEST_LOG_LEVEL;
setLogLevel(TEST_LOG_LEVELS.find((level) => level === requestedLevel) ?? 'warn');

// Only the postgres-js driver needs a connection string. pglite (embedded) and
// sqlite (file) bring their own storage — which is the whole point of having
// them: `APHEX_DATABASE=pglite pnpm test` runs the suite with no Docker, no
// server, no .env. Guarding unconditionally defeated that and made a running
// Postgres a hard prerequisite for every test.
const driver = process.env.APHEX_DATABASE?.toLowerCase();
const needsConnectionString = driver !== 'sqlite' && driver !== 'pglite';

if (needsConnectionString && !process.env.DATABASE_URL && !process.env.PGHOST) {
	throw new Error(
		'DATABASE_URL not set. Either add it to .env, or run against an embedded ' +
			'database instead: APHEX_DATABASE=pglite (or =sqlite).'
	);
}

// Per-fork databases are the right default (see below), but they're wrong for a
// suite that drives a *running* dev server over HTTP and also reaches into the
// database directly — `api-key-rbac` mints its keys with drizzle and expects the
// server to see them. Point that run at the shared file the server opened, and
// accept that it can't run in parallel with anything else.
const sharedDb = process.env.APHEX_TEST_SHARED_DB === 'true';

// PGlite is a single-writer embedded Postgres: a second process opening the same
// data dir blocks on its lock forever rather than failing. Vitest runs each test
// file in its own fork, so every fork past the first hung the whole run — the
// suite looked "slow" when it was actually deadlocked. Give each fork its own
// dir (VITEST_POOL_ID is per worker); `tests/teardown.ts` removes them.
if (driver === 'pglite' && !sharedDb) {
	process.env.APHEX_PGLITE_DIR = `.aphex/test-pgdata-${process.env.VITEST_POOL_ID ?? '1'}`;
}

// Same problem, same fix, different driver: a libsql file database is a single
// writer too, and every fork opening `.aphex/studio.db` produced a storm of
// `SQLITE_BUSY: database is locked` rather than a clean deadlock. Give each fork
// its own file; `tests/teardown.ts` removes them.
if (driver === 'sqlite' && !sharedDb) {
	process.env.APHEX_SQLITE_URL = `file:.aphex/test-sqlite-${process.env.VITEST_POOL_ID ?? '1'}.db`;
}

// Postgres needs the same isolation, and for a while didn't have it.
//
// The two embedded drivers got a database per fork because sharing one would
// *deadlock*. Postgres shares happily, so nothing broke loudly — it just ran the
// whole suite through a single database, with every fork inserting into the same
// TEST_ORG_ID under the same slugs. One fork asserting `hidden-page` is gone
// while another had just created it is not a bug in either test, and it moved
// between runs, which is the worst kind of red: the failure never names its
// cause and reruns "fix" it.
//
// `postgresAdapter` auto-migrates on boot, so a freshly created empty database
// is enough — no migration step here. Dropped in `tests/teardown.ts`.
if (needsConnectionString && !sharedDb) {
	const base = process.env.DATABASE_URL;
	if (base) {
		const poolId = process.env.VITEST_POOL_ID ?? '1';
		const forkDb = `aphex_test_${poolId}`;
		const postgres = (await import('postgres')).default;

		// CREATE DATABASE can't run inside a transaction and has no IF NOT EXISTS,
		// so connect to the maintenance database and check first.
		const adminUrl = new URL(base);
		adminUrl.pathname = '/postgres';
		const admin = postgres(adminUrl.toString(), { max: 1 });
		try {
			const [existing] = await admin`SELECT 1 FROM pg_database WHERE datname = ${forkDb}`;
			if (!existing) await admin.unsafe(`CREATE DATABASE "${forkDb}"`);
		} finally {
			await admin.end();
		}

		const forkUrl = new URL(base);
		forkUrl.pathname = `/${forkDb}`;
		// Set before the app's db module is imported below — the Vitest config's
		// `liveDynamicEnv` plugin reads `process.env` at access time, so the app
		// sees this rather than the value baked in at config resolution.
		process.env.DATABASE_URL = forkUrl.toString();
	}
	// No DATABASE_URL means PG_* variables, which name a fixed database. Fall
	// through to the shared one rather than guessing a maintenance connection.
}

// Ensure the shared TEST_ORG_ID exists in cms_organizations before any test
// inserts a document. The FK on cms_documents.organization_id would otherwise
// blow up the moment a test calls localAPI.collections.x.create().
const { drizzleDb } = await import('../src/lib/server/db');
const { organizations } = await import('./helpers/cms-schema');

await drizzleDb
	.insert(organizations)
	.values({
		id: TEST_ORG_ID,
		name: 'Aphex Test Org',
		slug: `test-org-${TEST_ORG_ID}`,
		createdBy: 'test-setup'
	})
	.onConflictDoNothing({ target: organizations.id });
