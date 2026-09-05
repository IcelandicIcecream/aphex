/**
 * Storage key layout.
 *
 * Every asset owns a directory named by its id, and the file it was uploaded
 * with is `original.{ext}` inside it:
 *
 *     {assetId}/original.png
 *     {assetId}/w800-a1b2c3.webp     ← later, generated variants
 *
 * Two properties matter, and both come from the same decision:
 *
 * - **Derivable.** The key follows from the asset id alone, so a sibling — a
 *   resized variant — can be addressed without reading the row back or knowing
 *   how the adapter stores things. The previous flat layout invented a name per
 *   adapter (` (1)` suffixes locally, timestamp + random on S3), which made
 *   `asset.path` unpredictable and left nowhere to put a variant.
 * - **Opaque.** No organization segment and no user-supplied filename. The org
 *   lives on the row, so putting it in the key would leak org ids into storage
 *   paths and force a copy if an asset ever moved between orgs; user filenames
 *   in keys invite collisions and traversal for no benefit, since the display
 *   name is `asset.originalFilename` and is free to change independently.
 *
 * Assets stored under the old flat layout keep their existing `path` and keep
 * working — this applies to new uploads only.
 */

/** Extensions we'll accept straight from a user-supplied filename. */
const EXTENSION_PATTERN = /^[a-z0-9]{1,12}$/;

/** Fallbacks for filenames that arrive without a usable extension. */
const MIME_EXTENSIONS: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/avif': 'avif',
	'image/svg+xml': 'svg',
	'application/pdf': 'pdf'
};

/**
 * Pick a safe extension for a stored file.
 *
 * Prefers the uploaded filename's own extension, falls back to the MIME type,
 * and finally to `bin`. The result is always lowercase alphanumerics, so it
 * can't introduce a path separator or a leading dot of its own.
 */
export function extensionFor(originalFilename: string, mimeType?: string): string {
	const lastDot = originalFilename.lastIndexOf('.');
	if (lastDot > -1) {
		const candidate = originalFilename.slice(lastDot + 1).toLowerCase();
		if (EXTENSION_PATTERN.test(candidate)) return candidate;
	}
	if (mimeType && MIME_EXTENSIONS[mimeType]) return MIME_EXTENSIONS[mimeType];
	return 'bin';
}

/**
 * Adapter-relative key for an asset's original file: `{assetId}/original.{ext}`.
 */
export function buildOriginalKey(
	assetId: string,
	originalFilename: string,
	mimeType?: string
): string {
	return `${assetId}/original.${extensionFor(originalFilename, mimeType)}`;
}

/**
 * Public URL for an asset: the `/media/:id/:filename` route.
 *
 * The route resolves the asset by id alone — the filename segment is cosmetic,
 * there so a saved file lands with a sensible name and so the URL is readable.
 * That's what lets an asset be renamed without touching storage: only this URL
 * changes, and the bytes stay where they are.
 */
export function buildAssetUrl(assetId: string, originalFilename: string): string {
	return `/media/${assetId}/${encodeURIComponent(originalFilename)}`;
}

// --- Variants -------------------------------------------------------------
//
// A derivative is addressed by the same `/media/{id}/{filename}` route as the
// original, with the variant encoded in the filename segment: `w800-a1b2c3.webp`.
//
// Reusing the route rather than adding one is the security-relevant decision.
// The route already resolves the asset, checks whether its field is private,
// and verifies the caller's organization. A separate `/image` endpoint would
// have to reimplement all of that, and the failure mode if it drifted is ugly:
// a *public* derivative of a *private* original, sitting in the bucket forever
// under a guessable key. That is exactly the hole Payload users hit when they
// hand resizing to Next.js's image optimizer, which bypasses access control.
//
// The `configHash` in the name is what makes a variant immutable: change the
// quality or the ladder and every URL changes, so a cached copy is never
// stale and old derivatives are simply orphaned rather than overwritten. That
// in turn is what lets a variant be served `immutable` for a year.

/** Format every derivative is encoded in. Not configurable at V1. */
/**
 * Filename segment that addresses a video's poster frame rather than the asset
 * itself: `/media/{id}/poster.webp`.
 *
 * A poster is deliberately not an image *variant*. Variants are a responsive
 * ladder keyed by width and config hash, regenerated when the image config
 * changes; a poster is one derived frame whose only input is the video, so it
 * has no ladder, no hash, and nothing to regenerate against.
 */
export const POSTER_FILENAME = 'poster.webp';

/** Storage key for a video's poster frame, alongside its original. */
export function buildPosterKey(assetId: string): string {
	return `${assetId}/${POSTER_FILENAME}`;
}

/** Public URL for a video's poster frame. */
export function buildPosterUrl(assetId: string): string {
	return `/media/${assetId}/${POSTER_FILENAME}`;
}

export const VARIANT_FORMAT = 'webp';

/** `w800-a1b2c3.webp` — width, config hash, format. */
const VARIANT_FILENAME_PATTERN = /^w(\d{1,5})-([a-z0-9]{1,12})\.([a-z0-9]{1,8})$/;

export interface ParsedVariant {
	width: number;
	configHash: string;
	format: string;
}

/**
 * Recognise a variant request in the route's filename segment.
 *
 * Returns null for anything else — an original's real filename, a stale link,
 * or junk — which the route serves as the original. The width is bounded by the
 * pattern itself so an absurd value can't reach a resizer.
 */
export function parseVariantFilename(filename: string): ParsedVariant | null {
	const match = VARIANT_FILENAME_PATTERN.exec(filename);
	if (!match) return null;
	const width = Number(match[1]);
	if (!Number.isInteger(width) || width <= 0) return null;
	return { width, configHash: match[2]!, format: match[3]! };
}

/** `w800-a1b2c3.webp` */
export function variantFilename(width: number, configHash: string): string {
	return `w${width}-${configHash}.${VARIANT_FORMAT}`;
}

/** Adapter-relative key for a derivative, a sibling of the original. */
export function buildVariantKey(assetId: string, width: number, configHash: string): string {
	return `${assetId}/${variantFilename(width, configHash)}`;
}

/** Public URL for a derivative, on the same route as the original. */
export function buildVariantUrl(assetId: string, width: number, configHash: string): string {
	return `/media/${assetId}/${variantFilename(width, configHash)}`;
}

/**
 * Stable short hash of the image config.
 *
 * FNV-1a rather than a crypto digest because this has to run in the browser:
 * `<Image>` builds variant URLs for derivatives that may not exist yet, so it
 * needs the same hash the server will use, and Node's `crypto` isn't available
 * to it. It is a cache key, not a security boundary — a collision would serve
 * a correctly-sized image at a slightly different quality, which is why a
 * 32-bit hash is enough.
 */
export function imageConfigHash(config: { widths: number[]; quality?: number }): string {
	const canonical = `${[...config.widths].sort((a, b) => a - b).join(',')}|q${config.quality ?? ''}|f${VARIANT_FORMAT}`;
	let hash = 0x811c9dc5;
	for (let i = 0; i < canonical.length; i++) {
		hash ^= canonical.charCodeAt(i);
		// FNV prime, via shifts so this stays in 32-bit integer math.
		hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
	}
	return hash.toString(36);
}
