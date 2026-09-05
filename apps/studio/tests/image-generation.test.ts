import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import sharp from 'sharp';
import {
	generateVariant,
	setGenerationConcurrency,
	AnimatedSourceError
} from '@aphexcms/cms-core/images/generate';
import { configHashFor, getVariants, resolveImageConfig } from '@aphexcms/cms-core/server';

/**
 * Actually runs Sharp.
 *
 * Every other image test in this suite exercises pure logic or a fallback path,
 * which means the part that does the real work — decode, rotate, resize,
 * encode, write back, record — was entirely unverified. These tests are slower
 * on purpose: the failures they catch (a sideways photo, an upscaled variant, a
 * clobbered record) are invisible to the pure-logic tests.
 */

const CONFIG = resolveImageConfig({ widths: [320, 640], quality: 80 })!;
const CONFIG_HASH = configHashFor(CONFIG);

let LANDSCAPE: Buffer;
/** 1200x800, but tagged as needing a 90° rotation, as a phone would write it. */
let ROTATED: Buffer;

beforeAll(async () => {
	LANDSCAPE = await sharp({
		create: { width: 1200, height: 800, channels: 3, background: '#4488cc' }
	})
		.png()
		.toBuffer();

	// EXIF orientation 6 means "rotate 90° clockwise on display". The pixels stay
	// landscape; only the tag says the image is portrait.
	ROTATED = await sharp({
		create: { width: 1200, height: 800, channels: 3, background: '#cc8844' }
	})
		.withMetadata({ orientation: 6 })
		.jpeg()
		.toBuffer();
});

function makeStorage(originalPath: string, bytes: () => Buffer) {
	const objects = new Map<string, Buffer>();
	const storage = {
		name: 'mem',
		objects,
		getObject: vi.fn(async (path: string) => {
			if (path === originalPath) return bytes();
			const found = objects.get(path);
			if (!found) throw new Error(`no object at ${path}`);
			return found;
		}),
		store: vi.fn(async (data: any) => {
			const path = `mem/${data.key}`;
			objects.set(path, data.buffer);
			return { key: data.key, path, url: '', size: data.size };
		})
	};
	return storage;
}

function makeAsset(overrides: Record<string, unknown> = {}) {
	return {
		id: 'asset-1',
		organizationId: 'org-a',
		path: 'mem/asset-1/original.png',
		assetType: 'image',
		mimeType: 'image/png',
		width: 1200,
		height: 800,
		metadata: {},
		...overrides
	} as any;
}

function makeDatabase(initial: any) {
	let row = initial;
	return {
		findAssetById: vi.fn(async () => row),
		updateAsset: vi.fn(async (_org: string, _id: string, patch: any) => {
			row = { ...row, ...patch };
			return row;
		}),
		current: () => row
	};
}

