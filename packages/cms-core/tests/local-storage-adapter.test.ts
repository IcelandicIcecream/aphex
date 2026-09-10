import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { LocalStorageAdapter } from '../src/lib/storage/adapters/local-storage-adapter';

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true }))
	);
});

describe('LocalStorageAdapter storage root migrations', () => {
	it('rebases paths from an explicitly configured former storage root', async () => {
		const root = await mkdtemp(join(tmpdir(), 'aphex-local-storage-'));
		temporaryDirectories.push(root);
		const currentRoot = join(root, 'uploads');
		const formerRoot = join(root, 'static', 'uploads');
		const migratedFile = join(currentRoot, 'asset-id', 'original.txt');
		await mkdir(join(currentRoot, 'asset-id'), { recursive: true });
		await writeFile(migratedFile, 'migrated');

		const adapter = new LocalStorageAdapter({
			basePath: currentRoot,
			options: { legacyBasePaths: [formerRoot] }
		});
		const content = await adapter.getObject(join(formerRoot, 'asset-id', 'original.txt'));

		expect(content.toString()).toBe('migrated');
	});

	it('still rejects paths outside both current and former roots', async () => {
		const root = await mkdtemp(join(tmpdir(), 'aphex-local-storage-'));
		temporaryDirectories.push(root);
		const adapter = new LocalStorageAdapter({
			basePath: join(root, 'uploads'),
			options: { legacyBasePaths: [join(root, 'static', 'uploads')] }
		});

		await expect(adapter.getObject(join(root, 'secrets.txt'))).rejects.toThrow('Access denied');
		await expect(adapter.getObject('/etc/passwd')).rejects.toThrow('Access denied');
	});
});
