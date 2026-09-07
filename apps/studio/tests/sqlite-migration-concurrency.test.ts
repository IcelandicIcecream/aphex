import { rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';
import { sqliteAdapter } from '../src/lib/server/db/adapters/sqlite';

const directories: string[] = [];

afterEach(async () => {
	await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe('SQLite boot migration', () => {
	it('adds two-factor tables when a legacy user table already exists', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'aphex-sqlite-migration-'));
		directories.push(directory);
		const url = `file:${join(directory, 'aphex.db')}`;
		const legacy = createClient({ url });
		await legacy.execute('CREATE TABLE `user` (`id` text PRIMARY KEY NOT NULL)');
		legacy.close();

		const database = await sqliteAdapter({ url, building: false });
		try {
			const result = await database.client.execute(
				"select name from sqlite_master where type = 'table' and name in ('user', 'two_factor') order by name"
			);
			expect(result.rows.map(({ name }) => name)).toEqual(['two_factor', 'user']);
		} finally {
			database.client.close();
		}
	});

	it('serializes concurrent schema pushes against a fresh database', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'aphex-sqlite-migration-'));
		directories.push(directory);
		const url = `file:${join(directory, 'aphex.db')}`;
		let databases: Awaited<ReturnType<typeof sqliteAdapter>>[] = [];

		try {
			databases = await Promise.all([
				sqliteAdapter({ url, building: false }),
				sqliteAdapter({ url, building: false })
			]);

			const result = await databases[0].client.execute(
				"select count(*) as count from sqlite_master where type = 'table' and name = 'user'"
			);
			expect(Number(result.rows[0].count)).toBe(1);
		} finally {
			await Promise.all(databases.map(({ client }) => client.close()));
		}
	});
});
