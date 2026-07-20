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

export interface CalloutBlock {
	_type: 'callout';
	_key: string;
	tone?: string;
	text?: string;
}

export interface CodeBlockBlock {
	_type: 'codeBlock';
	_key: string;
	language?: string;
	code?: string;
}

export interface EmbedBlock {
	_type: 'embed';
	_key: string;
	embedCode: string;
	caption?: string;
}

export interface ToggleBlock {
	_type: 'toggle';
	_key: string;
	heading: string;
	content?: string;
}

export interface DividerBlock {
	_type: 'divider';
	_key: string;
	style?: string;
}

export interface ButtonBlock {
	_type: 'button';
	_key: string;
	label: string;
	url: string;
	style?: string;
	align?: string;
}

export interface GalleryBlock {
	_type: 'gallery';
	_key: string;
	images: ImageValue[];
	caption?: string;
}

export interface LinkAnnotation {
	_type: 'link';
	_key: string;
	href?: string;
	blank?: boolean;
}

export interface ContactFormBlock {
	_type: 'contactForm';
	_key: string;
	formId?: string;
	heading?: string;
	blurb?: string;
}

export interface PortableTextImageBlock {
	_type: 'image';
	_key: string;
	asset?: { _ref: string; _type: string };
	alt?: string;
}

export interface BlogPostContentTypes {
	callout: CalloutBlock;
	codeBlock: CodeBlockBlock;
	embed: EmbedBlock;
	toggle: ToggleBlock;
	divider: DividerBlock;
	button: ButtonBlock;
	gallery: GalleryBlock;
	image: PortableTextImageBlock;
	link: LinkAnnotation;
}

export interface PageContentTypes {
	callout: CalloutBlock;
	codeBlock: CodeBlockBlock;
	embed: EmbedBlock;
	toggle: ToggleBlock;
	divider: DividerBlock;
	button: ButtonBlock;
	gallery: GalleryBlock;
	contactForm: ContactFormBlock;
	image: PortableTextImageBlock;
	link: LinkAnnotation;
}

// ============================================================================
// Object Types (nested in documents)
// ============================================================================

// ============================================================================
// Document Types (collections)
// ============================================================================