describe('generateVariant', () => {
	it('produces a WebP at the requested width, preserving aspect ratio', async () => {
		const asset = makeAsset();
		const storage = makeStorage(asset.path, () => LANDSCAPE);
		const database = makeDatabase(asset);

		const { variant, buffer } = await generateVariant({
			asset,
			width: 640,
			config: CONFIG,
			configHash: CONFIG_HASH,
			storage: storage as any,
			database: database as any
		});

		const meta = await sharp(buffer).metadata();
		expect(meta.format).toBe('webp');
		expect(meta.width).toBe(640);
		// 1200x800 scaled to 640 wide is 427 tall (rounded).
		expect(meta.height).toBe(427);
		expect(variant.w).toBe(640);
		expect(variant.h).toBe(427);
		expect(variant.bytes).toBe(buffer.length);
	});

	it('writes the derivative beside the original, not into a new directory', async () => {
		const asset = makeAsset();
		const storage = makeStorage(asset.path, () => LANDSCAPE);
		const database = makeDatabase(asset);

		const { variant } = await generateVariant({
			asset,
			width: 320,
			config: CONFIG,
			configHash: CONFIG_HASH,
			storage: storage as any,
			database: database as any
		});

		expect(variant.key).toBe(`asset-1/w320-${CONFIG_HASH}.webp`);
		expect(storage.objects.has(variant.path)).toBe(true);
	});

	it('records the variant on the asset so the next request is a hit', async () => {
		const asset = makeAsset();
		const storage = makeStorage(asset.path, () => LANDSCAPE);
		const database = makeDatabase(asset);

		await generateVariant({
			asset,
			width: 320,
			config: CONFIG,
			configHash: CONFIG_HASH,
			storage: storage as any,
			database: database as any
		});

		const record = getVariants(database.current());
		expect(record?.config).toBe(CONFIG_HASH);
		expect(record?.widths.map((v) => v.w)).toEqual([320]);
	});

	it('merges a second width instead of clobbering the first', async () => {
		// Widths are generated independently, on separate requests. A record built
		// from the copy this request happened to load would drop its sibling.
		const asset = makeAsset();
		const storage = makeStorage(asset.path, () => LANDSCAPE);
		const database = makeDatabase(asset);

		const opts = {
			asset,
			config: CONFIG,
			configHash: CONFIG_HASH,
			storage: storage as any,
			database: database as any
		};
		await generateVariant({ ...opts, width: 320 });
		await generateVariant({ ...opts, width: 640 });

		expect(getVariants(database.current())?.widths.map((v) => v.w)).toEqual([320, 640]);
	});

	it('preserves metadata the upload path recorded', async () => {
		// The column is written whole, so a fragment would silently drop
		// dimensions, dominant colour and the privacy fields.
		const asset = makeAsset({
			metadata: { dominantColor: { r: 1, g: 2, b: 3 }, schemaType: 'page', fieldPath: 'hero' }
		});
		const storage = makeStorage(asset.path, () => LANDSCAPE);
		const database = makeDatabase(asset);

		await generateVariant({
			asset,
			width: 320,
			config: CONFIG,
			configHash: CONFIG_HASH,
			storage: storage as any,
			database: database as any
		});

		const after = database.current().metadata;
		expect(after.schemaType).toBe('page');
		expect(after.fieldPath).toBe('hero');
		expect(after.dominantColor).toEqual({ r: 1, g: 2, b: 3 });
		expect(after.variants).toBeDefined();
	});

	it('never upscales past the original', async () => {
		// A variant wider than the source is a bigger file that looks no better.
		const asset = makeAsset({ width: 400, height: 300 });
		const small = await sharp({
			create: { width: 400, height: 300, channels: 3, background: '#123456' }
		})
			.png()
			.toBuffer();
		const storage = makeStorage(asset.path, () => small);
		const database = makeDatabase(asset);

		const { variant } = await generateVariant({
			asset,
			width: 640,
			config: CONFIG,
			configHash: CONFIG_HASH,
			storage: storage as any,
			database: database as any
		});

		expect(variant.w).toBe(400);
	});

	it('applies EXIF orientation so a phone photo is not sideways', async () => {
		// The source pixels are 1200x800 landscape with an orientation tag saying
		// "rotate 90°". Sharp strips metadata on output, so if the rotation isn't
		// baked in here nothing downstream can recover it — the image is simply
		// wrong forever.
		const asset = makeAsset({ mimeType: 'image/jpeg', width: 800, height: 1200 });
		const storage = makeStorage(asset.path, () => ROTATED);
		const database = makeDatabase(asset);

		const { buffer } = await generateVariant({
			asset,
			width: 320,
			config: CONFIG,
			configHash: CONFIG_HASH,
			storage: storage as any,
			database: database as any
		});

		const meta = await sharp(buffer).metadata();
		// Rotated, so the output is taller than it is wide.
		expect(meta.height!).toBeGreaterThan(meta.width!);
		expect(meta.width).toBe(320);
	});

	it('strips EXIF from the derivative', async () => {
		// Sharp's default, but worth pinning: originals keep their EXIF, and
		// derivatives are what get served publicly. GPS coordinates leaking
		// through a thumbnail would be a real privacy failure.
		const asset = makeAsset({ mimeType: 'image/jpeg' });
		const storage = makeStorage(asset.path, () => ROTATED);
		const database = makeDatabase(asset);

		const { buffer } = await generateVariant({
			asset,
			width: 320,
			config: CONFIG,
			configHash: CONFIG_HASH,
			storage: storage as any,
			database: database as any
		});

		expect((await sharp(buffer).metadata()).exif).toBeUndefined();
	});

	it('collapses concurrent requests for the same variant into one resize', async () => {
		const asset = makeAsset();
		const storage = makeStorage(asset.path, () => LANDSCAPE);
		const database = makeDatabase(asset);

		const opts = {
			asset,
			width: 640,
			config: CONFIG,
			configHash: CONFIG_HASH,
			storage: storage as any,
			database: database as any
		};
		const [a, b, c] = await Promise.all([
			generateVariant(opts),
			generateVariant(opts),
			generateVariant(opts)
		]);

		// One read of the original and one write, not three of each.
		expect(storage.getObject).toHaveBeenCalledTimes(1);
		expect(storage.store).toHaveBeenCalledTimes(1);
		expect(a.variant.key).toBe(b.variant.key);
		expect(b.variant.key).toBe(c.variant.key);
	});

	it('does not hold the in-flight entry after finishing', async () => {
		// A leaked entry would serve the first generation forever, so a later
		// request after a config change could never regenerate.
		const asset = makeAsset();
		const storage = makeStorage(asset.path, () => LANDSCAPE);
		const database = makeDatabase(asset);

		const opts = {
			asset,
			width: 320,
			config: CONFIG,
			configHash: CONFIG_HASH,
			storage: storage as any,
			database: database as any
		};
		await generateVariant(opts);
		await generateVariant(opts);

		expect(storage.getObject).toHaveBeenCalledTimes(2);
	});

	it('releases the in-flight entry when generation fails', async () => {
		// Otherwise one transient failure poisons that variant for the lifetime
		// of the process — every later request would await the rejected promise.
		const asset = makeAsset();
		const database = makeDatabase(asset);
		let attempts = 0;
		const storage = {
			name: 'mem',
			getObject: vi.fn(async () => {
				attempts++;
				if (attempts === 1) throw new Error('transient read failure');
				return LANDSCAPE;
			}),
			store: vi.fn(async (data: any) => ({
				key: data.key,
				path: `mem/${data.key}`,
				url: '',
				size: data.size
			}))
		};

		const opts = {
			asset,
			width: 320,
			config: CONFIG,
			configHash: CONFIG_HASH,
			storage: storage as any,
			database: database as any
		};

		await expect(generateVariant(opts)).rejects.toThrow('transient read failure');
		await expect(generateVariant(opts)).resolves.toBeDefined();
	});

	it('still returns the image when recording the variant fails', async () => {
		// The bytes exist and can be served. Failing the request because
		// bookkeeping failed would be worse than regenerating next time.
		const asset = makeAsset();
		const storage = makeStorage(asset.path, () => LANDSCAPE);
		const database = {
			findAssetById: vi.fn(async () => asset),
			updateAsset: vi.fn(async () => {
				throw new Error('write failed');
			})
		};

		const { buffer } = await generateVariant({
			asset,
			width: 320,
			config: CONFIG,
			configHash: CONFIG_HASH,
			storage: storage as any,
			database: database as any
		});

		expect((await sharp(buffer).metadata()).width).toBe(320);
	});
});

