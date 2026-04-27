import { config } from 'dotenv';
import '../src/lib/generated-types';
import { TEST_ORG_ID } from './helpers/test-constants';

// Load environment variables
config();

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL not set. Create a .env file with DATABASE_URL');
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
