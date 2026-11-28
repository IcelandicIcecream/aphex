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
	style?: 'info' | 'warning' | 'error' | 'success';
	content: string;
}

export interface CodeBlock {
	_type: 'code';
	_key: string;
	language?: 'typescript' | 'javascript' | 'svelte' | 'html' | 'css' | 'bash' | 'json';
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
		variant?: 'none' | 'highImpact' | 'mediumImpact' | 'lowImpact';
		richText?: PortableTextBlock[];
		align?: 'left' | 'center';
		links?: {
			_type: 'linkItem';
			_key?: string;
			linkType?: 'reference' | 'custom';
			label?: string;
			reference?: Reference<Page | Post>;
			url?: string;
			newTab?: boolean;
			appearance?: 'default' | 'outline' | 'link';
		}[];
		media?: ImageValue;
	};
	/**
	 * The page body, block by block.
	 */
	layout?: Array<
		| {
				_type: 'cta';
				_key?: string;
				richText?: PortableTextBlock[];
				links?: {
					_type: 'linkItem';
					_key?: string;
					linkType?: 'reference' | 'custom';
					label?: string;
					reference?: Reference<Page | Post>;
					url?: string;
					newTab?: boolean;
					appearance?: 'default' | 'outline' | 'link';
				}[];
		  }
		| {
				_type: 'content';
				_key?: string;
				columns?: {
					_type: 'column';
					_key?: string;
					size?: 'oneThird' | 'half' | 'twoThirds' | 'full';
					richText?: PortableTextBlock[];
					enableLink?: boolean;
					linkType?: 'reference' | 'custom';
					label?: string;
					reference?: Reference<Page | Post>;
					url?: string;
					newTab?: boolean;
					appearance?: 'default' | 'outline' | 'link';
				}[];
		  }
		| {
				_type: 'mediaBlock';
				_key?: string;
				media: ImageValue;
				caption?: string;
		  }
		| {
				_type: 'archive';
				_key?: string;
				introContent?: PortableTextBlock[];
				populateBy?: 'collection' | 'selection';
				categories?: Reference<Category>[];
				limit?: number;
				selectedDocs?: Reference<Post>[];
		  }
		| {
				_type: 'formBlock';
				_key?: string;
				form: Reference<Form>;
				introContent?: PortableTextBlock[];
		  }
	>;
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
		/** Draft reads of a published document: the draft differs from what's live. */
		hasUnpublishedChanges?: boolean;
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
		/** Draft reads of a published document: the draft differs from what's live. */
		hasUnpublishedChanges?: boolean;
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
		/** Draft reads of a published document: the draft differs from what's live. */
		hasUnpublishedChanges?: boolean;
	};
}

export interface Header {
	/** Document ID */
	id: string;
	/**
	 * Six is already too many. Internal links follow their document’s slug.
	 */
	navItems?: {
		_type: 'linkItem';
		_key?: string;
		linkType?: 'reference' | 'custom';
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
		/** Draft reads of a published document: the draft differs from what's live. */
		hasUnpublishedChanges?: boolean;
	};
}

export interface Footer {
	/** Document ID */
	id: string;
	navItems?: {
		_type: 'linkItem';
		_key?: string;
		linkType?: 'reference' | 'custom';
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
		/** Draft reads of a published document: the draft differs from what's live. */
		hasUnpublishedChanges?: boolean;
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
		/** Draft reads of a published document: the draft differs from what's live. */
		hasUnpublishedChanges?: boolean;
	};
}

