import { readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TEST_ORG_ID } from './helpers/test-constants';
import { eq } from 'drizzle-orm';

export async function teardown() {
	// Each fork got its own PGlite data dir (see tests/setup.ts) — they're
	// disposable, so drop the whole tree instead of deleting rows out of them.
	if (process.env.APHEX_DATABASE?.toLowerCase() === 'pglite') {
		const root = resolve('.aphex');
		const entries = await readdir(root).catch(() => [] as string[]);
		await Promise.all(
			entries
				.filter((name) => name.startsWith('test-pgdata-'))
				.map((name) => rm(resolve(root, name), { recursive: true, force: true }))
		);
		return;
	}

	const { drizzleDb } = await import('../src/lib/server/db');
	const { organizations, documents, assets, documentVersions, documentReferences } =
		await import('./helpers/cms-schema');

	await drizzleDb
		.delete(documentReferences)
		.where(eq(documentReferences.organizationId, TEST_ORG_ID));
	await drizzleDb.delete(documentVersions).where(eq(documentVersions.organizationId, TEST_ORG_ID));
	await drizzleDb.delete(documents).where(eq(documents.organizationId, TEST_ORG_ID));
	await drizzleDb.delete(assets).where(eq(assets.organizationId, TEST_ORG_ID));
	await drizzleDb.delete(organizations).where(eq(organizations.id, TEST_ORG_ID));
}