export interface BlogPost {
	/** Document ID */
	id: string;
	title: string;
	slug: string;
	author?: Reference<Author>;
	/**
	 * @format ISO date string (YYYY-MM-DD) - displays as YYYY-MM-DD
	 */
	postDate?: string;
	/**
	 * A short summary shown on the blog listing page
	 */
	excerpt?: string;
	coverImage?: ImageValue;
	content: Array<
		| PortableTextBlock
		| CalloutBlock
		| CodeBlockBlock
		| EmbedBlock
		| ToggleBlock
		| DividerBlock
		| ButtonBlock
		| GalleryBlock
		| PortableTextImageBlock
	>;
	/**
	 * Topics this post belongs to
	 */
	tags?: Reference<Tag>[];
	/**
	 * Optional. Control how this appears in Google and on social media. Leave blank to use sensible defaults from the fields above.
	 */
	seo?: {
		metaTitle?: string;
		metaDescription?: string;
		ogImage?: ImageValue;
		noIndex?: boolean;
	};
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

export interface Page {
	/** Document ID */
	id: string;
	title: string;
	/**
	 * Lives at the site root, e.g. /about
	 */
	slug: string;
	/**
	 * Optional summary shown under the title and in social previews
	 */
	excerpt?: string;
	coverImage?: ImageValue;
	content: Array<
		| PortableTextBlock
		| CalloutBlock
		| CodeBlockBlock
		| EmbedBlock
		| ToggleBlock
		| DividerBlock
		| ButtonBlock
		| GalleryBlock
		| ContactFormBlock
		| PortableTextImageBlock
	>;
	/**
	 * Inner spacing around the page content container.
	 */
	containerPadding?: number;
	/**
	 * Alignment of the title and excerpt.
	 */
	headerAlign?: string;
	/**
	 * Optional. Control how this appears in Google and on social media. Leave blank to use sensible defaults from the fields above.
	 */
	seo?: {
		metaTitle?: string;
		metaDescription?: string;
		ogImage?: ImageValue;
		noIndex?: boolean;
	};
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

export interface Author {
	/** Document ID */
	id: string;
	name: string;
	slug: string;
	/**
	 * e.g. Founder & Writer
	 */
	role?: string;
	/**
	 * Square profile photo
	 */
	avatar?: ImageValue;
	/**
	 * A short introduction shown on the author page
	 */
	bio?: string;
	/**
	 * Social profiles and personal sites
	 */
	links?: {
		_key?: string;
		_type?: string;
		label?: string;
		url?: string;
	}[];
	/**
	 * Optional. The CMS account this author writes as. Used to sync the byline and gate editing. Most editors can leave this blank.
	 */
	userId?: string;
	/**
	 * Optional. Control how this appears in Google and on social media. Leave blank to use sensible defaults from the fields above.
	 */
	seo?: {
		metaTitle?: string;
		metaDescription?: string;
		ogImage?: ImageValue;
		noIndex?: boolean;
	};
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

export interface Tag {
	/** Document ID */
	id: string;
	title: string;
	slug: string;
	/**
	 * Shown on the tag archive page
	 */
	description?: string;
	/**
	 * Optional. Control how this appears in Google and on social media. Leave blank to use sensible defaults from the fields above.
	 */
	seo?: {
		metaTitle?: string;
		metaDescription?: string;
		ogImage?: ImageValue;
		noIndex?: boolean;
	};
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
	 * The wordmark text, also used in tab titles. Shown when no logo is set.
	 */
	title?: string;
	/**
	 * Short line shown in the footer
	 */
	tagline?: string;
	/**
	 * Shown in the header instead of the title text. Use a transparent PNG or SVG.
	 */
	logo?: ImageValue;
	/**
	 * Height of the header logo. The width scales to keep the aspect ratio.
	 */
	logoHeight?: number;
	/**
	 * The little icon shown in the browser tab. A square image works best.
	 */
	favicon?: ImageValue;
	/**
	 * Small label above the headline (e.g. "The Journal").
	 */
	heroEyebrow?: string;
	/**
	 * The large headline on the home page. Line breaks are preserved.
	 */
	heroTitle?: string;
	/**
	 * Supporting line shown below the headline.
	 */
	heroSubtitle?: string;
	/**
	 * Optional image for the home hero. Placement follows the layout below.
	 */
	heroImage?: ImageValue;
	/**
	 * How the headline and image are arranged on the home page.
	 */
	heroLayout?: string;
	/**
	 * Links shown in the top navigation, in order
	 */
	nav?: {
		_key?: string;
		_type?: string;
		label?: string;
		url?: string;
		newTab?: boolean;
	}[];
	/**
	 * Shown in the footer
	 */
	social?: {
		_key?: string;
		_type?: string;
		label?: string;
		url?: string;
	}[];
	/**
	 * Changes the public-site structure without changing your content.
	 */
	template: string;
	/**
	 * Used for links, buttons, highlights, and focus states. Leave empty to use the template default.
	 */
	color?: {
		hex?: string;
		alpha?: number;
		rgb?: {
			r?: number;
			g?: number;
			b?: number;
			a?: number;
		};
		hsl?: {
			h?: number;
			s?: number;
			l?: number;
			a?: number;
		};
		hsv?: {
			h?: number;
			s?: number;
			v?: number;
			a?: number;
		};
	};
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
// Resolved Types (depth=1) — refs swapped for their target docs
// ============================================================================
//
// Use these when reading with `depth: 1`. The local API and HTTP routes default
// to depth=0 (raw IDs); pass `{ depth: 1 }` to get the resolved shape:
//
//   const menu = (await cms.collections.menu.get(id, { depth: 1 })) as MenuResolved;
//
// At depth=1 only the outer document's refs resolve — refs inside the resolved
// targets stay raw, which is why `MenuResolved.items` is `MenuItem[]` (not
// `MenuItemResolved[]`).

export interface BlogPostResolved {
	/** Document ID */
	id: string;
	title: string;
	slug: string;
	author?: Author;
	/**
	 * @format ISO date string (YYYY-MM-DD) - displays as YYYY-MM-DD
	 */
	postDate?: string;
	/**
	 * A short summary shown on the blog listing page
	 */
	excerpt?: string;
	coverImage?: ImageValue;
	content: Array<
		| PortableTextBlock
		| CalloutBlock
		| CodeBlockBlock
		| EmbedBlock
		| ToggleBlock
		| DividerBlock
		| ButtonBlock
		| GalleryBlock
		| PortableTextImageBlock
	>;
	/**
	 * Topics this post belongs to
	 */
	tags?: Tag[];
	/**
	 * Optional. Control how this appears in Google and on social media. Leave blank to use sensible defaults from the fields above.
	 */
	seo?: {
		metaTitle?: string;
		metaDescription?: string;
		ogImage?: ImageValue;
		noIndex?: boolean;
	};
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
		blog_post: CollectionAPI<BlogPost>;
		page: CollectionAPI<Page>;
		author: CollectionAPI<Author>;
		tag: CollectionAPI<Tag>;
		siteSettings: SingletonCollection<SiteSettings>;
	}
}