export interface Form {
	/** Document ID */
	id: string;
	/**
	 * The form’s name, and its heading on the page unless the Form block gives another.
	 */
	title: string;
	fields: Array<
		| {
				_type: 'formText';
				_key?: string;
				label: string;
				required?: boolean;
				width?: 'full' | 'half';
				placeholder?: string;
				defaultValue?: string;
				name?: string;
		  }
		| {
				_type: 'formEmail';
				_key?: string;
				label: string;
				required?: boolean;
				width?: 'full' | 'half';
				placeholder?: string;
				name?: string;
		  }
		| {
				_type: 'formPhone';
				_key?: string;
				label: string;
				required?: boolean;
				width?: 'full' | 'half';
				placeholder?: string;
				name?: string;
		  }
		| {
				_type: 'formTextarea';
				_key?: string;
				label: string;
				required?: boolean;
				width?: 'full' | 'half';
				placeholder?: string;
				rows?: number;
				name?: string;
		  }
		| {
				_type: 'formDate';
				_key?: string;
				label: string;
				required?: boolean;
				width?: 'full' | 'half';
				notPast?: boolean;
				name?: string;
		  }
		| {
				_type: 'formRadio';
				_key?: string;
				label: string;
				required?: boolean;
				width?: 'full' | 'half';
				options: {
					_type: 'option';
					_key?: string;
					label: string;
					value?: string;
				}[];
				name?: string;
		  }
		| {
				_type: 'formSelect';
				_key?: string;
				label: string;
				required?: boolean;
				width?: 'full' | 'half';
				options: {
					_type: 'option';
					_key?: string;
					label: string;
					value?: string;
				}[];
				name?: string;
		  }
		| {
				_type: 'formCheckbox';
				_key?: string;
				label: string;
				required?: boolean;
				width?: 'full' | 'half';
				defaultValue?: boolean;
				name?: string;
		  }
		| {
				_type: 'formNumber';
				_key?: string;
				label: string;
				required?: boolean;
				width?: 'full' | 'half';
				min?: number;
				max?: number;
				name?: string;
		  }
		| {
				_type: 'formMessage';
				_key?: string;
				message?: PortableTextBlock[];
		  }
	>;
	submitButtonLabel?: string;
	confirmationType?: 'message' | 'redirect';
	confirmationMessage?: PortableTextBlock[];
	/**
	 * A page of your site (/thanks) or a full web address (https://…).
	 */
	redirectUrl?: string;
	/**
	 * Who hears about each message. {{allFields}} puts in every answer; {{phone}} puts in one, by its answer key. With none here, messages go to your site’s own email address, where the site has one.
	 */
	emails?: {
		_type: 'notification';
		_key?: string;
		to: string;
		replyTo?: string;
		subject: string;
		message: string;
	}[];
	/**
	 * A short note to the address they gave, so they know it arrived. Replies to it come to your site’s email address.
	 */
	confirmationEmail?: {
		enabled?: boolean;
		subject?: string;
		message?: string;
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
		/** Draft reads of a published document: the draft differs from what's live. */
		hasUnpublishedChanges?: boolean;
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
		_type: 'answer';
		_key?: string;
		field?: string;
		value?: string;
	}[];
	notificationEmails?: {
		_type: 'submissionNotification';
		_key?: string;
		to?: string;
		replyTo?: string;
		subject?: string;
		message?: string;
	}[];
	/**
	 * The site’s name, in front of the address its emails come from.
	 */
	senderName?: string;
	confirmationEmail?: {
		to?: string;
		replyTo?: string;
		subject?: string;
		message?: string;
	};
	notificationFieldLabels?: {
		_type: 'submissionFieldLabel';
		_key?: string;
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
		/** Draft reads of a published document: the draft differs from what's live. */
		hasUnpublishedChanges?: boolean;
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
		variant?: 'none' | 'highImpact' | 'mediumImpact' | 'lowImpact';
		richText?: PortableTextBlock[];
		align?: 'left' | 'center';
		links?: {
			_type: 'linkItem';
			_key?: string;
			linkType?: 'reference' | 'custom';
			label?: string;
			reference?: Page | Post;
			url?: string;
			newTab?: boolean;
			appearance?: 'default' | 'outline' | 'link';
		}[];
		media?: ImageValue;
	};
	/**
	 * The page body, block by block.
	 */
	layout?: Array<
		| {
				_type: 'cta';
				_key?: string;
				richText?: PortableTextBlock[];
				links?: {
					_type: 'linkItem';
					_key?: string;
					linkType?: 'reference' | 'custom';
					label?: string;
					reference?: Page | Post;
					url?: string;
					newTab?: boolean;
					appearance?: 'default' | 'outline' | 'link';
				}[];
		  }
		| {
				_type: 'content';
				_key?: string;
				columns?: {
					_type: 'column';
					_key?: string;
					size?: 'oneThird' | 'half' | 'twoThirds' | 'full';
					richText?: PortableTextBlock[];
					enableLink?: boolean;
					linkType?: 'reference' | 'custom';
					label?: string;
					reference?: Page | Post;
					url?: string;
					newTab?: boolean;
					appearance?: 'default' | 'outline' | 'link';
				}[];
		  }
		| {
				_type: 'mediaBlock';
				_key?: string;
				media: ImageValue;
				caption?: string;
		  }
		| {
				_type: 'archive';
				_key?: string;
				introContent?: PortableTextBlock[];
				populateBy?: 'collection' | 'selection';
				categories?: Category[];
				limit?: number;
				selectedDocs?: Post[];
		  }
		| {
				_type: 'formBlock';
				_key?: string;
				form: Form;
				introContent?: PortableTextBlock[];
		  }
	>;
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
		/** Draft reads of a published document: the draft differs from what's live. */
		hasUnpublishedChanges?: boolean;
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
		/** Draft reads of a published document: the draft differs from what's live. */
		hasUnpublishedChanges?: boolean;
	};
}

export interface HeaderResolved {
	/** Document ID */
	id: string;
	/**
	 * Six is already too many. Internal links follow their document’s slug.
	 */
	navItems?: {
		_type: 'linkItem';
		_key?: string;
		linkType?: 'reference' | 'custom';
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
		/** Draft reads of a published document: the draft differs from what's live. */
		hasUnpublishedChanges?: boolean;
	};
}

export interface FooterResolved {
	/** Document ID */
	id: string;
	navItems?: {
		_type: 'linkItem';
		_key?: string;
		linkType?: 'reference' | 'custom';
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
		/** Draft reads of a published document: the draft differs from what's live. */
		hasUnpublishedChanges?: boolean;
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
		_type: 'answer';
		_key?: string;
		field?: string;
		value?: string;
	}[];
	notificationEmails?: {
		_type: 'submissionNotification';
		_key?: string;
		to?: string;
		replyTo?: string;
		subject?: string;
		message?: string;
	}[];
	/**
	 * The site’s name, in front of the address its emails come from.
	 */
	senderName?: string;
	confirmationEmail?: {
		to?: string;
		replyTo?: string;
		subject?: string;
		message?: string;
	};
	notificationFieldLabels?: {
		_type: 'submissionFieldLabel';
		_key?: string;
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
		/** Draft reads of a published document: the draft differs from what's live. */
		hasUnpublishedChanges?: boolean;
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
