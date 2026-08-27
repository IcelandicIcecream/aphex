/**
 * StorageAdapter cross-adapter conformance suite.
 *
 * Mirrors the cross-dialect DB pattern (`packages/sqlite-adapter/tests/conformance.spec.ts`):
 * one spec, run against every storage adapter, so the two implementations can't
 * silently drift. Until now nothing tested `StorageAdapter` at all — the only
 * coverage was the path-traversal block in `security-audit.test.ts`, and
 * `@aphexcms/storage-s3` had no tests whatsoever.
 *
 * Adapters under test:
 *   - local  — always runs, against a fresh tmpdir
 *   - s3     — runs only when R2_* is set in apps/studio/.env, otherwise skipped
 *
 * S3 objects are written under a per-run prefix (`__conformance/<runId>/`) and
 * removed in afterAll, so a real bucket is never polluted by a test run.
 *
 * Run: pnpm -F @aphexcms/studio test storage-conformance
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { env } from '$env/dynamic/private';
import { createStorageAdapter } from '@aphexcms/cms-core/server';
import { s3Storage } from '@aphexcms/storage-s3';
import type { StorageAdapter } from '@aphexcms/cms-core/server';

const RUN_ID = randomUUID().slice(0, 8);

/**
 * A 1x1 PNG. Binary content on purpose: a text fixture would pass even if an
 * adapter mangled bytes through a string round-trip, and the image pipeline
 * work depends on originals surviving storage byte-for-byte.
 */
const PNG_1X1 = Buffer.from(
	'89504e470d0a1a0a0000000d494844520000000100000001080600000' +
		'01f15c4890000000d49444154789c636000020000050001aad5c8510000000049454e44ae426082',
	'hex'
);

type AdapterCase = {
	name: string;
	adapter: StorageAdapter;
	/** Adapters differ here today; phase 2 of the image plan is what unifies them. */
	expectsEmptyUrlOnStore: boolean;
	/**
	 * The only path prefix this case is ever allowed to write to or delete.
	 * See {@link assertOwned} — this suite runs against a real bucket, so
	 * "we only ever touch our own prefix" is enforced, not merely intended.
	 */
	ownedPrefix: string;
	cleanup: () => Promise<void>;
};

const cases: AdapterCase[] = [];
let localTmpDir: string;

const hasR2 = Boolean(
	env.R2_BUCKET && env.R2_ENDPOINT && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
);

/**
 * Every S3 object this run touches lives under exactly this prefix. It embeds a
 * per-run UUID, so even two concurrent runs against the same bucket cannot
 * observe or delete each other's objects.
 */
const S3_PREFIX = `__conformance/${RUN_ID}`;

/** Paths written during the run, deleted in afterAll. */
const written: Array<{ c: AdapterCase; path: string }> = [];

/**
 * Refuse to touch anything outside the case's own prefix.
 *
 * This suite points at a developer's real R2 bucket, which holds real assets.
 * A prefix-handling bug in the adapter — exactly the class of bug this suite
 * exists to catch — could otherwise turn cleanup into data loss. So every path
 * is checked before it is deleted, and a violation aborts rather than deletes.
 */
function assertOwned(c: AdapterCase, path: string): void {
	if (!path.startsWith(c.ownedPrefix)) {
		throw new Error(
			`[${c.name}] refusing to touch "${path}": outside this run's prefix "${c.ownedPrefix}"`
		);
	}
}

async function store(c: AdapterCase, data: Parameters<StorageAdapter['store']>[0]) {
	const file = await c.adapter.store(data);
	// Assert before recording: if store() ever returns an out-of-prefix path, the
	// suite fails on the spot instead of registering it for deletion.
	assertOwned(c, file.path);
	written.push({ c, path: file.path });
	return file;
}

beforeAll(async () => {
	localTmpDir = await mkdtemp(join(tmpdir(), 'aphex-storage-conformance-'));
	cases.push({
		name: 'local',
		adapter: createStorageAdapter('local', { basePath: localTmpDir, baseUrl: '/uploads' }),
		expectsEmptyUrlOnStore: true,
		ownedPrefix: localTmpDir,
		cleanup: async () => rm(localTmpDir, { recursive: true, force: true })
	});

	if (hasR2) {
		const bucket = env.R2_BUCKET!;
		cases.push({
			name: 's3',
			adapter: s3Storage({
				bucket,
				endpoint: env.R2_ENDPOINT!,
				accessKeyId: env.R2_ACCESS_KEY_ID!,
				secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
				publicUrl: env.R2_PUBLIC_URL || '',
				// Every object this suite writes is namespaced under one prefix.
				basePath: S3_PREFIX
			}).adapter,
			expectsEmptyUrlOnStore: false,
			// Stored paths are bucket-prefixed, so the owned prefix must be too.
			// This also pins the run to the one configured bucket: a path naming
			// any other bucket fails assertOwned rather than being deleted.
			ownedPrefix: `${bucket}/${S3_PREFIX}/`,
			cleanup: async () => {}
		});
	} else {
		// Visible in the run output so a green suite is never mistaken for S3 coverage.
		console.warn('[storage-conformance] R2_* not set — skipping the s3 adapter case');
	}
}, 30000);

