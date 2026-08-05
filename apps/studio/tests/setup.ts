import { config } from 'dotenv';
import '../src/lib/generated-types';
import { TEST_ORG_ID } from './helpers/test-constants';

// Load environment variables
config();

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

// Ensure the shared TEST_ORG_ID exists in cms_organizations before any test
// inserts a document. The FK on cms_documents.organization_id would otherwise
// blow up the moment a test calls localAPI.collections.x.create().
const { drizzleDb } = await import('../src/lib/server/db');
const { organizations } = await import('../src/lib/server/db/cms-schema');

await drizzleDb
	.insert(organizations)
	.values({
		id: TEST_ORG_ID,
		name: 'Aphex Test Org',
		slug: `test-org-${TEST_ORG_ID}`,
		createdBy: 'test-setup'
	})
	.onConflictDoNothing({ target: organizations.id });
