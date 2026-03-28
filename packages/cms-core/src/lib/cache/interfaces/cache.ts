export interface CacheAdapter {
	readonly name: string;

	/** Get a cached value by key. Returns null on miss. */
	get<T>(key: string): Promise<T | null>;

	/** Set a value with an optional TTL in seconds. */
	set<T>(key: string, value: T, ttl?: number): Promise<void>;

	/** Delete a single key. */
	delete(key: string): Promise<void>;

	/** Delete all keys matching a prefix (e.g. "query:org123:page:"). */
	invalidateByPrefix(prefix: string): Promise<void>;

	/** Flush the entire cache. */
	flush(): Promise<void>;

	/** Optional lifecycle methods. */
	connect?(): Promise<void>;
	disconnect?(): Promise<void>;
	isHealthy?(): Promise<boolean>;
}
