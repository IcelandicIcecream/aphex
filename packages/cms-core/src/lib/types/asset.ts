// types/asset.ts

/** One generated derivative of an image. */
export interface AssetVariant {
	/** Rendered width in pixels — always one of the configured ladder widths. */
	w: number;
	/** Rendered height, derived from the original's aspect ratio. */
	h: number;
	/** Adapter-relative storage key. */
	key: string;
	/**
	 * Adapter-specific path, as `StorageAdapter.store()` reported it.
	 *
	 * Recorded rather than derived from the original's path, because how an
	 * adapter roots storage is its own business — local joins a base directory,
	 * S3 prefixes a bucket. Rebuilding it by string surgery on `asset.path`
	 * happens to work for both today and breaks on the first adapter that does
	 * something else.
	 */
	path: string;
	/**
	 * Public URL on the `/media` route.
	 *
	 * Contains no part of the user's filename — it is `{assetId}/w{width}-{hash}`
	 * — so renaming an asset leaves every variant URL and key untouched.
	 */
	url: string;
	bytes: number;
}

/**
 * The derivative record for one asset.
 *
 * Lives on `asset.metadata`, which is already `jsonb` (Postgres) / JSON text
 * (SQLite), so recording variants needs no schema change on either adapter.
 */
export interface AssetVariantRecord {
	/**
	 * Hash of the image config the variants were generated under. Variants whose
	 * hash no longer matches the current config are ignored rather than deleted —
	 * they're simply never addressed again, since every URL embeds the hash.
	 */
	config: string;
	generatedAt: string;
	widths: AssetVariant[];
}

/**
 * Known shape of `asset.metadata`.
 *
 * Deliberately open (`[key: string]: any`): metadata also carries whatever the
 * upload path extracted from the image and whatever a caller attached, and
 * narrowing those would break callers for no gain. The point is that the keys
 * the CMS itself depends on are typed, so `variants` isn't reached through a
 * cast at every call site.
 */
export interface AssetMetadata {
	variants?: AssetVariantRecord;
	/** Schema type the asset was uploaded into — used for privacy resolution. */
	schemaType?: string;
	/** Field path within that schema type. */
	fieldPath?: string;
	[key: string]: any;
}

/**
 * Asset type - represents uploaded files
 */
export interface Asset {
	id: string;
	organizationId: string;
	assetType: string;
	filename: string;
	originalFilename: string;
	mimeType: string;
	size: number;
	url: string;
	path: string;
	storageAdapter: string;
	width: number | null;
	height: number | null;
	/**
	 * Nullable because the column is: rows predating a given feature, or created
	 * without extracted image metadata, genuinely have no value here. Typing it
	 * non-null would be a lie the adapters have to cast their way out of.
	 */
	metadata: AssetMetadata | null;
	title: string | null;
	description: string | null;
	alt: string | null;
	creditLine: string | null;
	createdBy: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
}

/**
 * New asset input type
 */
export interface NewAsset {
	id?: string;
	assetType: string;
	filename: string;
	originalFilename: string;
	mimeType: string;
	size: number;
	url: string;
	path: string;
	storageAdapter: string;
	width?: number | null;
	height?: number | null;
	metadata?: any;
	title?: string | null;
	description?: string | null;
	alt?: string | null;
	creditLine?: string | null;
	createdBy?: string | null;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}

// Sanity-style image data structure
export interface ImageAsset {
	_type: 'reference';
	_ref: string; // Asset ID
	/**
	 * Resolved public URL. NOT part of stored data — it's injected at render time
	 * (by `AssetService.injectAssetUrls` server-side, and by the editor's live preview
	 * client-side) so the frontend can read `image.asset.url` directly. Absent until then.
	 */
	url?: string;
	/** The asset's default alt text, injected alongside `url`. Per-placement overrides live
	 *  on `ImageValue.alt`; render precedence is `value.alt || asset.alt`. */
	alt?: string;
}

export interface ImageCrop {
	top: number;
	bottom: number;
	left: number;
	right: number;
}

export interface ImageHotspot {
	x: number;
	y: number;
	height: number;
	width: number;
}

export interface ImageValue {
	_type: 'image';
	asset: ImageAsset;
	crop?: ImageCrop;
	hotspot?: ImageHotspot;
	/**
	 * Per-placement alt text — the single source of truth for this image's
	 * description. Edited on the image field (not the asset), and the string that
	 * carries visual-editing stega so the rendered <img alt> becomes click-to-edit.
	 */
	alt?: string;
	// Additional custom fields can be added here
	[key: string]: any;
}

export interface FileAsset {
	_type: 'reference';
	_ref: string; // Asset ID
}

export interface FileValue {
	_type: 'file';
	asset: FileAsset;
	[key: string]: any;
}
