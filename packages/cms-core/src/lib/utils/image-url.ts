import type { ImageValue, ImageAsset, Asset } from '../types/asset';
import { cmsLogger } from './logger';

export interface ImageUrlBuilderOptions {
	width?: number;
	height?: number;
	quality?: number;
	format?: 'jpg' | 'jpeg' | 'png' | 'webp' | 'avif';
	fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
	auto?: 'format';
}

export interface ImageUrlBuilderConfig {
	baseUrl?: string;
	/**
	 * Function to sign asset URLs for secure, time-limited access
	 * Used for multi-tenant access without exposing API keys
	 */
	signAssetUrl?: (assetId: string) => string;
}

/**
 * Helper to extract URL from various image source types
 * Works with GraphQL responses that include resolved asset data
 */
function extractUrl(source: any): string | null {
	if (!source) return null;

	// Direct URL string
	if (typeof source === 'string') {
		return source;
	}

	// Asset object with url property
	if (typeof source === 'object' && 'url' in source && source.url) {
		return source.url;
	}

	// ImageValue with resolved asset (from GraphQL)
	if (typeof source === 'object' && 'asset' in source && source.asset) {
		// Check if asset is resolved (has url property)
		if (typeof source.asset === 'object' && 'url' in source.asset) {
			return source.asset.url;
		}
	}

	return null;
}

/**
 * The `srcset` injection attached to this source, if any.
 *
 * Mirrors {@link extractUrl}'s shape-sniffing because the same call accepts a
 * bare url string, an `Asset`, an `ImageAsset`, or an `ImageValue`.
 */
function extractSrcset(source: any): string | null {
	if (!source || typeof source !== 'object') return null;
	if (typeof source.srcset === 'string') return source.srcset;
	if (source.asset && typeof source.asset.srcset === 'string') return source.asset.srcset;
	return null;
}

/** Intrinsic dimensions, used to turn a height request into a width. */
function extractDimensions(source: any): { width?: number; height?: number } {
	const target = source && typeof source === 'object' ? (source.asset ?? source) : null;
	if (!target || typeof target !== 'object') return {};
	return {
		width: typeof target.width === 'number' ? target.width : undefined,
		height: typeof target.height === 'number' ? target.height : undefined
	};
}

interface SrcsetCandidate {
	url: string;
	width: number;
}

/**
 * Parse a `srcset` into its width candidates, smallest first.
 *
 * This is what makes snapping trustworthy: the srcset was built server-side by
 * `buildSrcset`, so its URLs already carry the current config hash and already
 * exclude rungs wider than the original. Re-deriving them here from a copy of
 * the ladder would be a second source of truth that silently rots the day
 * someone edits `images.widths` — and it would rot invisibly, because a stale
 * hash serves the original rather than failing.
 */
function parseSrcsetCandidates(srcset: string): SrcsetCandidate[] {
	return srcset
		.split(',')
		.map((part) => part.trim().split(/\s+/))
		.flatMap(([url, descriptor]) =>
			url && descriptor?.endsWith('w') ? [{ url, width: Number(descriptor.slice(0, -1)) }] : []
		)
		.filter((candidate) => Number.isFinite(candidate.width) && candidate.width > 0)
		.sort((a, b) => a.width - b.width);
}

/**
 * The narrowest rung that still covers `target`, or the widest available.
 *
 * Rounds *up* on purpose. Snapping down would hand back an image that has to be
 * upscaled by the browser, which is a visible quality regression; snapping up
 * costs bytes, which is the cheaper mistake and the one the caller can see.
 */
function snapToLadder(candidates: SrcsetCandidate[], target: number): SrcsetCandidate | null {
	if (candidates.length === 0) return null;
	return candidates.find((c) => c.width >= target) ?? candidates[candidates.length - 1]!;
}

export class ImageUrlBuilder {
	private _source: any = null;
	private _options: ImageUrlBuilderOptions = {};

	/**
	 * Set the image source
	 */
	image(source: ImageValue | ImageAsset | string | Asset | null | undefined): this {
		this._source = source;
		return this;
	}

	/**
	 * Request a rendered width in pixels.
	 *
	 * Snaps to the narrowest generated variant that covers it — the ladder is a
	 * closed allowlist, so `width(333)` returns the 640px rung rather than a
	 * 333px image. Asking for a width no variant covers returns the widest one.
	 */
	width(width: number): this {
		this._options.width = width;
		return this;
	}

	/**
	 * Request a rendered height in pixels.
	 *
	 * Honoured only as a *width* request: derivatives are resized by width and
	 * keep the original's aspect ratio, so this converts through the asset's
	 * intrinsic dimensions and then snaps like {@link width}. Without those
	 * dimensions there's nothing to convert through and it's ignored.
	 */
	height(height: number): this {
		this._options.height = height;
		return this;
	}

	/**
	 * Set both dimensions. Width wins — see {@link height}; nothing crops.
	 */
	size(width: number, height: number): this {
		this._options.width = width;
		this._options.height = height;
		return this;
	}

	/**
	 * @deprecated No effect. Quality is a property of the pipeline, not the URL:
	 * it's set once via `images.quality` and hashed into every variant filename,
	 * which is what lets variants be cached immutably. A per-URL override would
	 * mean generating and storing a second copy of every image per quality value
	 * any caller ever passed.
	 */
	quality(quality: number): this {
		this._options.quality = Math.max(1, Math.min(100, quality));
		return this;
	}

	/**
	 * @deprecated No effect. Every derivative is WebP; the original is served in
	 * whatever format it was uploaded as. Transcoding on request would reopen the
	 * unbounded-generation hole the width allowlist exists to close.
	 */
	format(format: 'jpg' | 'jpeg' | 'png' | 'webp' | 'avif'): this {
		this._options.format = format;
		return this;
	}

