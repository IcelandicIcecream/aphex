import { readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TEST_ORG_ID } from './helpers/test-constants';
import { eq } from 'drizzle-orm';

export async function teardown() {
	// Each fork got its own embedded database (see tests/setup.ts) — they're
	// disposable, so drop them wholesale instead of deleting rows out of them.
	// `test-sqlite-N.db` also leaves `-shm`/`-wal` siblings, hence the prefix match.
	// APHEX_TEST_SHARED_DB means the run used the developer's real database rather
	// than a per-fork copy, so nothing here is disposable — fall through to
	// deleting just the rows this suite created.
	const driver = process.env.APHEX_DATABASE?.toLowerCase();
	const disposablePrefix =
		process.env.APHEX_TEST_SHARED_DB === 'true'
			? null
			: driver === 'pglite'
				? 'test-pgdata-'
				: driver === 'sqlite'
					? 'test-sqlite-'
					: null;

	if (disposablePrefix) {
		const root = resolve('.aphex');
		const entries = await readdir(root).catch(() => [] as string[]);
		await Promise.all(
			entries
				.filter((name) => name.startsWith(disposablePrefix))
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
