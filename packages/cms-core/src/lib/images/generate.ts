import sharp from 'sharp';
import type { Asset, AssetVariant } from '../types/asset';
import type { StorageAdapter } from '../storage/interfaces/storage';
import type { DatabaseAdapter } from '../db/interfaces/index';
import { buildVariantKey, buildVariantUrl, VARIANT_FORMAT } from '../storage/keys';
import { getVariants, type ImageConfig } from './variants';
import { cmsLogger } from '../utils/logger';

/**
 * Derivative generation. Server-only — imports Sharp.
 *
 * Generation happens on the first request for a width, not at upload. That
 * makes backfill free (an old asset is upgraded simply by being viewed) and
 * means a width nobody asks for is never produced. The cost is that the first
 * request for each (asset, width) pays the resize; every later one is served
 * from storage, and from the CDN after that, because a variant URL embeds the
 * config hash and is therefore immutable.
 */

/** Matches the upload path's guard — a decompression bomb must not reach libvips. */
const MAX_INPUT_PIXELS = 100_000_000;

/**
 * In-flight generations, keyed by storage key.
 *
 * Ten simultaneous requests for the same cold variant would otherwise run ten
 * identical resizes. This collapses them to one within a process.
 *
 * It is explicitly *not* a distributed lock: on serverless, separate instances
 * will still duplicate work. That is acceptable because generation is
 * idempotent — same source, same config, same key, same bytes — so the worst
 * case is wasted CPU, never a corrupt or half-written variant.
 */
const inFlight = new Map<string, Promise<GeneratedVariant>>();

/**
 * Cap on *simultaneous* resizes, which is the thing that actually bounds memory.
 *
 * The single-flight map above only dedupes requests for the same variant. It
 * does nothing for twenty requests across twenty different assets, which is the
 * realistic shape of traffic hitting a cold gallery — and each of those holds a
 * fully decoded bitmap while it works. At `limitInputPixels` a single decode can
 * approach 400MB, so unbounded concurrency is an out-of-memory kill on any
 * modest container, not merely slow.
 *
 * Excess work waits rather than failing: an image arriving a little late is
 * strictly better than a 500, and the wait is bounded by how long a resize
 * takes.
 */
const DEFAULT_GENERATION_CONCURRENCY = 2;

let concurrencyLimit = DEFAULT_GENERATION_CONCURRENCY;
let active = 0;
const waiting: Array<() => void> = [];

/**
 * Set how many derivatives may be produced at once.
 *
 * Unlike the upload timeout, this earns being configurable: it encodes a real
 * decision — how much memory this deployment is willing to spend on image
 * processing — and the right answer genuinely differs between a 512MB VPS and a
 * 4GB function. Applied process-wide because the constraint is the process's
 * memory, not any one request's.
 */
export function setGenerationConcurrency(limit: number): void {
	if (Number.isFinite(limit) && limit >= 1) {
		concurrencyLimit = Math.floor(limit);
	}
}

/**
 * Cap on how many requests may *queue* for a slot.
 *
 * An unbounded wait queue converts a memory problem into a worse one: under a
 * burst, thousands of requests each hold a connection and a decoded-image
 * ambition, and the ones at the back time out having achieved nothing. Beyond
 * this depth generation is refused, and the route falls back to serving the
 * original — heavier bytes, but immediately, and the CDN absorbs the retry.
 */
const MAX_GENERATION_QUEUE = 32;

/** Thrown when the queue is saturated. The caller serves the original instead. */
export class GenerationBusyError extends Error {
	constructor() {
		super('Image generation is at capacity');
		this.name = 'GenerationBusyError';
	}
}

/**
 * Thrown for a source whose animation would be destroyed by resizing.
 *
 * Sharp reads only the first frame unless told otherwise, so an animated GIF
 * run through this pipeline comes out as a single still — the image still
 * "works", which is what makes it dangerous: nothing errors, the animation is
 * just silently gone.
 *
 * Preserving it is possible (`animated: true` out to an animated WebP) and
 * deliberately not done here, because the memory cost is unbounded in the one
 * dimension nothing else caps: a decoded animation is frames × width × height ×
 * 4, so a couple of hundred frames at 800×600 is well over a gigabyte. That is
 * exactly the out-of-memory case the concurrency gate exists to prevent, and no
 * per-image pixel limit catches it. Animated sources are served as-is instead.
 */
export class AnimatedSourceError extends Error {
	constructor(pages: number) {
		super(`Refusing to flatten an animated source (${pages} frames)`);
		this.name = 'AnimatedSourceError';
	}
}

async function acquire(): Promise<void> {
	if (active < concurrencyLimit) {
		active++;
		return;
	}
	if (waiting.length >= MAX_GENERATION_QUEUE) {
		throw new GenerationBusyError();
	}
	await new Promise<void>((resolve) => waiting.push(resolve));
	active++;
}

function release(): void {
	active--;
	// Wake exactly one waiter. Waking all would let them race past the limit,
	// which is the bug this whole mechanism exists to prevent.
	waiting.shift()?.();
}

export interface GeneratedVariant {
	variant: AssetVariant;
	buffer: Buffer;
}

