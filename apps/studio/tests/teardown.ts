import { TEST_ORG_ID } from './helpers/test-constants';
import { eq } from 'drizzle-orm';

export async function teardown() {
	const { drizzleDb } = await import('../src/lib/server/db');
	const { organizations, documents, assets, documentVersions, documentReferences } =
		await import('../src/lib/server/db/cms-schema');

	await drizzleDb
		.delete(documentReferences)
		.where(eq(documentReferences.organizationId, TEST_ORG_ID));
	await drizzleDb.delete(documentVersions).where(eq(documentVersions.organizationId, TEST_ORG_ID));
	await drizzleDb.delete(documents).where(eq(documents.organizationId, TEST_ORG_ID));
	await drizzleDb.delete(assets).where(eq(assets.organizationId, TEST_ORG_ID));
	await drizzleDb.delete(organizations).where(eq(organizations.id, TEST_ORG_ID));
}
