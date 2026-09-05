import type { Asset, AssetVariant, AssetVariantRecord } from '../types/asset';
import { buildVariantUrl, imageConfigHash } from '../storage/keys';

/**
 * Reading and selecting image derivatives.
 *
 * Pure functions over an `Asset`, with no Sharp and no storage — so the
 * `<Image>` component can import them in the browser. Generation lives in
 * `./generate.ts`, which is server-only.
 */

/** The resolved image configuration a request is served under. */
export interface ImageConfig {
	widths: number[];
	quality: number;
}

export const DEFAULT_IMAGE_WIDTHS = [320, 640, 960, 1280, 1920];
export const DEFAULT_IMAGE_QUALITY = 80;

/**
 * Normalise the user's `images` config, or return null when disabled.
 *
 * Widths are de-duplicated and sorted so that two configs listing the same
 * widths in a different order hash identically — otherwise reordering the array
 * in `aphex.config.ts` would silently orphan every previously generated
 * derivative and regenerate the lot.
 */
export function resolveImageConfig(
	images: { widths: number[]; quality?: number } | null | undefined
): ImageConfig | null {
	if (images === null) return null;

	const raw = images?.widths ?? DEFAULT_IMAGE_WIDTHS;
	const widths = [...new Set(raw.filter((w) => Number.isInteger(w) && w > 0 && w <= 10000))].sort(
		(a, b) => a - b
	);
	if (widths.length === 0) return null;

	const quality = images?.quality;
	return {
		widths,
		quality:
			typeof quality === 'number' && quality >= 1 && quality <= 100
				? Math.round(quality)
				: DEFAULT_IMAGE_QUALITY
	};
}

/** Hash identifying the config a derivative was generated under. */
export function configHashFor(config: ImageConfig): string {
	return imageConfigHash(config);
}

/**
 * The variant record for an asset, or null when there isn't a usable one.
 *
 * Validates rather than asserts: `metadata` is JSON that has been through a
 * database and may predate this feature entirely, so a malformed or partial
 * record must read as "no variants" and be regenerated, never crash a page
 * render.
 */
export function getVariants(asset: Pick<Asset, 'metadata'>): AssetVariantRecord | null {
	const record = asset.metadata?.variants;
	if (!record || typeof record !== 'object') return null;
	if (typeof record.config !== 'string' || !Array.isArray(record.widths)) return null;

	const widths = record.widths.filter(
		(v): v is AssetVariant =>
			!!v &&
			typeof v === 'object' &&
			typeof v.w === 'number' &&
			typeof v.h === 'number' &&
			typeof v.key === 'string' &&
			typeof v.path === 'string' &&
			typeof v.url === 'string'
	);
	if (widths.length === 0) return null;

	return { config: record.config, generatedAt: record.generatedAt, widths };
}

/**
 * The already-generated derivative for an exact width, under the current config.
 *
 * A record generated under a different config is ignored: every variant URL
 * embeds the config hash, so a stale record's URLs address files that are no
 * longer referenced by anything.
 */
export function pickVariant(
	asset: Pick<Asset, 'metadata'>,
	width: number,
	configHash: string
): AssetVariant | null {
	const record = getVariants(asset);
	if (!record || record.config !== configHash) return null;
	return record.widths.find((v) => v.w === width) ?? null;
}

/**
 * The ladder widths worth offering for this asset.
 *
 * Widths at or above the original's own width are dropped — upscaling produces
 * a larger file that looks no better. The original's width is always included
 * as the top rung so a `srcset` still has something to offer above the last
 * useful ladder step.
 */
/**
 * Build a `srcset` for an asset, listing every ladder width worth offering.
 *
 * The URLs it names may not exist yet — that's the point of generate-on-miss.
 * The browser requests one, `/media` produces it on the spot, and every later
 * request for that width is a cache hit. So a `srcset` is correct the moment an
 * asset is uploaded, with no generation having happened at all.
 */
export function buildSrcset(
	assetId: string,
	config: ImageConfig,
	configHash: string,
	originalWidth: number | null
): string {
	return usableWidths(config, originalWidth)
		.map((w) => `${buildVariantUrl(assetId, w, configHash)} ${w}w`)
		.join(', ');
}

/**
 * Whether derivatives can be produced for this asset at all.
 *
 * Lives here, next to the ladder, because two callers need the same answer: the
 * server building a `srcset` and the admin client picking a thumbnail. A second
 * copy of this rule would drift, and the failure is quiet — a thumbnail URL that
 * falls back to a 14MB original renders perfectly and costs a hundred times what
 * it should.
 */
export function canGenerateVariants(
	asset: Pick<Asset, 'assetType' | 'mimeType' | 'metadata'>
): boolean {
	if (asset.assetType !== 'image') return false;
	// Already resolution-independent; a raster derivative is strictly worse.
	if (asset.mimeType === 'image/svg+xml') return false;
	// An animated source is served as-is — resizing flattens it to one frame.
	if ((asset.metadata?.pages ?? 1) > 1) return false;
	return true;
}

/**
 * The smallest derivative worth requesting for a thumbnail.
 *
 * A grid tile is a couple of hundred pixels; the bottom rung of the ladder is
 * the right answer for it, and nothing about a tile justifies more.
 */
export function thumbnailWidth(config: ImageConfig, originalWidth: number | null): number {
	return usableWidths(config, originalWidth)[0]!;
}

export function usableWidths(config: ImageConfig, originalWidth: number | null): number[] {
	if (!originalWidth || originalWidth <= 0) return config.widths;
	const below = config.widths.filter((w) => w < originalWidth);
	return below.length > 0 ? below : [config.widths[0]!];
}