/**
 * Bounding *simultaneous* resizes is what actually protects memory. Single-flight
 * only dedupes the same variant; twenty requests across twenty assets is the
 * realistic shape of traffic hitting a cold gallery, and each holds a decoded
 * bitmap. At `limitInputPixels` one decode can approach 400MB, so unbounded
 * concurrency is an OOM kill on a modest container, not merely slow.
 */
describe('generation concurrency', () => {
	afterEach(() => setGenerationConcurrency(2));

	it('never runs more resizes at once than the limit', async () => {
		setGenerationConcurrency(2);

		let active = 0;
		let peak = 0;
		const database = makeDatabase(makeAsset());
		const storage = {
			name: 'mem',
			getObject: vi.fn(async () => {
				active++;
				peak = Math.max(peak, active);
				await new Promise((r) => setTimeout(r, 15));
				return LANDSCAPE;
			}),
			store: vi.fn(async (data: any) => {
				active--;
				return { key: data.key, path: `mem/${data.key}`, url: '', size: data.size };
			})
		};

		// Distinct assets, so single-flight cannot be what limits this.
		await Promise.all(
			[1, 2, 3, 4, 5, 6].map((n) =>
				generateVariant({
					asset: makeAsset({ id: `asset-${n}` }),
					width: 320,
					config: CONFIG,
					configHash: CONFIG_HASH,
					storage: storage as any,
					database: database as any
				})
			)
		);

		expect(peak).toBeLessThanOrEqual(2);
		expect(storage.getObject).toHaveBeenCalledTimes(6);
	});

	it('releases the slot when a resize throws', async () => {
		// A leaked slot bleeds capacity until nothing can generate at all — the
		// worst failure mode, because it only appears under load and looks like
		// a hang rather than an error.
		setGenerationConcurrency(1);

		const database = makeDatabase(makeAsset());
		let call = 0;
		const storage = {
			name: 'mem',
			getObject: vi.fn(async () => {
				if (++call === 1) throw new Error('boom');
				return LANDSCAPE;
			}),
			store: vi.fn(async (data: any) => ({
				key: data.key,
				path: `mem/${data.key}`,
				url: '',
				size: data.size
			}))
		};

		const opts = {
			width: 320,
			config: CONFIG,
			configHash: CONFIG_HASH,
			storage: storage as any,
			database: database as any
		};

		await expect(generateVariant({ ...opts, asset: makeAsset({ id: 'asset-a' }) })).rejects.toThrow(
			'boom'
		);

		// If the slot leaked, this would hang rather than resolve.
		await expect(
			generateVariant({ ...opts, asset: makeAsset({ id: 'asset-b' }) })
		).resolves.toBeDefined();
	});
});

