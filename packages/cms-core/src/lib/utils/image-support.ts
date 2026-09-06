/**
 * Image formats no mainstream browser will decode in an `<img>`.
 *
 * HEIC/HEIF is the one that reaches a CMS in volume: it is the iPhone camera
 * default. Safari renders it — macOS has the system decoder — while Chrome and
 * Firefox show the broken-image glyph. sharp offers no way out either: the
 * prebuilt libvips ships a HEIF loader restricted to AVIF, with no HEVC decoder
 * (patent licensing), so there is no derivative to fall back to and the
 * undecodable original is all there is to show.
 *
 * Keep this list to formats that genuinely cannot render anywhere. Anything a
 * browser merely *might* not support is better left to the `<img>` and its
 * error handler, which catches the real answer without guessing.
 */
const UNDECODABLE_IMAGE_MIME_TYPES = new Set([
	'image/heic',
	'image/heif',
	'image/heic-sequence',
	'image/heif-sequence'
]);

/**
 * Whether it is worth pointing an `<img>` at this asset at all.
 *
 * An unknown type answers `true`: the request is the cheapest way to find out,
 * and a failed load falls back to the same placeholder anyway.
 */
export function browserCanDecodeImage(mimeType: string | null | undefined): boolean {
	if (!mimeType) return true;
	return !UNDECODABLE_IMAGE_MIME_TYPES.has(mimeType.toLowerCase());
}
