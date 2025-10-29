/**
 * Content hashing utilities for document version tracking
 * Includes timestamp for proper change detection and UX
 */

/**
 * Recursively sort object keys for stable JSON serialization
 */
function sortObject(item: any): any {
	if (item === null || typeof item !== 'object') return item;

	if (Array.isArray(item)) {
		return item.map(sortObject);
	}

	const sortedKeys = Object.keys(item).sort();
	const sortedObj: any = {};
	for (const key of sortedKeys) {
		sortedObj[key] = sortObject(item[key]);
	}
	return sortedObj;
}

/**
 * Create a stable hash from any object using a simple hash algorithm
 */
function simpleHash(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash).toString(36); // Base36 for shorter string
}

/**
 * Create a content hash including timestamp for change tracking
 * This matches Sanity's behavior where any interaction creates a publishable state
 */
export function createContentHash(data: any, includeTimestamp = true): string {
	const hashData = includeTimestamp
		? {
				...data,
				_lastModified: new Date().toISOString()
			}
		: data;

	const stableJson = JSON.stringify(sortObject(hashData));
	return simpleHash(stableJson);
}

/**
 * Create a hash from published data (no timestamp needed as it's already stable)
 */
export function createPublishedHash(data: any): string {
	return createContentHash(data, false);
}

/**
 * Compare if current draft differs from published version
 */
export function hasUnpublishedChanges(draftData: any, publishedHash: string | null): boolean {
	if (!publishedHash) return true; // No published version = has changes

	const publishedDataHash = createPublishedHash(draftData);
	return publishedDataHash !== publishedHash;
}

/**
 * Utility to create a clean published hash when publishing
 */
export function createHashForPublishing(draftData: any): string {
	return createPublishedHash(draftData);
}