/**
 * Produce (or await) the derivative of `asset` at `width`.
 *
 * Writes the variant to storage and records it on `asset.metadata.variants`
 * before resolving, so the next request is a cache hit.
 */
export async function generateVariant(opts: {
	asset: Asset;
	width: number;
	config: ImageConfig;
	configHash: string;
	storage: StorageAdapter;
	database: DatabaseAdapter;
}): Promise<GeneratedVariant> {
	const { asset, width, configHash } = opts;
	const key = buildVariantKey(asset.id, width, configHash);

	const existing = inFlight.get(key);
	if (existing) return existing;

	const work = produce(opts, key).finally(() => inFlight.delete(key));
	inFlight.set(key, work);
	return work;
}

async function produce(
	opts: Parameters<typeof generateVariant>[0],
	key: string
): Promise<GeneratedVariant> {
	const { asset, width, config, configHash, storage, database } = opts;

	// Acquired around the decode/encode only, and released in `finally` — a
	// thrown resize must not leak the slot, or the pool bleeds capacity until
	// nothing can generate at all. Everything after this point is inside the
	// gate, including the storage read, since holding the source buffer is part
	// of the memory being bounded.
	await acquire();
	try {
		return await resize({ asset, width, config, configHash, storage, database }, key);
	} finally {
		release();
	}
}

async function resize(
	opts: Parameters<typeof generateVariant>[0],
	key: string
): Promise<GeneratedVariant> {
	const { asset, width, config, configHash, storage, database } = opts;

	const source = await storage.getObject(asset.path);

	// Header-only read, so this costs nothing next to the resize. Checked here
	// rather than trusting the row, because assets uploaded before `pages` was
	// recorded have no such field and would otherwise be flattened.
	const sourceMeta = await sharp(source).metadata();
	const pages = sourceMeta.pages ?? 1;
	if (pages > 1) throw new AnimatedSourceError(pages);

	// `.rotate()` with no argument applies the EXIF orientation tag. Without it
	// a photo taken in portrait on a phone comes out sideways, because the
	// pixels are landscape and only the tag says otherwise — and Sharp strips
	// metadata by default, so the tag doesn't survive to correct it later.
	//
	// Stripping metadata is also why derivatives carry no EXIF GPS: the privacy
	// win is a side effect of the default, not extra work.
	const pipeline = sharp(source, {
		limitInputPixels: MAX_INPUT_PIXELS,
		// Decode in row order instead of random access. For a downscale — which
		// is all this ever does — libvips can then stream the source rather than
		// holding the whole decoded image, which is the single biggest reduction
		// in peak memory available here.
		sequentialRead: true
	})
		.rotate()
		.resize({
			width,
			// Never scale up. A variant wider than the source is a bigger file
			// that looks no better than the original.
			withoutEnlargement: true,
			fit: 'inside'
		})
		[VARIANT_FORMAT]({ quality: config.quality });

	const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

	const stored = await storage.store({
		buffer: data,
		filename: key.split('/').pop() || key,
		mimeType: `image/${VARIANT_FORMAT}`,
		size: data.length,
		key
	});

	const variant: AssetVariant = {
		w: info.width,
		h: info.height,
		key: stored.key,
		path: stored.path,
		url: buildVariantUrl(asset.id, width, configHash),
		bytes: data.length
	};

	await recordVariant({ asset, variant, configHash, database });

	return { variant, buffer: data };
}

/**
 * Merge one variant into the asset's record.
 *
 * Re-reads the row first because several widths of the same asset can be
 * generated concurrently — writing a record built from the copy this request
 * happened to load would drop whichever sibling finished in between. This is a
 * read-modify-write and still races under true concurrency; the consequence is
 * a lost *record*, not a lost file, and the next request for that width simply
 * regenerates it. A durable fix belongs with the reference index.
 *
 * A failure here is logged, not thrown: the variant exists in storage and can
 * be served, and failing the request because bookkeeping failed would be worse
 * than serving the image and regenerating the record next time.
 */
async function recordVariant(opts: {
	asset: Asset;
	variant: AssetVariant;
	configHash: string;
	database: DatabaseAdapter;
}): Promise<void> {
	const { asset, variant, configHash, database } = opts;
	try {
		const fresh = (await database.findAssetById(asset.organizationId, asset.id)) ?? asset;
		const current = getVariants(fresh);

		// A record from a different config is replaced wholesale rather than
		// merged — its entries address keys nothing will ever request again.
		const kept =
			current && current.config === configHash
				? current.widths.filter((v) => v.w !== variant.w)
				: [];

		const updated = await database.updateAsset(asset.organizationId, asset.id, {
			metadata: {
				...fresh.metadata,
				variants: {
					config: configHash,
					generatedAt: new Date().toISOString(),
					widths: [...kept, variant].sort((a, b) => a.w - b.w)
				}
			}
		});

		// Both relational adapters swallow write errors and return null, so a
		// silent failure here would otherwise look like success and the variant
		// would be regenerated on every single request.
		if (!updated) {
			cmsLogger.warn(
				'[Images]',
				`Variant record not saved for asset ${asset.id} at w${variant.w}; it will be regenerated on the next request`
			);
		}
	} catch (error) {
		cmsLogger.warn('[Images]', `Could not record variant for asset ${asset.id}:`, error);
	}
}
