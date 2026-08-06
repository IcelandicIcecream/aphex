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

// PGlite is a single-writer embedded Postgres: a second process opening the same
// data dir blocks on its lock forever rather than failing. Vitest runs each test
// file in its own fork, so every fork past the first hung the whole run — the
// suite looked "slow" when it was actually deadlocked. Give each fork its own
// dir (VITEST_POOL_ID is per worker); `tests/teardown.ts` removes them.
if (driver === 'pglite') {
	process.env.APHEX_PGLITE_DIR = `.aphex/test-pgdata-${process.env.VITEST_POOL_ID ?? '1'}`;
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
