import type { CacheAdapter } from './interfaces/cache';

/**
 * Document-aware cache wrapper.
 * Translates document/collection operations into generic key-value calls on the underlying CacheAdapter.
 */
export class DocumentCache {
	constructor(private adapter: CacheAdapter) {}

	async getDocument<T>(orgId: string, docId: string): Promise<T | null> {
		return this.adapter.get<T>(`doc:${orgId}:${docId}`);
	}

	async setDocument<T>(orgId: string, docId: string, value: T): Promise<void> {
		await this.adapter.set(`doc:${orgId}:${docId}`, value);
	}

	async getQuery<T>(orgId: string, collection: string, options: object): Promise<T | null> {
		return this.adapter.get<T>(this.buildQueryKey(orgId, collection, options));
	}

	async setQuery<T>(orgId: string, collection: string, options: object, value: T): Promise<void> {
		await this.adapter.set(this.buildQueryKey(orgId, collection, options), value);
	}

	async invalidateDocument(orgId: string, docId: string): Promise<void> {
		await this.adapter.delete(`doc:${orgId}:${docId}`);
	}

	async invalidateCollection(orgId: string, collection: string): Promise<void> {
		await this.adapter.invalidateByPrefix(`query:${orgId}:${collection}:`);
	}

	async flush(): Promise<void> {
		await this.adapter.flush();
	}

	private buildQueryKey(orgId: string, collection: string, options: object): string {
		const normalized = JSON.stringify(options, (_, value) => {
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				return Object.keys(value)
					.sort()
					.reduce((sorted: Record<string, unknown>, key) => {
						sorted[key] = (value as Record<string, unknown>)[key];
						return sorted;
					}, {});
			}
			return value;
		});
		return `query:${orgId}:${collection}:${normalized}`;
	}
}
