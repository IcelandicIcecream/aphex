// types/asset.ts

// Type-only, and pointing at a leaf module with no imports of its own — so this
// costs nothing at runtime and can't pull the admin surface toward `/image`,
// which is the direction that would actually matter.
import type { InjectedAsset } from '../image/types';

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
	/**
	 * Whether this asset requires authorization to read — a signed URL or a
	 * session in its organization.
	 *
	 * **Computed, not stored.** Privacy is declared on the schema field the asset
	 * was uploaded into, so the answer depends on the live schema and only the
	 * server can produce it. The list endpoint resolves it once and reports it
	 * here; adapters never set it, which is why it is optional rather than
	 * nullable — absent means "nobody has worked it out", not "public".
	 */
	isPrivate?: boolean;
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

/**
 * Sanity-style image reference, plus whatever asset injection has filled in.
 *
 * The injected half is inherited from `InjectedAsset` rather than restated here.
 * They are the same fields at runtime — `injectAssetUrls` writes `url`, `alt`,
 * `width`, `height` and `srcset` — and when this interface listed only `url` and
 * `alt`, a document's own generated type denied the existence of the three the
 * responsive pipeline exists to produce. Reading `image.asset.srcset` off a typed
 * document was a type error even though the value was right there.
 *
 * NOT part of stored data: injection happens at render time (`injectAssetUrls`
 * server-side, the editor's live preview client-side), so all of it is absent
 * until then.
 */
export interface ImageAsset extends InjectedAsset {
	_type: 'reference';
	_ref: string; // Asset ID
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

/**
 * A file reference, with the fields injection adds at render time.
 *
 * Extends `InjectedAsset` for the same reason `ImageAsset` does: `collectAssetRefs`
 * walks `{ asset: { _ref } }` generically, so a file field's `url` is populated
 * exactly like an image's — but the type said otherwise, making
 * `video.asset.url` a type error on a value that was right there. Only `url` is
 * meaningful for a non-image; the dimension fields stay undefined.
 */
export interface FileAsset extends InjectedAsset {
	_type: 'reference';
	_ref: string; // Asset ID
}

export interface FileValue {
	_type: 'file';
	asset: FileAsset;
	[key: string]: any;
}
