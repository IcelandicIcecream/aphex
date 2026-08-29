// Asset URL injection — the single source of truth for "make a document's images
// renderable". Aphex asset URLs aren't derivable from the `_ref` alone, so before a
// document can be rendered (server-side on a public route, or client-side in the live
// preview) each `{ asset: { _ref } }` has to be resolved to its URL/alt and have those
// woven back into the document.
//
// This module owns the *walk* (collect refs / inject results). The *resolution* of a
// ref → { url, alt } differs by environment — the server uses `AssetService`, the editor
// uses the assets API client — so it's supplied by the caller. Keeping the walk in one
// place means SSR and live preview produce documents of the exact same shape:
// `image.asset.url` is always populated, and the frontend never needs a side-channel map.

/** A resolved asset's renderable data. */
export interface ResolvedAsset {
	url: string;
	alt?: string;
	/**
	 * Intrinsic dimensions of the original, so `<Image>` can set width/height and
	 * reserve layout space before the image loads.
	 */
	width?: number;
	height?: number;
	/**
	 * Pre-built `srcset` of generated widths.
	 *
	 * Built here, on the server, rather than in the component: constructing a
	 * variant URL needs the width ladder and the config hash, and the choice is
	 * between shipping both to the browser or shipping the finished string. The
	 * string is smaller, keeps the hashing in one place, and means the rule for
	 * how a variant is addressed lives entirely server-side.
	 *
	 * Absent when the pipeline is disabled or the asset isn't an image, in which
	 * case `<Image>` renders a plain `src` and behaves exactly as before.
	 */
	srcset?: string;
}

/**
 * Collect every asset `_ref` reachable in a value. Image and file fields, and
 * portable-text image blocks, all carry `{ asset: { _ref } }`, so one generic walk
 * covers them — callers never enumerate field paths by hand.
 */
export function collectAssetRefs(value: unknown, acc: Set<string> = new Set()): Set<string> {
	if (!value || typeof value !== 'object') return acc;
	if (Array.isArray(value)) {
		for (const v of value) collectAssetRefs(v, acc);
		return acc;
	}
	const obj = value as Record<string, unknown>;
	const ref = (obj.asset as { _ref?: unknown } | undefined)?._ref;
	if (typeof ref === 'string') acc.add(ref);
	for (const key in obj) collectAssetRefs(obj[key], acc);
	return acc;
}

/**
 * Inject resolved `{ url, alt }` onto every `{ asset: { _ref } }` in a value, in place.
 * After this, `image.asset.url` / `image.asset.alt` are populated so the frontend reads
 * them directly. Mutates the value — pass a clone (e.g. `$state.snapshot`) if the input
 * must be preserved. Refs absent from `resolved` are left untouched.
 */
export function injectAssetData(
	value: unknown,
	resolved: ReadonlyMap<string, ResolvedAsset>
): void {
	if (!value || typeof value !== 'object') return;
	if (Array.isArray(value)) {
		for (const v of value) injectAssetData(v, resolved);
		return;
	}
	const obj = value as Record<string, unknown>;
	const asset = obj.asset as
		| {
				_ref?: unknown;
				url?: string;
				alt?: string;
				width?: number;
				height?: number;
				srcset?: string;
		  }
		| undefined;
	if (asset && typeof asset === 'object' && typeof asset._ref === 'string') {
		const hit = resolved.get(asset._ref);
		if (hit) {
			asset.url = hit.url;
			if (hit.alt != null) asset.alt = hit.alt;
			if (hit.width != null) asset.width = hit.width;
			if (hit.height != null) asset.height = hit.height;
			if (hit.srcset) asset.srcset = hit.srcset;
		}
	}
	for (const key in obj) injectAssetData(obj[key], resolved);
}
