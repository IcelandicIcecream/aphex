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
