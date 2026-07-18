import { getCache } from '@vercel/functions';
import type { CacheAdapter } from '@aphexcms/cms-core/server';

/** Tag every entry carries — lets `flush()` clear everything via one `expireTag` call. */
const FLUSH_ALL_TAG = '__aphex_cache_all__';

/**
 * Vercel Runtime Cache adapter (https://vercel.com/docs/caching/runtime-cache) — a
 * per-region key-value store shared across function instances in that region, unlike
 * a plain in-process `Map` (each serverless instance has its own memory, wiped on
 * every cold start). Available from any Vercel runtime (serverless, edge, middleware,
 * build) with zero extra infrastructure — no Redis/Upstash to provision.
 *
 * Runtime Cache has no native "list/delete by prefix" or "flush all" — only get/set/
 * delete by exact key, plus tag-based invalidation (`expireTag`). cms-core's actual
 * `invalidateByPrefix` calls are a small, fixed set of exact prefixes (`hierarchy:`,
 * `roles:${orgId}:`, `query:${orgId}:${collection}:`), so `set()` tags every entry
 * with each ':'-delimited ancestor of its key — `invalidateByPrefix(prefix)` then just
 * expires the tag matching that exact prefix string.
 */
export class VercelRuntimeCacheAdapter implements CacheAdapter {
	readonly name = 'vercel-runtime-cache';

	private tagsForKey(key: string): string[] {
		const segments = key.split(':');
		const tags: string[] = [FLUSH_ALL_TAG];
		for (let i = 1; i <= segments.length; i++) {
			tags.push(`${segments.slice(0, i).join(':')}:`);
		}
		return tags;
	}

	async get<T>(key: string): Promise<T | null> {
		const value = await getCache().get(key);
		return (value ?? null) as T | null;
	}

	async set<T>(key: string, value: T, ttl?: number): Promise<void> {
		await getCache().set(key, value, { tags: this.tagsForKey(key), ttl });
	}

	async delete(key: string): Promise<void> {
		await getCache().delete(key);
	}

	async invalidateByPrefix(prefix: string): Promise<void> {
		await getCache().expireTag(prefix);
	}

	async flush(): Promise<void> {
		await getCache().expireTag(FLUSH_ALL_TAG);
	}

	async isHealthy(): Promise<boolean> {
		try {
			// `name: ''` suppresses sending an o11y name for this synthetic check.
			await getCache().set('__aphex_health_check__', 1, { ttl: 5, name: '' });
			return true;
		} catch {
			return false;
		}
	}
}

/**
 * Helper to configure the Vercel Runtime Cache adapter.
 *
 * @example
 * ```typescript
 * import { vercelRuntimeCache } from '@aphexcms/cache-vercel-runtime';
 *
 * export const cacheAdapter = env.VERCEL
 *   ? vercelRuntimeCache()
 *   : new InMemoryCacheAdapter({ maxSize: 5000 });
 * ```
 */
export function vercelRuntimeCache(): CacheAdapter {
	return new VercelRuntimeCacheAdapter();
}