	/**
	 * @deprecated No effect. Derivatives are width-resized and preserve aspect
	 * ratio, so there is no second dimension for a fit mode to act on. Per-preset
	 * `fit`/`aspectRatio` is post-V1, and lands on top of focal points.
	 */
	fit(fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'): this {
		this._options.fit = fit;
		return this;
	}

	/**
	 * @deprecated No effect, and already the behaviour: variants are always WebP.
	 */
	auto(mode: 'format'): this {
		this._options.auto = mode;
		return this;
	}

	/**
	 * The requested width, converting a height request through the asset's own
	 * aspect ratio.
	 *
	 * Width wins when both are set: a derivative is only ever resized by width,
	 * so honouring a height as well would require cropping — which the V1
	 * pipeline deliberately doesn't do.
	 */
	private targetWidth(): number | null {
		const { width, height } = this._options;
		if (typeof width === 'number' && width > 0) return width;
		if (typeof height !== 'number' || height <= 0) return null;

		const intrinsic = extractDimensions(this._source);
		if (!intrinsic.width || !intrinsic.height) return null;
		return Math.round(height * (intrinsic.width / intrinsic.height));
	}

	/** The ladder variant covering the requested size, if one can be resolved. */
	private snappedUrl(): string | null {
		const target = this.targetWidth();
		if (target === null) return null;

		// No srcset means no variants to snap to: the pipeline is disabled, the
		// asset is an SVG or animated, or the value was never passed through
		// `injectAssetUrls`. Falling back to the original is correct in all four —
		// a smaller image simply doesn't exist to hand back.
		const srcset = extractSrcset(this._source);
		if (!srcset) return null;

		return snapToLadder(parseSrcsetCandidates(srcset), target)?.url ?? null;
	}

	/**
	 * Build the final URL.
	 *
	 * With a width (or a height that can be converted to one) and an injected
	 * `srcset`, this returns the variant URL for the nearest covering rung.
	 * Otherwise it returns the asset's own URL — the full-size original.
	 *
	 * **Prefer `<Image>` for anything rendered.** This returns one fixed URL, so
	 * it can't respond to viewport or device pixel ratio; `<Image>` emits the
	 * whole `srcset` and lets the browser choose. Reach for this when you need a
	 * bare string and the size is genuinely fixed — an OG image, an email, a
	 * canvas or PDF source.
	 */
	url(): string | null {
		cmsLogger.debug('[ImageUrlBuilder] url() called with source:', JSON.stringify(this._source));

		if (!this._source) {
			cmsLogger.debug('[ImageUrlBuilder] No source provided');
			return null;
		}

		const snapped = this.snappedUrl();
		if (snapped) {
			cmsLogger.debug('[ImageUrlBuilder] Snapped to ladder variant:', snapped);
			return snapped;
		}

		// First try to extract a direct URL (if asset was already resolved)
		const directUrl = extractUrl(this._source);
		if (directUrl) {
			cmsLogger.debug('[ImageUrlBuilder] Using direct URL from resolved asset:', directUrl);
			return directUrl;
		}

		// Otherwise, build an API URL from the asset reference
		let assetId: string | null = null;

		if (typeof this._source === 'string') {
			cmsLogger.debug('[ImageUrlBuilder] Source is string:', this._source);
			assetId = this._source;
		} else if (typeof this._source === 'object') {
			cmsLogger.debug('[ImageUrlBuilder] Source is object, checking for asset._ref or _ref');
			if ('asset' in this._source && this._source.asset?._ref) {
				assetId = this._source.asset._ref;
				cmsLogger.debug('[ImageUrlBuilder] Found asset._ref:', assetId);
			} else if ('_ref' in this._source) {
				assetId = this._source._ref;
				cmsLogger.debug('[ImageUrlBuilder] Found _ref:', assetId);
			}
		}

		if (!assetId) {
			cmsLogger.warn('[ImageUrlBuilder] Could not extract asset ID from source:', this._source);
			return null;
		}

		const finalUrl = `/media/${assetId}/image`;
		cmsLogger.debug('[ImageUrlBuilder] Building CDN URL:', finalUrl);
		return finalUrl;
	}

	/**
	 * Alias for url()
	 */
	toString(): string | null {
		return this.url();
	}
}

/**
 * Factory for a Sanity-style image URL builder.
 *
 * ```ts
 * const urlFor = imageUrlBuilder();
 * urlFor(post.coverImage).width(800).url();  // → the 960px rung
 * urlFor(post.coverImage).url();             // → the original
 * ```
 *
 * `width` snaps to the nearest generated variant that covers it, read off the
 * `srcset` that `injectAssetUrls` attached — so the source must have been
 * through injection (any value from the Local API, a load function, or GraphQL
 * has been). Without a width, or without a srcset, you get the original.
 *
 * Takes no arguments. It previously documented a `baseUrl` and a `signAssetUrl`
 * hook, neither of which the function ever accepted — assets carry their own
 * urls, and `/media/:id/:filename` handles access control centrally rather than
 * through per-caller signing. Signed delivery is `config.signedDownloads`.
 *
 * `quality`, `format`, `fit` and `auto` remain on the builder for source
 * compatibility but are deprecated no-ops; see each one for why.
 */
export function imageUrlBuilder() {
	return (source?: ImageValue | ImageAsset | string | Asset | null) => {
		const builder = new ImageUrlBuilder();
		if (source) {
			builder.image(source);
		}
		return builder;
	};
}
