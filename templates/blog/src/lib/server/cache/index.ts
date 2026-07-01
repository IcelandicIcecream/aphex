import { InMemoryCacheAdapter } from '@aphexcms/cms-core/server';

/**
 * Shared cache adapter singleton.
 * Used by both CMS config (document caching) and auth (API key caching).
 * Set to null to disable caching.
 */
export const cacheAdapter: InMemoryCacheAdapter | null = new InMemoryCacheAdapter({
	maxSize: 5000
});
