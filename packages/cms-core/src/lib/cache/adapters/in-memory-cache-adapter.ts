import type { CacheAdapter } from '../interfaces/cache';

interface CacheEntry<T = unknown> {
	value: T;
	expiresAt: number | null;
}

export interface InMemoryCacheOptions {
	/** Maximum number of entries. Oldest entries are evicted when exceeded. Defaults to 1000. */
	maxSize?: number;
	/** Default TTL in seconds. No expiry if omitted. */
	defaultTTL?: number;
}

export class InMemoryCacheAdapter implements CacheAdapter {
	readonly name = 'in-memory';

	private store = new Map<string, CacheEntry>();
	private maxSize: number;
	private defaultTTL: number | undefined;

	constructor(options: InMemoryCacheOptions = {}) {
		this.maxSize = options.maxSize ?? 1000;
		this.defaultTTL = options.defaultTTL;
	}

	async get<T>(key: string): Promise<T | null> {
		const entry = this.store.get(key);
		if (!entry) return null;

		if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
			this.store.delete(key);
			return null;
		}

		return entry.value as T;
	}

	async set<T>(key: string, value: T, ttl?: number): Promise<void> {
		// Evict oldest entry if at capacity
		if (!this.store.has(key) && this.store.size >= this.maxSize) {
			const firstKey = this.store.keys().next().value;
			if (firstKey !== undefined) {
				this.store.delete(firstKey);
			}
		}

		const seconds = ttl ?? this.defaultTTL;
		this.store.set(key, {
			value,
			expiresAt: seconds != null ? Date.now() + seconds * 1000 : null
		});
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
	}

	async invalidateByPrefix(prefix: string): Promise<void> {
		for (const key of this.store.keys()) {
			if (key.startsWith(prefix)) {
				this.store.delete(key);
			}
		}
	}

	async flush(): Promise<void> {
		this.store.clear();
	}

	async isHealthy(): Promise<boolean> {
		return true;
	}
}
