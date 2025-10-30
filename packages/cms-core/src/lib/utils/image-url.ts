import type { ImageValue, ImageAsset, Asset } from '../types/asset';

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
	 * Set width (for future dynamic image rendering)
	 */
	width(width: number): this {
		this._options.width = width;
		return this;
	}

	/**
	 * Set height (for future dynamic image rendering)
	 */
	height(height: number): this {
		this._options.height = height;
		return this;
	}

	/**
	 * Set both width and height (for future dynamic image rendering)
	 */
	size(width: number, height: number): this {
		this._options.width = width;
		this._options.height = height;
		return this;
	}

	/**
	 * Set quality (for future dynamic image rendering)
	 */
	quality(quality: number): this {
		this._options.quality = Math.max(1, Math.min(100, quality));
		return this;
	}

	/**
	 * Set format (for future dynamic image rendering)
	 */
	format(format: 'jpg' | 'jpeg' | 'png' | 'webp' | 'avif'): this {
		this._options.format = format;
		return this;
	}

	/**
	 * Set fit mode (for future dynamic image rendering)
	 */
	fit(fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'): this {
		this._options.fit = fit;
		return this;
	}

	/**
	 * Enable automatic format selection (for future dynamic image rendering)
	 */
	auto(mode: 'format'): this {
		this._options.auto = mode;
		return this;
	}

	/**
	 * Build the final URL
	 * Returns /api/assets/{id}?dl=1 which redirects to the actual S3/R2 URL
	 * Transformations (.width(), .quality(), etc) are stored but not yet applied
	 *
	 * For multi-tenant access, use signAssetUrl config to generate signed URLs
	 * TODO: Add dynamic image rendering support
	 */
	url(): string | null {
		console.log('[ImageUrlBuilder] url() called with source:', JSON.stringify(this._source));

		if (!this._source) {
			console.log('[ImageUrlBuilder] No source provided');
			return null;
		}

		// First try to extract a direct URL (if asset was already resolved)
		const directUrl = extractUrl(this._source);
		if (directUrl) {
			console.log('[ImageUrlBuilder] Using direct URL from resolved asset:', directUrl);
			return directUrl;
		}

		// Otherwise, build an API URL from the asset reference
		let assetId: string | null = null;

		if (typeof this._source === 'string') {
			console.log('[ImageUrlBuilder] Source is string:', this._source);
			assetId = this._source;
		} else if (typeof this._source === 'object') {
			console.log('[ImageUrlBuilder] Source is object, checking for asset._ref or _ref');
			if ('asset' in this._source && this._source.asset?._ref) {
				assetId = this._source.asset._ref;
				console.log('[ImageUrlBuilder] Found asset._ref:', assetId);
			} else if ('_ref' in this._source) {
				assetId = this._source._ref;
				console.log('[ImageUrlBuilder] Found _ref:', assetId);
			}
		}

		if (!assetId) {
			console.warn('[ImageUrlBuilder] Could not extract asset ID from source:', this._source);
			return null;
		}

		const finalUrl = `/media/${assetId}/image`;
		console.log('[ImageUrlBuilder] Building CDN URL:', finalUrl);
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
 * Factory function to create an image URL builder
 *
 * Note: Currently returns direct S3/R2 URLs without transformations.
 * The baseUrl parameter is accepted for future compatibility but not currently used
 * since assets already contain their full public URLs.
 *
 * For multi-tenant access with API keys, provide a signAssetUrl function:
 *   const urlFor = imageUrlBuilder({
 *     signAssetUrl: (assetId) => `/api/assets/${assetId}?token=${generateToken(assetId)}`
 *   })
 *
 * Usage:
 *   const urlFor = imageUrlBuilder({ baseUrl: 'https://yourdomain.com' })
 *   const url = urlFor(image).url() // Returns asset.url directly
 *
 * Future usage with transformations:
 *   const url = urlFor(image).width(800).quality(80).url()
 *   // Will return transformed image once dynamic rendering is implemented
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
