import { env } from '$env/dynamic/private';
import { InMemoryCacheAdapter, type CacheAdapter } from '@aphexcms/cms-core/server';
import { vercelRuntimeCache } from '@aphexcms/cache-vercel-runtime';

/**
 * Shared cache adapter singleton.
 * Used by both CMS config (document caching) and auth (API key caching).
 * Set to null to disable caching.
 *
 * A plain in-process `Map` is nearly useless as a cache on Vercel: each serverless
 * instance has its own private memory, wiped on every cold start, so most requests
 * land on an instance that never cached anything. Vercel Runtime Cache is shared
 * across instances within a region instead — same zero-infra story (no Redis/Upstash
 * to provision), but it actually caches something there.
 */
export const cacheAdapter: CacheAdapter | null = env.VERCEL
	? vercelRuntimeCache()
	: new InMemoryCacheAdapter({ maxSize: 5000 });
