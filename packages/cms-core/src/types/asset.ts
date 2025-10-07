// types/asset.ts

/**
 * Asset type - represents uploaded files
 */
export interface Asset {
	id: string;
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
	metadata: any;
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
	// Additional custom fields can be added here
	[key: string]: any;
}
