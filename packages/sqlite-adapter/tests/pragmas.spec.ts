// Pragma handling on the `url` path of createSQLiteProvider. journal_mode is a
// persistent, per-database-file setting, so it's the observable we assert on —
// per-connection settings (busy_timeout) can't be read from a second client.
import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { createSQLiteProvider, applyRecommendedPragmas } from '../src/index';

const dir = mkdtempSync(join(tmpdir(), 'aphex-pragmas-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function journalMode(file: string): Promise<string> {
	const probe = createClient({ url: `file:${file}` });
	try {
		const result = await probe.execute('PRAGMA journal_mode;');
		return String(Object.values(result.rows[0]!)[0]);
	} finally {
		probe.close();
	}
}

// Pragmas are applied fire-and-forget from the sync createAdapter, so poll.
async function expectJournalMode(file: string, expected: string) {
	await expect.poll(() => journalMode(file), { timeout: 2000 }).toBe(expected);
}

describe('createSQLiteProvider pragmas (url path)', () => {
	it('applies WAL by default to local file databases', async () => {
		const file = join(dir, 'default.db');
		createSQLiteProvider({ url: `file:${file}` }).createAdapter();
		await expectJournalMode(file, 'wal');
	});

	it('pragmas: false leaves the database untouched', async () => {
		const file = join(dir, 'opt-out.db');
		createSQLiteProvider({ url: `file:${file}`, pragmas: false }).createAdapter();
		// SQLite's default journal mode for a fresh file
		await expectJournalMode(file, 'delete');
	});

	it('pragmas: options object applies the recommended base plus the extra knobs', async () => {
		const file = join(dir, 'options.db');
		createSQLiteProvider({
			url: `file:${file}`,
			pragmas: { cacheSize: -65536, tempStore: 'MEMORY' }
		}).createAdapter();
		// The recommended base (WAL) still applies; the extra knobs are per-connection
		// and only observable from the applying connection (see helper test below).
		await expectJournalMode(file, 'wal');
	});

	it('applyRecommendedPragmas applies option overrides on the given connection', async () => {
		const file = join(dir, 'helper.db');
		const client = createClient({ url: `file:${file}` });
		try {
			await applyRecommendedPragmas(client, `file:${file}`, {
				cacheSize: -65536,
				tempStore: 'MEMORY'
			});
			const cache = await client.execute('PRAGMA cache_size;');
			expect(Number(Object.values(cache.rows[0]!)[0])).toBe(-65536);
			const temp = await client.execute('PRAGMA temp_store;');
			expect(Number(Object.values(temp.rows[0]!)[0])).toBe(2); // 2 = MEMORY
			expect(await journalMode(file)).toBe('wal');
		} finally {
			client.close();
		}
	});

	it('applyRecommendedPragmas skips non-local-file urls', async () => {
		const client = createClient({ url: 'file::memory:' });
		try {
			await applyRecommendedPragmas(client, 'file::memory:');
			const result = await client.execute('PRAGMA busy_timeout;');
			expect(Number(Object.values(result.rows[0]!)[0])).toBe(0); // untouched default
		} finally {
			client.close();
		}
	});

	it('pragmas: string runs custom statements instead of the recommended set', async () => {
		const file = join(dir, 'custom.db');
		createSQLiteProvider({
			url: `file:${file}`,
			// user_version persists in the file header, so a second connection can observe it
			// (unlike per-connection settings such as busy_timeout or non-WAL journal modes)
			pragmas: 'PRAGMA user_version=42;'
		}).createAdapter();
		const probe = createClient({ url: `file:${file}` });
		try {
			await expect
				.poll(
					async () =>
						Number(Object.values((await probe.execute('PRAGMA user_version;')).rows[0]!)[0]),
					{ timeout: 2000 }
				)
				.toBe(42);
			// and the recommended set was NOT applied
			expect(await journalMode(file)).toBe('delete');
		} finally {
			probe.close();
		}
	});
});