/**
 * Sharp reads only the first frame unless told otherwise, so an animated GIF
 * run through a resize comes out a single still. Nothing errors — the image
 * still renders — which is exactly what makes it dangerous.
 */
describe('animated sources', () => {
	let ANIMATED: Buffer;
	let STATIC_GIF: Buffer;

	beforeAll(async () => {
		const W = 120,
			H = 80,
			N = 3;
		const colors = [
			[255, 0, 0],
			[0, 255, 0],
			[0, 0, 255]
		];
		const raw = Buffer.alloc(W * H * N * 3);
		for (let f = 0; f < N; f++) {
			for (let p = 0; p < W * H; p++) {
				const o = (f * W * H + p) * 3;
				raw[o] = colors[f]![0]!;
				raw[o + 1] = colors[f]![1]!;
				raw[o + 2] = colors[f]![2]!;
			}
		}
		ANIMATED = await sharp(raw, {
			raw: { width: W, height: H * N, channels: 3, pageHeight: H }
		})
			.gif()
			.toBuffer();
		STATIC_GIF = await sharp(Buffer.alloc(W * H * 3, 200), {
			raw: { width: W, height: H, channels: 3 }
		})
			.gif()
			.toBuffer();
	});

	it('the fixture really is animated', async () => {
		// Guards the test itself: an accidentally single-page fixture would make
		// the refusal test below pass for entirely the wrong reason.
		expect((await sharp(ANIMATED).metadata()).pages).toBe(3);
		expect((await sharp(STATIC_GIF).metadata()).pages ?? 1).toBe(1);
	});

	it('refuses to flatten an animated GIF', async () => {
		const asset = makeAsset({ mimeType: 'image/gif' });
		const storage = makeStorage(asset.path, () => ANIMATED);
		const database = makeDatabase(asset);

		await expect(
			generateVariant({
				asset,
				width: 60,
				config: CONFIG,
				configHash: CONFIG_HASH,
				storage: storage as any,
				database: database as any
			})
		).rejects.toThrow(AnimatedSourceError);

		// Nothing written: the route serves the original instead.
		expect(storage.store).not.toHaveBeenCalled();
	});

	it('still optimises a static GIF', async () => {
		// Only animation is excluded, not the format.
		const asset = makeAsset({ mimeType: 'image/gif' });
		const storage = makeStorage(asset.path, () => STATIC_GIF);
		const database = makeDatabase(asset);

		const { buffer } = await generateVariant({
			asset,
			width: 60,
			config: CONFIG,
			configHash: CONFIG_HASH,
			storage: storage as any,
			database: database as any
		});

		const meta = await sharp(buffer).metadata();
		expect(meta.format).toBe('webp');
		expect(meta.width).toBe(60);
	});

	it('releases the concurrency slot when refusing', async () => {
		setGenerationConcurrency(1);
		const storage = makeStorage('mem/asset-1/original.png', () => ANIMATED);
		const database = makeDatabase(makeAsset());

		await expect(
			generateVariant({
				asset: makeAsset({ mimeType: 'image/gif' }),
				width: 60,
				config: CONFIG,
				configHash: CONFIG_HASH,
				storage: storage as any,
				database: database as any
			})
		).rejects.toThrow(AnimatedSourceError);

		const ok = makeStorage('mem/asset-2/original.png', () => LANDSCAPE);
		await expect(
			generateVariant({
				asset: makeAsset({ id: 'asset-2', path: 'mem/asset-2/original.png' }),
				width: 320,
				config: CONFIG,
				configHash: CONFIG_HASH,
				storage: ok as any,
				database: database as any
			})
		).resolves.toBeDefined();
		setGenerationConcurrency(2);
	});
});
