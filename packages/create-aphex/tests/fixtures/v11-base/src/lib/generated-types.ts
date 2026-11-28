/**
 * Generated types for Aphex CMS
 * This file is auto-generated - DO NOT EDIT manually
 */
import type { CollectionAPI, SingletonCollection, ImageValue } from '@aphexcms/cms-core/server';

/**
 * A reference to another document, stored as `{ _type: 'reference', _ref }`
 * inside arrays. At depth=0 (default) this is the raw shape; at depth=1 the
 * field is replaced with the target document — see the `*Resolved` variants.
 */
export interface Reference<T = unknown> {
	_type: 'reference';
	_ref: string;
	_key?: string;
	/** Phantom — present only in the type, used for inferring the target. */
	__targetType?: T;
}

export interface PortableTextBlock {
	_type: 'block';
	_key: string;
	style?: string;
	children: Array<{
		_type: 'span';
		_key: string;
		text: string;
		marks?: string[];
	}>;
	markDefs?: Array<{
		_type: string;
		_key: string;
		[key: string]: unknown;
	}>;
	listItem?: string;
	level?: number;
}

// ============================================================================
// Block Content Types (custom blocks, inline objects, annotations)
// ============================================================================

export interface LinkAnnotation {
	_type: 'link';
	_key: string;
	href?: string;
	blank?: boolean;
}

export interface PortableTextImageBlock {
	_type: 'image';
	_key: string;
	asset?: ImageValue['asset'];
	alt?: string;
}

export interface PageContentTypes {
	image: PortableTextImageBlock;
	link: LinkAnnotation;
}

// ============================================================================
// Object Types (nested in documents)
// ============================================================================

// ============================================================================
// Document Types (collections)
// ============================================================================

export interface Page {
	/** Document ID */
	id: string;
	title: string;
	/**
	 * The URL path this page is served at.
	 */
	slug: string;
	/**
	 * One or two lines. Shown in listings and used as the SEO fallback.
	 */
	excerpt?: string;
	content?: Array<PortableTextBlock | PortableTextImageBlock>;
	/**
	 * Opens the asset browser. Alt text can be set per placement.
	 */
	coverImage?: ImageValue;
	/**
	 * Falls back to the page title when empty.
	 */
	seoTitle?: string;
	/**
	 * Falls back to the excerpt when empty.
	 */
	seoDescription?: string;
	/** Document metadata */
	_meta?: {
		type: string;
		status: 'draft' | 'published';
		organizationId: string;
		createdAt: Date | null;
		updatedAt: Date | null;
		createdBy?: string;
		updatedBy?: string;
		publishedAt?: Date | null;
		publishedHash?: string | null;
	};
}

export interface SiteSettings {
	/** Document ID */
	id: string;
	/**
	 * Shown in the browser tab, and as a fallback when no logo is set.
	 */
	title?: string;
	/**
	 * The default meta description, used on pages that don't set their own.
	 */
	description?: string;
	/**
	 * Replaces the site name in the header. A transparent PNG or SVG works best.
	 */
	logo?: ImageValue;
	/**
	 * The browser tab icon, for the public site and the admin. A square PNG or SVG, 32px or larger.
	 */
	favicon?: ImageValue;
	/**
	 * Height of the header logo in pixels. Width follows the aspect ratio.
	 */
	logoHeight?: number;
	/** Document metadata */
	_meta?: {
		type: string;
		status: 'draft' | 'published';
		organizationId: string;
		createdAt: Date | null;
		updatedAt: Date | null;
		createdBy?: string;
		updatedBy?: string;
		publishedAt?: Date | null;
		publishedHash?: string | null;
	};
}

// ============================================================================
// Module Augmentation - Extends Collections interface globally
// ============================================================================

declare module '@aphexcms/cms-core/server' {
	interface Collections {
		page: CollectionAPI<Page>;
		siteSettings: SingletonCollection<SiteSettings>;
	}
}
