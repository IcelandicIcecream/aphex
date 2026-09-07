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

export interface BannerBlock {
	_type: 'banner';
	_key: string;
	style?: string;
	content: string;
}

export interface CodeBlock {
	_type: 'code';
	_key: string;
	language?: string;
	code: string;
}

export interface MediaBlockBlock {
	_type: 'mediaBlock';
	_key: string;
	media: ImageValue;
	caption?: string;
}

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

export interface PostContentTypes {
	banner: BannerBlock;
	code: CodeBlock;
	mediaBlock: MediaBlockBlock;
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
	 * The URL path this page is served at. Use “home” for the front page.
	 */
	slug: string;
	hero?: {
		variant?: string;
		richText?: PortableTextBlock[];
		align?: string;
		links?: {
			_key?: string;
			_type?: string;
			linkType?: string;
			label?: string;
			reference?: Reference<Page | Post>;
			url?: string;
			newTab?: boolean;
			appearance?: string;
		}[];
		media?: ImageValue;
	};
	/**
	 * The page body, block by block.
	 */
	layout?: unknown[];
	/**
	 * Optional. Control how this appears in Google and on social media. Leave blank to use sensible defaults from the fields above.
	 */
	seo?: {
		metaTitle?: string;
		metaDescription?: string;
		ogImage?: ImageValue;
		noIndex?: boolean;
		seoPreview?: string;
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

export interface Post {
	/** Document ID */
	id: string;
	title: string;
	slug: string;
	/**
	 * One or two lines. Shown on cards and used as the SEO fallback.
	 */
	excerpt?: string;
	heroImage?: ImageValue;
	content: Array<
		PortableTextBlock | BannerBlock | CodeBlock | MediaBlockBlock | PortableTextImageBlock
	>;
	categories?: Reference<Category>[];
	relatedPosts?: Reference<Post>[];
	/**
	 * Optional. Control how this appears in Google and on social media. Leave blank to use sensible defaults from the fields above.
	 */
	seo?: {
		metaTitle?: string;
		metaDescription?: string;
		ogImage?: ImageValue;
		noIndex?: boolean;
		seoPreview?: string;
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

export interface Category {
	/** Document ID */
	id: string;
	title: string;
	slug: string;
	/**
	 * Optional. Control how this appears in Google and on social media. Leave blank to use sensible defaults from the fields above.
	 */
	seo?: {
		metaTitle?: string;
		metaDescription?: string;
		ogImage?: ImageValue;
		noIndex?: boolean;
		seoPreview?: string;
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

export interface Header {
	/** Document ID */
	id: string;
	/**
	 * Six is already too many. Internal links follow their document’s slug.
	 */
	navItems?: {
		_key?: string;
		_type?: string;
		linkType?: string;
		label?: string;
		reference?: Reference<Page | Post>;
		url?: string;
		newTab?: boolean;
	}[];
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

export interface Footer {
	/** Document ID */
	id: string;
	navItems?: {
		_key?: string;
		_type?: string;
		linkType?: string;
		label?: string;
		reference?: Reference<Page | Post>;
		url?: string;
		newTab?: boolean;
	}[];
	/**
	 * A single line under the links — copyright, an address, a disclaimer.
	 */
	note?: string;
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
	 * Replaces the site name in the header. Use a single-colour SVG (or transparent PNG) with dark marks: the header sits over the hero image on some pages and flips the logo to white there, which only works on a monochrome logo with a transparent background.
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

export interface Form {
	/** Document ID */
	id: string;
	/**
	 * Internal name, and the default heading where the form is embedded.
	 */
	title: string;
	fields: unknown[];
	submitButtonLabel?: string;
	confirmationType?: string;
	confirmationMessage?: PortableTextBlock[];
	/**
	 * A site path (/thanks) or an absolute URL.
	 */
	redirectUrl?: string;
	/**
	 * Sent after a submission is stored. Reference an answer with {{fieldName}}; {{allFields}} expands to the whole submission.
	 */
	emails?: {
		_key?: string;
		_type?: string;
		to: string;
		replyTo?: string;
		subject: string;
		message: string;
	}[];
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

export interface FormSubmission {
	/** Document ID */
	id: string;
	form?: Reference<Form>;
	summary?: string;
	/**
	 * @format ISO datetime string in UTC (YYYY-MM-DDTHH:mm:ssZ) - displays as YYYY-MM-DD HH:mm
	 */
	submittedAt?: string;
	submissionData?: {
		_key?: string;
		_type?: string;
		field?: string;
		value?: string;
	}[];
	notificationEmails?: {
		_key?: string;
		_type?: string;
		to?: string;
		replyTo?: string;
		subject?: string;
		message?: string;
	}[];
	notificationFieldLabels?: {
		_key?: string;
		_type?: string;
		field?: string;
		label?: string;
	}[];
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

export interface PageResolved {
	/** Document ID */
	id: string;
	title: string;
	/**
	 * The URL path this page is served at. Use “home” for the front page.
	 */
	slug: string;
	hero?: {
		variant?: string;
		richText?: PortableTextBlock[];
		align?: string;
		links?: {
			_key?: string;
			_type?: string;
			linkType?: string;
			label?: string;
			reference?: Page | Post;
			url?: string;
			newTab?: boolean;
			appearance?: string;
		}[];
		media?: ImageValue;
	};
	/**
	 * The page body, block by block.
	 */
	layout?: unknown[];
	/**
	 * Optional. Control how this appears in Google and on social media. Leave blank to use sensible defaults from the fields above.
	 */
	seo?: {
		metaTitle?: string;
		metaDescription?: string;
		ogImage?: ImageValue;
		noIndex?: boolean;
		seoPreview?: string;
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

export interface PostResolved {
	/** Document ID */
	id: string;
	title: string;
	slug: string;
	/**
	 * One or two lines. Shown on cards and used as the SEO fallback.
	 */
	excerpt?: string;
	heroImage?: ImageValue;
	content: Array<
		PortableTextBlock | BannerBlock | CodeBlock | MediaBlockBlock | PortableTextImageBlock
	>;
	categories?: Category[];
	relatedPosts?: Post[];
	/**
	 * Optional. Control how this appears in Google and on social media. Leave blank to use sensible defaults from the fields above.
	 */
	seo?: {
		metaTitle?: string;
		metaDescription?: string;
		ogImage?: ImageValue;
		noIndex?: boolean;
		seoPreview?: string;
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

export interface HeaderResolved {
	/** Document ID */
	id: string;
	/**
	 * Six is already too many. Internal links follow their document’s slug.
	 */
	navItems?: {
		_key?: string;
		_type?: string;
		linkType?: string;
		label?: string;
		reference?: Page | Post;
		url?: string;
		newTab?: boolean;
	}[];
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

export interface FooterResolved {
	/** Document ID */
	id: string;
	navItems?: {
		_key?: string;
		_type?: string;
		linkType?: string;
		label?: string;
		reference?: Page | Post;
		url?: string;
		newTab?: boolean;
	}[];
	/**
	 * A single line under the links — copyright, an address, a disclaimer.
	 */
	note?: string;
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

export interface FormSubmissionResolved {
	/** Document ID */
	id: string;
	form?: Form;
	summary?: string;
	/**
	 * @format ISO datetime string in UTC (YYYY-MM-DDTHH:mm:ssZ) - displays as YYYY-MM-DD HH:mm
	 */
	submittedAt?: string;
	submissionData?: {
		_key?: string;
		_type?: string;
		field?: string;
		value?: string;
	}[];
	notificationEmails?: {
		_key?: string;
		_type?: string;
		to?: string;
		replyTo?: string;
		subject?: string;
		message?: string;
	}[];
	notificationFieldLabels?: {
		_key?: string;
		_type?: string;
		field?: string;
		label?: string;
	}[];
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
		post: CollectionAPI<Post>;
		category: CollectionAPI<Category>;
		header: SingletonCollection<Header>;
		footer: SingletonCollection<Footer>;
		siteSettings: SingletonCollection<SiteSettings>;
		form: CollectionAPI<Form>;
		formSubmission: CollectionAPI<FormSubmission>;
	}
}
