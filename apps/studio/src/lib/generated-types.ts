/**
 * Generated types for Aphex CMS
 * This file is auto-generated - DO NOT EDIT manually
 */
import type { CollectionAPI } from '@aphexcms/cms-core/server';

// ============================================================================
// Object Types (nested in documents)
// ============================================================================

export interface TextBlock {
  /**
   * Optional heading for this text section
   */
  heading?: string;
  /**
   * The main text content
   */
  content: string;
}

export interface ImageBlock {
  /**
   * The main image
   */
  image: string;
  /**
   * Optional caption displayed below the image
   */
  caption?: string;
  /**
   * Alternative text for accessibility and SEO
   */
  alt: string;
}

export interface CallToAction {
  /**
   * Main heading for the call-to-action
   */
  title?: string;
  /**
   * Supporting text for the call-to-action
   */
  description?: string;
  /**
   * Text displayed on the button
   */
  buttonText: string;
  /**
   * Where the button should link to
   */
  buttonUrl: string;
}

export interface CatalogBlock {
  /**
   * Optional title for this catalog section
   */
  title?: string;
  /**
   * Choose which catalog to display
   */
  catalogReference: string;
  displayOptions?: {
  showPrices?: boolean;
  layout?: string;
};
}

export interface CatalogItem {
  /**
   * The name of the catalog item
   */
  title: string;
  /**
   * Brief description of the item
   */
  shortDescription: string;
  /**
   * Price of the item
   */
  price: number;
}

export interface Hero {
  /**
   * Main headline text
   */
  heading: string;
  /**
   * Supporting text below the main heading
   */
  subheading?: string;
  /**
   * Hero background image
   */
  backgroundImage?: string;
  /**
   * Call-to-action button text
   */
  ctaText?: string;
  /**
   * Where the CTA button should link to
   */
  ctaUrl?: string;
}

export interface Seo {
  /**
   * Title shown in search results and browser tabs
   */
  metaTitle?: string;
  /**
   * Description shown in search results
   */
  metaDescription?: string;
  /**
   * Image for social media sharing (Open Graph)
   */
  metaImage?: string;
}

// ============================================================================
// Document Types (collections)
// ============================================================================

export interface Page {
  /** Document ID */
  id: string;
  /**
   * The main title of the page
   */
  title: string;
  /**
   * The URL path for this page
   */
  slug: string;
  hero?: {
  heading: string;
  subheading?: string;
  backgroundImage?: string;
  ctaText?: string;
  ctaUrl?: string;
};
  /**
   * Flexible content sections
   */
  content?: Array<TextBlock | ImageBlock | CallToAction | CatalogBlock>;
  seo?: {
  metaTitle?: string;
  metaDescription?: string;
  metaImage?: string;
};
  /**
   * Whether this page is publicly visible
   */
  published?: boolean;
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

export interface SimpleDocument {
  /** Document ID */
  id: string;
  /**
   * The main title of the document
   */
  title: string;
  /**
   * The main description of the document
   */
  description: string;
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

export interface Catalog {
  /** Document ID */
  id: string;
  /**
   * The main title of the catalog
   */
  title: string;
  /**
   * Description of what this catalog contains
   */
  description: string;
  /**
   * List of items in this catalog
   */
  items?: CatalogItem[];
  /**
   * Whether this catalog is publicly visible
   */
  published?: boolean;
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

export interface ReferenceToPage {
  /** Document ID */
  id: string;
  /**
   * The main title of the page
   */
  title: string;
  /**
   * Choose Page
   */
  pageReference: string;
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

export interface Movie {
  /** Document ID */
  id: string;
  /**
   * The title of the movie
   */
  title: string;
  /**
   * When the movie was released
   */
  releaseDate: string;
  /**
   * Director of the movie
   */
  director?: string;
  /**
   * Plot summary
   */
  synopsis?: string;
  poster?: string;
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

export interface Agent {
  /** Document ID */
  id: string;
  /**
   * Display name
   */
  name: string;
  /**
   * URL-friendly identifier
   */
  slug: string;
  /**
   * Brief description of the agent and its purpose
   */
  description?: string;
  /**
   * Is this agent active and available?
   */
  enabled?: boolean;
  /**
   * Random greetings the agent can say when first starting (one will be randomly selected)
   */
  openingResponses: string[];
  /**
   * Define the agent's personality, behavior, and rules (each item is a sentence/paragraph)
   */
  traitContext: string[];
  /**
   * Tags for organization and categorization
   */
  tags?: string[];
  /**
   * Private notes about this agent (visible only in CMS)
   */
  notes?: string;
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

export interface InstagramPost {
  /** Document ID */
  id: string;
  /**
   * Unique identifier from Instagram
   */
  postId: string;
  /**
   * Type of media content
   */
  mediaType: string;
  /**
   * Quality settings based on media type
   */
  quality?: string;
  /**
   * Images or videos in this post
   */
  media: {
  url: string;
  altText?: string;
  width?: number;
  height?: number;
  thumbnail?: string;
}[];
  /**
   * Post caption text
   */
  caption?: string;
  /**
   * Tags used in the post
   */
  hashtags?: string[];
  /**
   * Users mentioned in the post
   */
  mentions?: {
  username: string;
  userId?: string;
}[];
  /**
   * Tagged location
   */
  location?: {
  name?: string;
  locationId?: string;
  latitude?: number;
  longitude?: number;
};
  /**
   * Direct link to the Instagram post
   */
  permalink: string;
  /**
   * When the post was published on Instagram
   * @format ISO datetime string in UTC (YYYY-MM-DDTHH:mm:ssZ) - displays as MM/DD/YYYY HH:mm
   */
  publishedDate?: string;
  /**
   * Likes, comments, and shares
   */
  engagement?: {
  likes?: number;
  comments?: number;
  saves?: number;
  shares?: number;
  reach?: number;
  impressions?: number;
  plays?: number;
};
  /**
   * Whether this post has been archived
   */
  isArchived?: boolean;
  /**
   * Whether this post is pinned to profile
   */
  isPinned?: boolean;
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
    simple_document: CollectionAPI<SimpleDocument>;
    catalog: CollectionAPI<Catalog>;
    referenceToPage: CollectionAPI<ReferenceToPage>;
    movie: CollectionAPI<Movie>;
    agent: CollectionAPI<Agent>;
    instagram_post: CollectionAPI<InstagramPost>;
  }
}
