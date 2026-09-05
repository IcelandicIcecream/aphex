import { readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { TEST_ORG_ID } from './helpers/test-constants';
import { eq } from 'drizzle-orm';

// globalSetup runs in Vitest's main process, which — unlike the forks, where
// `tests/setup.ts` calls this — never loads `.env`. Without it `DATABASE_URL` is
// undefined here, and the Postgres cleanup below silently does nothing: the
// per-fork databases survive the run and the next one reuses them dirty.
config();

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

	// Postgres per-fork databases (see tests/setup.ts) are disposable in exactly
	// the same way, they just aren't files. Dropped by name pattern because this
	// runs once for the whole suite and never learns which pool ids existed —
	// which also cleans up after a run that crashed before teardown.
	//
	// Note `process.env.DATABASE_URL` here is the *original* one: globalSetup runs
	// in the main process, and the per-fork rewrite happens inside each fork.
	const base = process.env.DATABASE_URL;
	if (base && process.env.APHEX_TEST_SHARED_DB !== 'true') {
		const postgres = (await import('postgres')).default;
		const adminUrl = new URL(base);
		adminUrl.pathname = '/postgres';
		const admin = postgres(adminUrl.toString(), { max: 1 });
		try {
			const rows = await admin<{ datname: string }[]>`
				SELECT datname FROM pg_database WHERE datname LIKE 'aphex\\_test\\_%'`;
			for (const { datname } of rows) {
				// FORCE terminates any connection a fork left open; without it a
				// lingering pool connection makes the drop fail and the database
				// survives to be reused — dirty — by the next run.
				await admin.unsafe(`DROP DATABASE IF EXISTS "${datname}" WITH (FORCE)`);
			}
		} catch {
			// Never fail a green run on cleanup. A leftover test database costs disk,
			// and the next run drops it.
		} finally {
			await admin.end();
		}
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