afterAll(async () => {
	// Deleting is not enough to claim the bucket is clean — verify it. A leftover
	// object in someone's real R2 bucket is a bug in this suite, so fail loudly
	// rather than silently accumulating `__conformance/*` prefixes forever.
	const leftovers: string[] = [];
	for (const { c, path } of written) {
		// Last line of defence before an irreversible operation on a real bucket.
		// Throws out of afterAll rather than deleting anything unexpected.
		assertOwned(c, path);
		try {
			// Tests that delete their own object leave a path here that is already
			// gone; deleting it again is not a failure, so only objects that still
			// exist are worth chasing.
			if (!(await c.adapter.exists(path))) continue;
			await c.adapter.delete(path);
			if (await c.adapter.exists(path)) leftovers.push(path);
		} catch (error) {
			leftovers.push(`${path} (delete threw: ${(error as Error).message})`);
		}
	}
	for (const c of cases) await c.cleanup();

	if (leftovers.length > 0) {
		throw new Error(
			`storage-conformance left ${leftovers.length} object(s) behind:\n  ${leftovers.join('\n  ')}`
		);
	}
}, 30000);

describe('StorageAdapter conformance', () => {
	// Built lazily: `cases` is populated in beforeAll, so the describe bodies
	// resolve their adapter at test time rather than at collection time.
	const forEachAdapter = (
		label: string,
		fn: (c: AdapterCase) => Promise<void>,
		timeout = 20000
	) => {
		it(
			label,
			async () => {
				for (const c of cases) {
					try {
						await fn(c);
					} catch (error) {
						// Name the adapter, otherwise a failure in a loop is unattributable.
						throw new Error(`[${c.name}] ${(error as Error).message}`, { cause: error });
					}
				}
			},
			timeout
		);
	};

	forEachAdapter('exposes a stable adapter name', async (c) => {
		expect(typeof c.adapter.name).toBe('string');
		expect(c.adapter.name.length).toBeGreaterThan(0);
	});

	forEachAdapter('reports healthy', async (c) => {
		expect(await c.adapter.isHealthy()).toBe(true);
	});

	forEachAdapter('store() returns a path and the stored size', async (c) => {
		const file = await store(c, {
			buffer: PNG_1X1,
			filename: 'conformance-store.png',
			mimeType: 'image/png',
			size: PNG_1X1.length
		});

		expect(file.path).toBeTruthy();
		expect(file.size).toBe(PNG_1X1.length);

		// Known divergence, asserted rather than papered over: local defers URL
		// generation to AssetService (which writes /media/{id}/{filename}),
		// while S3 returns a public URL immediately.
		if (c.expectsEmptyUrlOnStore) {
			expect(file.url).toBe('');
		} else {
			expect(file.url).toMatch(/^https?:\/\//);
		}
	});

	forEachAdapter('exists() is true after store and false for an unknown path', async (c) => {
		const file = await store(c, {
			buffer: PNG_1X1,
			filename: 'conformance-exists.png',
			mimeType: 'image/png',
			size: PNG_1X1.length
		});

		expect(await c.adapter.exists(file.path)).toBe(true);
		expect(await c.adapter.exists(`${file.path}.does-not-exist`)).toBe(false);
	});

	forEachAdapter('delete() removes the object and is observable via exists()', async (c) => {
		const file = await store(c, {
			buffer: PNG_1X1,
			filename: 'conformance-delete.png',
			mimeType: 'image/png',
			size: PNG_1X1.length
		});

		expect(await c.adapter.delete(file.path)).toBe(true);
		expect(await c.adapter.exists(file.path)).toBe(false);
	});

	forEachAdapter('storing the same filename twice does not clobber the first object', async (c) => {
		const first = await store(c, {
			buffer: Buffer.from('first'),
			filename: 'conformance-collision.txt',
			mimeType: 'text/plain',
			size: 5
		});
		const second = await store(c, {
			buffer: Buffer.from('second'),
			filename: 'conformance-collision.txt',
			mimeType: 'text/plain',
			size: 6
		});

		expect(second.path).not.toBe(first.path);
		expect(await c.adapter.exists(first.path)).toBe(true);
		expect(await c.adapter.exists(second.path)).toBe(true);
	});

	forEachAdapter('getUrl() returns an absolute or root-relative URL', async (c) => {
		const file = await store(c, {
			buffer: PNG_1X1,
			filename: 'conformance-url.png',
			mimeType: 'image/png',
			size: PNG_1X1.length
		});

		const url = c.adapter.getUrl(file.path);
		expect(url).toBeTruthy();
		expect(url.startsWith('http') || url.startsWith('/')).toBe(true);
		// The bucket name is an implementation detail of the storage key and must
		// never leak into a public URL.
		if (c.name === 's3' && env.R2_BUCKET) {
			expect(url).not.toContain(`/${env.R2_BUCKET}/`);
		}
	});

	forEachAdapter('rejects a file larger than the adapter maxFileSize', async (c) => {
		await expect(
			c.adapter.store({
				buffer: Buffer.alloc(16),
				filename: 'conformance-toobig.bin',
				mimeType: 'application/octet-stream',
				// The adapters validate the declared size, not the buffer length.
				size: 11 * 1024 * 1024
			})
		).rejects.toThrow(/too large/i);
	});
});

/**
 * getObject() is declared optional on StorageAdapter, but the image pipeline
 * makes it mandatory in practice: generating a derivative, or re-keying a legacy
 * asset during a regenerate run, means reading the original back out of storage.
 * So it is asserted of every adapter, not just the ones that happen to have it.
 */
describe('StorageAdapter.getObject (required by the image pipeline)', () => {
	it('is implemented by every adapter', () => {
		const missing = cases.filter((c) => !c.adapter.getObject).map((c) => c.name);
		expect(missing).toEqual([]);
	});

	it('round-trips bytes exactly', async () => {
		for (const c of cases) {
			const file = await store(c, {
				buffer: PNG_1X1,
				filename: 'conformance-roundtrip.png',
				mimeType: 'image/png',
				size: PNG_1X1.length
			});

			const read = await c.adapter.getObject!(file.path);
			expect(read.length, `[${c.name}] byte length`).toBe(PNG_1X1.length);
			// The real assertion. A text-decoding read (s3mini's getObject, as
			// opposed to getObjectArrayBuffer) passes the length check on some
			// payloads but corrupts bytes above 0x7f.
			expect(read.equals(PNG_1X1), `[${c.name}] byte equality`).toBe(true);
		}
	}, 20000);
});

/**
 * Optional capabilities: tested only against adapters that implement them, but
 * tested properly where they exist. `listObjects` and `copyObject` are what the
 * `aphx images regenerate` prune step will be built on, and both were silently
 * broken on S3 until the adapter was scoped to its bucket — s3mini derives its
 * own bucket name from the endpoint, which for an account-level R2 endpoint
 * resolves to the account hash.
 */
describe('StorageAdapter optional capabilities', () => {
	it('listObjects() finds a stored object under its prefix', async () => {
		for (const c of cases) {
			if (!c.adapter.listObjects) continue;

			const file = await store(c, {
				buffer: PNG_1X1,
				filename: 'conformance-list.png',
				mimeType: 'image/png',
				size: PNG_1X1.length
			});

			const result = await c.adapter.listObjects();
			const keys = result.objects.map((o) => o.key);

			// Safety-critical, not cosmetic: a prune step deletes what listObjects
			// reports. If basePath scoping leaks, this listing would include real
			// assets elsewhere in the bucket. Assert the adapter never sees past
			// its own prefix.
			const escaped = keys.filter((k) => !k.startsWith(c.ownedPrefix));
			expect(escaped, `[${c.name}] listing escaped its basePath`).toEqual([]);

			// Keys must come back in the same shape `store()` hands out, otherwise
			// a prune step would compute the wrong set of orphans to delete.
			expect(keys, `[${c.name}] listing must use stored-path shape`).toContain(file.path);

			const entry = result.objects.find((o) => o.key === file.path)!;
			expect(entry.size, `[${c.name}] listed size`).toBe(PNG_1X1.length);
		}
	}, 20000);

	it('copyObject() duplicates bytes to a new path', async () => {
		for (const c of cases) {
			if (!c.adapter.copyObject || !c.adapter.getObject) continue;

			const file = await store(c, {
				buffer: PNG_1X1,
				filename: 'conformance-copy-src.png',
				mimeType: 'image/png',
				size: PNG_1X1.length
			});
			const destPath = `${file.path}.copy`;

			expect(await c.adapter.copyObject(file.path, destPath), `[${c.name}] copy`).toBe(true);
			assertOwned(c, destPath);
			written.push({ c, path: destPath });

			expect(await c.adapter.exists(destPath), `[${c.name}] copy exists`).toBe(true);
			const copied = await c.adapter.getObject!(destPath);
			expect(copied.equals(PNG_1X1), `[${c.name}] copied byte equality`).toBe(true);
			// Copy, not move.
			expect(await c.adapter.exists(file.path), `[${c.name}] source survives`).toBe(true);
		}
	}, 20000);

	it('getSignedUrl() returns a URL that actually fetches the bytes', async () => {
		for (const c of cases) {
			if (!c.adapter.getSignedUrl || c.name === 'local') continue;

			const file = await store(c, {
				buffer: PNG_1X1,
				filename: 'conformance-signed.png',
				mimeType: 'image/png',
				size: PNG_1X1.length
			});

			const url = await c.adapter.getSignedUrl(file.path, 300);
			expect(url, `[${c.name}] signed url is signed`).toContain('X-Amz-Signature');

			// The point of a signed URL is that an unauthenticated client can use
			// it. Fetch with no credentials and compare bytes.
			const response = await fetch(url);
			expect(response.status, `[${c.name}] signed url status`).toBe(200);
			const body = Buffer.from(await response.arrayBuffer());
			expect(body.equals(PNG_1X1), `[${c.name}] signed url byte equality`).toBe(true);
		}
	}, 20000);
});
