/**
 * Content hashing utilities for document version tracking
 * Includes timestamp for proper change detection and UX
 */
/**
 * Create a content hash including timestamp for change tracking
 * This matches Sanity's behavior where any interaction creates a publishable state
 */
export declare function createContentHash(data: any, includeTimestamp?: boolean): string;
/**
 * Create a hash from published data (no timestamp needed as it's already stable)
 */
export declare function createPublishedHash(data: any): string;
/**
 * Compare if current draft differs from published version
 */
export declare function hasUnpublishedChanges(draftData: any, publishedHash: string | null): boolean;
/**
 * Utility to create a clean published hash when publishing
 */
export declare function createHashForPublishing(draftData: any): string;
//# sourceMappingURL=content-hash.d.ts.map